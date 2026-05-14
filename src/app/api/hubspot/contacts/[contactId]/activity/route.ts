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
function toIsoTimestamp(value: any): string {
  if (!value) return new Date().toISOString();

  // numeric or numeric-string (HubSpot ms timestamps)
  const n = Number(value);
  if (!Number.isNaN(n)) {
    return new Date(n).toISOString();
  }

  // ISO string or date-like string
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString();
  }

  // final fallback
  return new Date().toISOString();
}
function cleanEmailText(text: string | null): string | null {
  if (!text) return null;

  let s = text;

  // Remove HubSpot Sales tracking links
  s = s.replace(/https?:\/\/\S*hs-sales-engage\S*/gi, '');

  // Remove very long URLs (redirect / tracking junk)
  s = s.replace(/https?:\/\/\S+/gi, (url) =>
    url.length > 120 ? '' : url
  );

  // Remove vCard blocks often injected by signatures
  s = s.replace(/BEGIN:VCARD[\s\S]*?END:VCARD/gi, '');

  // Normalize excessive whitespace
  s = s.replace(/\n{3,}/g, '\n\n').trim();

  return s;
}
async function hubspotGet(path: string) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

function assocIds(obj: any, key: string): string[] {
  return (obj?.associations?.[key]?.results ?? []).map((r: any) => String(r.id));
}

async function getV1EngagementEmailsForContact(contactId: string, limitTotal = 200) {
  const results: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore && results.length < limitTotal) {
    const pageSize = Math.min(100, limitTotal - results.length);

    const res = await fetch(
      `${HUBSPOT_BASE}/engagements/v1/engagements/associated/contact/${contactId}/paged?limit=${pageSize}&offset=${offset}`,
      {
        headers: authHeaders(),
        cache: 'no-store',
      }
    );

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      throw new Error(`engagements/v1 failed: ${JSON.stringify(json)}`);
    }

    const page = json?.results ?? [];
    results.push(...page);

    hasMore = Boolean(json?.hasMore);
    offset = Number(json?.offset ?? 0);
    if (!hasMore) break;
    if (!offset) break; // defensive
  }

  // Only EMAIL engagements (these often represent tracked sales-extension emails) [3](https://community.hubspot.com/t5/APIs-Integrations/Extracting-text-of-tracked-quot-engagement-quot-emails/m-p/853902)[1](https://developers.hubspot.com/docs/api-reference/legacy/crm-engagements-v1/get-engagements-v1-engagements-paged)
  return results.filter((r) => r?.engagement?.type === 'EMAIL');
}

async function batchRead(
  objectType: string,
  ids: string[],
  properties: string[]
) {
  if (ids.length === 0) return [];

  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/${objectType}/batch/read?properties=${properties.join(',')}`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        inputs: ids.map((id) => ({ id })),
      }),
    }
  );

  const json = await res.json();
  return json?.results ?? [];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;

    // 1️⃣ Load contact + associations
    const contact = await hubspotGet(
      `/crm/v3/objects/contacts/${contactId}` +
        `?associations=emails&associations=calls&associations=meetings&associations=notes&associations=tasks`
    );

    if (!contact.ok) {
      return NextResponse.json(
        { ok: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // 2️⃣ Collect engagement IDs
    const emailIds = assocIds(contact.json, 'emails');
    const callIds = assocIds(contact.json, 'calls');
    const meetingIds = assocIds(contact.json, 'meetings');
    const noteIds = assocIds(contact.json, 'notes');
    const taskIds = assocIds(contact.json, 'tasks');

    // 3️⃣ Batch read engagements
    const [emails, calls, meetings, notes, tasks] = await Promise.all([
      batchRead('emails', emailIds, ['hs_timestamp', 'hs_createdate', 'hs_email_subject', 'hs_email_text']),
      batchRead('calls', callIds, ['hs_timestamp', 'hs_createdate', 'hs_call_title', 'hs_call_body']),
      batchRead('meetings', meetingIds, ['hs_timestamp', 'hs_createdate', 'hs_meeting_title', 'hs_meeting_body']),
      batchRead('notes', noteIds, ['hs_timestamp', 'hs_createdate', 'hs_note_body']),
      batchRead('tasks', taskIds, ['hs_timestamp', 'hs_createdate', 'hs_task_subject']),
    ]);

    // 4️⃣ Normalize
    const activities = [
      ...emails.map((r: any) => ({
        id: r.id,
        type: 'EMAIL',
        subject: r.properties.hs_email_subject ?? null,
        preview: cleanEmailText(r.properties.hs_email_text ?? null),
        timestamp: toIsoTimestamp(
            r.properties.hs_timestamp ?? r.properties.hs_createdate
        )
      })),
      ...calls.map((r: any) => ({
        id: r.id,
        type: 'CALL',
        subject: r.properties.hs_call_title ?? null,
        preview: r.properties.hs_call_body ?? null,
        timestamp: toIsoTimestamp(
            r.properties.hs_timestamp ?? r.properties.hs_createdate
        )
      })),
      ...meetings.map((r: any) => ({
        id: r.id,
        type: 'MEETING',
        subject: r.properties.hs_meeting_title ?? null,
        preview: r.properties.hs_meeting_body ?? null,
        timestamp: toIsoTimestamp(
            r.properties.hs_timestamp ?? r.properties.hs_createdate
        )
      })),
      ...notes.map((r: any) => ({
        id: r.id,
        type: 'NOTE',
        subject: 'Note',
        preview: r.properties.hs_note_body ?? null,
        timestamp: toIsoTimestamp(
            r.properties.hs_timestamp ?? r.properties.hs_createdate
        )
      })),
      ...tasks.map((r: any) => ({
        id: r.id,
        type: 'TASK',
        subject: r.properties.hs_task_subject ?? null,
        preview: null,
        timestamp: toIsoTimestamp(
            r.properties.hs_timestamp ?? r.properties.hs_createdate
        )
      })),
    ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    // 5️⃣ Augment with tracked sales emails via Engagements v1
    let v1EmailEngagements: any[] = [];
    try {
    v1EmailEngagements = await getV1EngagementEmailsForContact(contactId, 200);
    } catch (e) {
    // If sales-email-read scope is missing or HubSpot restricts email details,
    // this may fail or return sparse metadata. [1](https://developers.hubspot.com/docs/api-reference/legacy/crm-engagements-v1/get-engagements-v1-engagements-paged)[2](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/engagements/get-engagements-v1-engagements-engagement-id)
    v1EmailEngagements = [];
    }

    // Normalize v1 -> your activity model
    const v1EmailActivities = v1EmailEngagements.map((row: any) => {
    const eng = row.engagement ?? {};
    const meta = row.metadata ?? {};

    return {
        id: `v1-${String(eng.id)}`,
        type: 'EMAIL',
        subject: meta.subject ?? meta.emailSubject ?? null,
        preview: cleanEmailText(meta.bodyPreview ?? meta.text ?? null),
        timestamp: toIsoTimestamp(eng.timestamp ?? eng.createdAt),
        ownerName: null,
    };
    });

    // Merge + dedupe + sort newest-first
    const merged = [...activities, ...v1EmailActivities];

   
  const seen = new Set<string>();

  const deduped = merged.filter((a: any) => {
    const key =
      a.type === 'EMAIL'
        ? `${a.type}|${a.timestamp}|${a.subject ?? ''}`
        : `${a.type}|${a.id}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });


    deduped.sort((a: any, b: any) => (a.timestamp < b.timestamp ? 1 : -1));

    // Replace your return with deduped
    return NextResponse.json({
    ok: true,
    activities: deduped,
    });
    } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}