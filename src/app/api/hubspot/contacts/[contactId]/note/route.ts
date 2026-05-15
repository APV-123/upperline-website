import { NextResponse } from 'next/server';

const HUBSPOT_BASE = 'https://api.hubapi.com';

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Cache association type IDs so we only look them up once per server instance
let NOTE_TO_CONTACT_TYPE_ID: number | null = null;
let NOTE_TO_DEAL_TYPE_ID: number | null = null;

type AssocLabel = { category: string; typeId: number; label: string | null };
async function getHubSpotDefinedUnlabeledTypeId(from: string, to: string): Promise<number> {
  // Labels endpoint returns association type IDs between two object types. [3](https://developers.hubspot.com/docs/api-reference/legacy/crm/associations/associations-schema/labels/get-associations-label)[4](https://community.hubspot.com/t5/APIs-Integrations/Where-to-find-all-CRM-association-types-in-HubSpot/td-p/755274)
  const res = await fetch(`${HUBSPOT_BASE}/crm/associations/v4/${from}/${to}/labels`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(`Failed to fetch association labels for ${from}->${to}: ${JSON.stringify(json)}`);
  }

  const results: AssocLabel[] = json?.results ?? [];
  const unlabeled = results.find(
    (r) => r.category === 'HUBSPOT_DEFINED' && (r.label === null || r.label === '')
  );

  if (!unlabeled) {
    throw new Error(`No HUBSPOT_DEFINED unlabeled association type found for ${from}->${to}`);
  }

  return unlabeled.typeId;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    const { body, dealId } = await req.json();

    if (!contactId) {
      return NextResponse.json({ ok: false, error: 'Missing contactId' }, { status: 400 });
    }
    if (!body || typeof body !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing note body' }, { status: 400 });
    }

    // Resolve association type IDs once (portal-specific) using labels endpoint. [3](https://developers.hubspot.com/docs/api-reference/legacy/crm/associations/associations-schema/labels/get-associations-label)[4](https://community.hubspot.com/t5/APIs-Integrations/Where-to-find-all-CRM-association-types-in-HubSpot/td-p/755274)
    if (NOTE_TO_CONTACT_TYPE_ID == null) {
      NOTE_TO_CONTACT_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId('notes', 'contacts');
    }
    if (dealId && NOTE_TO_DEAL_TYPE_ID == null) {
      NOTE_TO_DEAL_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId('notes', 'deals');
    }

    // Build associations array (HubSpot supports associating during creation). [5](https://developers.hubspot.com/docs/api-reference/latest/crm/associations/overview)[1](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide)[2](https://developers.hubspot.com/docs/api-reference/crm-notes-v3/basic/post-crm-v3-objects-notes)
    const associations: any[] = [
      {
        to: { id: String(contactId) },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: NOTE_TO_CONTACT_TYPE_ID,
          },
        ],
      },
    ];

    if (dealId) {
      associations.push({
        to: { id: String(dealId) },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: NOTE_TO_DEAL_TYPE_ID!,
          },
        ],
      });
    }

    // Create note (v3 Notes API). [1](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide)[2](https://developers.hubspot.com/docs/api-reference/crm-notes-v3/basic/post-crm-v3-objects-notes)
    const createRes = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/notes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        properties: {
          hs_note_body: body,
          hs_timestamp: new Date().toISOString(),
        },
        associations,
      }),
    });

    const createJson = await createRes.json().catch(() => ({} as any));
    if (!createRes.ok) {
      console.error('[NOTE CREATE FAILED]', createRes.status, createJson);
      return NextResponse.json(
        { ok: false, error: createJson },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, noteId: createJson?.id ?? null });
  } catch (e: any) {
    console.error('[NOTE ROUTE ERROR]', e);
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
