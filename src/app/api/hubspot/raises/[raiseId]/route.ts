import { NextRequest, NextResponse } from 'next/server';

type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

function hsHeaders() {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');

  // Remove surrounding quotes and trim whitespace/newlines
  const token = raw.replace(/^['"]|['"]$/g, '').trim();

  // Use Headers to normalize casing
  return new Headers({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });
}

function isStale(hsLastActivityDate: string | null, days = 5) {
  if (!hsLastActivityDate) return true; // no activity => stale
  const last = new Date(hsLastActivityDate).getTime();
  const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

function toPortalBucket(stageLabel: string | null, hsLastActivityDate: string | null): Bucket {
  const label = (stageLabel ?? '').toLowerCase();

  // Committed bucket
  if (label === 'committed' || label === 'funded') return 'committed';

  // Passed bucket
  if (label === 'passed' || label.includes('deferred') || label.includes('recycle')) return 'passed';

  // Needs Touch bucket (computed)
  if (label === 'introduced') return 'needs_touch';
  if (isStale(hsLastActivityDate)) return 'needs_touch';

  // Everything else in-flight
  return 'circling';
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
) {
  try {
    const { raiseId } = await context.params;

    // 1) Search deals by raise_id
    const searchPayload = {
      filterGroups: [
        {
          filters: [{ propertyName: 'raise_id', operator: 'EQ', value: raiseId }],
        },
      ],
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'raise_id',
        'hs_lastactivitydate',
        'hs_lastmodifieddate',
      ],
      limit: 100,
    };

    const dealsRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify(searchPayload),
      cache: 'no-store',
    });

    if (!dealsRes.ok) {
      const details = await dealsRes.text();
      return NextResponse.json({ ok: false, error: 'Deal search failed', details }, { status: 500 });
    }

    const dealsJson = await dealsRes.json();
    const deals: Array<{ id: string; properties: Record<string, string> }> = dealsJson.results ?? [];

    if (!deals.length) {
      return NextResponse.json({ ok: true, raiseId, investors: [] });
    }

    // 1b) Build stageId -> label map per pipeline (so numeric dealstage IDs become labels)
    // Uses: GET /crm/v3/pipelines/deals/{pipelineId}/stages [1](https://www.withone.ai/knowledge/hubspot/conn_mod_def%3A%3AGJ3lAzFMxgc%3A%3AfkRg3SXjTFW6o77HM3Mbaw)[2](https://community.hubspot.com/t5/APIs-Integrations/Value-for-deal-stage-pulled-thru-API/m-p/822413)
    const pipelineIds = Array.from(
      new Set(deals.map((d) => d.properties?.pipeline).filter(Boolean))
    ) as string[];

    const stageLabelByPipeline = new Map<string, Map<string, string>>();

    for (const pipelineId of pipelineIds) {
      const stagesRes = await fetch(
        `https://api.hubapi.com/crm/v3/pipelines/deals/${pipelineId}/stages`,
        {
          method: 'GET',
          headers: hsHeaders(),
          cache: 'no-store',
        }
      );

      if (!stagesRes.ok) continue;

      const stagesJson = await stagesRes.json();
      const map = new Map<string, string>();
      for (const s of stagesJson.results ?? []) {
        map.set(String(s.id), String(s.label));
      }
      stageLabelByPipeline.set(String(pipelineId), map);
    }

    // 2) Batch read Deal -> Contact associations
    const dealIds = deals.map((d) => ({ id: d.id }));

    const assocRes = await fetch('https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read', {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify({ inputs: dealIds }),
      cache: 'no-store',
    });

    if (!assocRes.ok) {
      const details = await assocRes.text();
      return NextResponse.json(
        { ok: false, error: 'Associations batch read failed', details },
        { status: 500 }
      );
    }

    const assocJson = await assocRes.json();

    // Map dealId -> contactId (INVESTOR contact only)
    const dealToContactId = new Map<string, string>();
    const contactIdSet = new Set<string>();

    for (const row of assocJson.results ?? []) {
      const dealIdRaw = row.from?.id;
      if (!dealIdRaw) continue;

      const dealId = String(dealIdRaw);

      // Find Deal -> Contact association (HubSpot-defined typeId 3)
      const contactAssoc = (row.to ?? []).find((t: any) =>
        (t.associationTypes ?? []).some(
          (a: any) => a.category === 'HUBSPOT_DEFINED' && a.typeId === 3
        )
      );

      const contactIdRaw = contactAssoc?.toObjectId ?? contactAssoc?.id;
      if (!contactIdRaw) continue;

      const contactId = String(contactIdRaw);

      dealToContactId.set(dealId, contactId);
      contactIdSet.add(contactId);
    }

    const contactIds = Array.from(contactIdSet);

    // 3) Batch read Contacts for name/email
    const contactsRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify({
        inputs: contactIds.map((id) => ({ id: String(id) })),
        properties: ['firstname', 'lastname', 'email'],
      }),
      cache: 'no-store',
    });

    if (!contactsRes.ok) {
      const details = await contactsRes.text();
      return NextResponse.json(
        { ok: false, error: 'Contacts batch read failed', details },
        { status: 500 }
      );
    }

    const contactsJson = await contactsRes.json();
    const contactsById = new Map<string, any>((contactsJson.results ?? []).map((c: any) => [String(c.id), c]));

    // 4) Normalize rows for portal + include dealstageLabel + bucket
    const investors = deals.map((deal) => {
      const pipeline = deal.properties?.pipeline ?? null;
      const dealstage = deal.properties?.dealstage ?? null;

      const stageMap = pipeline ? stageLabelByPipeline.get(String(pipeline)) : undefined;
      const dealstageLabel = dealstage ? (stageMap?.get(String(dealstage)) ?? null) : null;

      const contactId = dealToContactId.get(String(deal.id)) ?? null;
      const contact = contactId ? contactsById.get(String(contactId)) : null;

      const first = contact?.properties?.firstname ?? '';
      const last = contact?.properties?.lastname ?? '';
      const email = contact?.properties?.email ?? null;
      const investorName = `${first} ${last}`.trim() || email || 'Unknown Investor';

      const hsLastActivity = deal.properties?.hs_lastactivitydate ?? null;
      const bucket = toPortalBucket(dealstageLabel, hsLastActivity);

      return {
        dealId: deal.id,
        contactId,
        investorName,
        investorEmail: email,
        amount: deal.properties?.amount ? Number(deal.properties.amount) : 0,
        dealstage,
        dealstageLabel,
        bucket,
        pipeline,
        raise_id: deal.properties?.raise_id ?? null,
        hs_lastactivitydate: hsLastActivity,
        hs_lastmodifieddate: deal.properties?.hs_lastmodifieddate ?? null,
      };
    });

    return NextResponse.json({ ok: true, raiseId, investors });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'Unhandled error', details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}