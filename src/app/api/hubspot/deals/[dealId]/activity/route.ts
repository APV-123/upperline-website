import { NextResponse } from 'next/server';

type HubSpotActivity = {
  id: string;
  type: 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE' | 'TASK';
  subject?: string | null;
  preview?: string | null;
  timestamp: string; // ISO
  ownerName?: string | null; // optional; we won’t resolve owner names yet
};

const HUBSPOT_BASE = 'https://api.hubapi.com';

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function toIsoFromHsTimestamp(v?: string | null): string | null {
  if (!v) return null;
  // hs_timestamp is often ms since epoch OR ISO; support both
  const asNum = Number(v);
  if (!Number.isNaN(asNum) && asNum > 0) return new Date(asNum).toISOString();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pickFirstIso(...vals: Array<string | null | undefined>): string {
  for (const v of vals) {
    const iso = toIsoFromHsTimestamp(v ?? null);
    if (iso) return iso;
  }
  // fallback to now so sorting doesn’t explode; should be rare
  return new Date().toISOString();
}

async function hubspotGet(path: string) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function hubspotPost(path: string, body: any) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function assocIdsFromDeal(dealJson: any, assocKey: string): string[] {
  const results = dealJson?.associations?.[assocKey]?.results ?? [];
  return results.map((r: any) => String(r.id)).filter(Boolean);
}

async function batchReadObject(
  objectType: string,
  ids: string[],
  properties: string[]
) {
  if (ids.length === 0) return [];
  // Batch read supports up to 100 IDs per request; chunk defensively. [1](https://developers.hubspot.com/docs/guides/crm/using-object-apis)
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

  const out: any[] = [];
  for (const chunk of chunks) {
    const qp = properties.length ? `?properties=${encodeURIComponent(properties.join(','))}` : '';
    const body = { inputs: chunk.map((id) => ({ id })) };
    const { ok, status, json } = await hubspotPost(`/crm/v3/objects/${objectType}/batch/read${qp}`, body);
    if (!ok) {
      throw new Error(`HubSpot batch read failed for ${objectType} (${status}): ${JSON.stringify(json)}`);
    }
    out.push(...(json?.results ?? []));
  }
  return out;
}

function truncate(s: string, n = 180) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    // 1) Get deal with association IDs in a single call (preferred). [1](https://developers.hubspot.com/docs/guides/crm/using-object-apis)[2](https://www.scopiousdigital.com/faq/retrieve-associations-between-hubspot-custom-object)
    const assocQuery =
      `?associations=calls&associations=emails&associations=meetings&associations=notes&associations=tasks`;

    const dealRes = await hubspotGet(`/crm/v3/objects/deals/${dealId}${assocQuery}`);
    if (!dealRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to load deal associations: ${JSON.stringify(dealRes.json)}` },
        { status: 500 }
      );
    }

    const callIds = assocIdsFromDeal(dealRes.json, 'calls');
    const emailIds = assocIdsFromDeal(dealRes.json, 'emails');
    const meetingIds = assocIdsFromDeal(dealRes.json, 'meetings');
    const noteIds = assocIdsFromDeal(dealRes.json, 'notes');
    const taskIds = assocIdsFromDeal(dealRes.json, 'tasks');

    // 2) Batch read engagement records. [1](https://developers.hubspot.com/docs/guides/crm/using-object-apis)
    const [calls, emails, meetings, notes, tasks] = await Promise.all([
      batchReadObject('calls', callIds, ['hs_timestamp', 'hs_call_title', 'hs_call_body', 'hubspot_owner_id', 'hs_createdate']),
      batchReadObject('emails', emailIds, ['hs_timestamp', 'hs_email_subject', 'hs_email_text', 'hubspot_owner_id', 'hs_createdate']),
      batchReadObject('meetings', meetingIds, ['hs_timestamp', 'hs_meeting_title', 'hs_meeting_body', 'hubspot_owner_id', 'hs_createdate']), // meetings props per guide [3](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/meetings/guide)
      batchReadObject('notes', noteIds, ['hs_timestamp', 'hs_note_body', 'hubspot_owner_id', 'hs_createdate']), // notes props per guide [4](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide)
      batchReadObject('tasks', taskIds, ['hs_timestamp', 'hs_task_subject', 'hs_task_body', 'hubspot_owner_id', 'hs_createdate']),
    ]);

    // 3) Normalize into your slider’s activity model
    const activities: HubSpotActivity[] = [];

    for (const c of calls) {
      const p = c.properties ?? {};
      activities.push({
        id: String(c.id),
        type: 'CALL',
        subject: p.hs_call_title ?? null,
        preview: p.hs_call_body ? truncate(p.hs_call_body) : null,
        timestamp: pickFirstIso(p.hs_timestamp, p.hs_createdate),
      });
    }

    for (const e of emails) {
      const p = e.properties ?? {};
      activities.push({
        id: String(e.id),
        type: 'EMAIL',
        subject: p.hs_email_subject ?? null,
        preview: p.hs_email_text ? truncate(p.hs_email_text) : null,
        timestamp: pickFirstIso(p.hs_timestamp, p.hs_createdate),
      });
    }

    for (const m of meetings) {
      const p = m.properties ?? {};
      activities.push({
        id: String(m.id),
        type: 'MEETING',
        subject: p.hs_meeting_title ?? null,
        preview: p.hs_meeting_body ? truncate(p.hs_meeting_body) : null,
        timestamp: pickFirstIso(p.hs_timestamp, p.hs_createdate),
      });
    }

    for (const n of notes) {
      const p = n.properties ?? {};
      activities.push({
        id: String(n.id),
        type: 'NOTE',
        subject: 'Note',
        preview: p.hs_note_body ? truncate(p.hs_note_body) : null,
        timestamp: pickFirstIso(p.hs_timestamp, p.hs_createdate),
      });
    }

    for (const t of tasks) {
      const p = t.properties ?? {};
      activities.push({
        id: String(t.id),
        type: 'TASK',
        subject: p.hs_task_subject ?? null,
        preview: p.hs_task_body ? truncate(p.hs_task_body) : null,
        timestamp: pickFirstIso(p.hs_timestamp, p.hs_createdate),
      });
    }

    // 4) Sort newest-first, limit output
    activities.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({
      ok: true,
      activities: activities.slice(0, 75),
      summary: {
        total: activities.length,
        lastInteraction: activities[0]?.timestamp ?? null,
        lastInteractionType: activities[0]?.type ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}