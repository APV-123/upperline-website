import { NextResponse } from "next/server";
import { safeJson } from "@/lib/safeJson";

const HUBSPOT_BASE = "https://api.hubapi.com";

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

type HubSpotActivity = {
  id: string;
  type: "EMAIL" | "CALL" | "MEETING" | "NOTE" | "TASK";
  subject?: string | null;
  preview?: string | null;
  timestamp: string;
  ownerName?: string | null;
};

function toIsoTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();

  // numeric or numeric-string (HubSpot ms timestamps)
  if (typeof value === "number" || typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      return new Date(n).toISOString();
    }
  }

  // ISO string or date-like string
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // final fallback
  return new Date().toISOString();
}

function cleanEmailText(text: string | null): string | null {
  if (!text) return null;

  let s = text;

  // Remove HubSpot Sales tracking links
  s = s.replace(/https?:\/\/\S*hs-sales-engage\S*/gi, "");

  // Remove very long URLs (redirect / tracking junk)
  s = s.replace(/https?:\/\/\S+/gi, (url) => (url.length > 120 ? "" : url));

  // Remove vCard blocks often injected by signatures
  s = s.replace(/BEGIN:VCARD[\s\S]*?END:VCARD/gi, "");

  // Normalize excessive whitespace
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

type AssocResults = { results: Array<{ id: string | number }> };
type ContactWithAssociations = {
  associations?: Record<string, AssocResults>;
};

async function hubspotGet<T>(path: string): Promise<{ ok: boolean; json: T | null; status: number }> {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  const json = await safeJson<T>(res);
  return { ok: res.ok, json, status: res.status };
}

function assocIds(obj: ContactWithAssociations | null, key: string): string[] {
  const results = obj?.associations?.[key]?.results ?? [];
  return results.map((r) => String(r.id));
}

/** v1 engagements */
type V1Engagement = {
  id?: number | string;
  type?: string;
  timestamp?: number | string;
  createdAt?: number | string;
};

type V1EmailEngagementRow = {
  engagement?: V1Engagement;
  metadata?: {
    subject?: string;
    emailSubject?: string;
    bodyPreview?: string;
    text?: string;
  };
};

type V1EngagementsPagedResponse = {
  results?: V1EmailEngagementRow[];
  hasMore?: boolean;
  offset?: number;
};

async function getV1EngagementEmailsForContact(contactId: string, limitTotal = 200) {
  const results: V1EmailEngagementRow[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore && results.length < limitTotal) {
    const pageSize = Math.min(100, limitTotal - results.length);

    // IMPORTANT: use '&', not '&amp;' inside server strings
    const url =
      `${HUBSPOT_BASE}/engagements/v1/engagements/associated/contact/${contactId}/paged` +
      `?limit=${pageSize}&offset=${offset}`;

    const res = await fetch(url, {
      headers: authHeaders(),
      cache: "no-store",
    });

    const json = await safeJson<V1EngagementsPagedResponse>(res);

    if (!res.ok || !json) {
      const fallback = await res.text().catch(() => "");
      throw new Error(`engagements/v1 failed: ${fallback || res.status}`);
    }

    const page = json.results ?? [];
    results.push(...page);

    hasMore = Boolean(json.hasMore);
    offset = Number(json.offset ?? 0);

    if (!hasMore) break;
    if (!offset) break; // defensive
  }

  // Only EMAIL engagements
  return results.filter((r) => r.engagement?.type === "EMAIL");
}

/** Batch read v3 */
type BatchReadResponse<TProps> = {
  results?: Array<{
    id: string;
    properties: TProps;
  }>;
};

async function batchRead<TProps>(
  objectType: string,
  ids: string[],
  properties: string[]
): Promise<Array<{ id: string; properties: TProps }>> {
  if (ids.length === 0) return [];

  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/${objectType}/batch/read?properties=${properties.join(",")}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inputs: ids.map((id) => ({ id })),
      }),
    }
  );

  const json = await safeJson<BatchReadResponse<TProps>>(res);
  if (!res.ok || !json?.results) {
    // If batch fails, return empty rather than throwing to avoid killing entire activity timeline
    return [];
  }

  return json.results;
}

type EmailProps = {
  hs_timestamp?: unknown;
  hs_createdate?: unknown;
  hs_email_subject?: string;
  hs_email_text?: string;
};

type CallProps = {
  hs_timestamp?: unknown;
  hs_createdate?: unknown;
  hs_call_title?: string;
  hs_call_body?: string;
};

type MeetingProps = {
  hs_timestamp?: unknown;
  hs_createdate?: unknown;
  hs_meeting_title?: string;
  hs_meeting_body?: string;
};

type NoteProps = {
  hs_timestamp?: unknown;
  hs_createdate?: unknown;
  hs_note_body?: string;
};

type TaskProps = {
  hs_timestamp?: unknown;
  hs_createdate?: unknown;
  hs_task_subject?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;

    // IMPORTANT: use '&', not '&amp;'
    const contact = await hubspotGet<ContactWithAssociations>(
      `/crm/v3/objects/contacts/${contactId}` +
        `?associations=emails&associations=calls&associations=meetings&associations=notes&associations=tasks`
    );

    if (!contact.ok || !contact.json) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    // Collect engagement IDs
    const emailIds = assocIds(contact.json, "emails");
    const callIds = assocIds(contact.json, "calls");
    const meetingIds = assocIds(contact.json, "meetings");
    const noteIds = assocIds(contact.json, "notes");
    const taskIds = assocIds(contact.json, "tasks");

    // Batch read engagements
    const [emails, calls, meetings, notes, tasks] = await Promise.all([
      batchRead<EmailProps>("emails", emailIds, ["hs_timestamp", "hs_createdate", "hs_email_subject", "hs_email_text"]),
      batchRead<CallProps>("calls", callIds, ["hs_timestamp", "hs_createdate", "hs_call_title", "hs_call_body"]),
      batchRead<MeetingProps>("meetings", meetingIds, ["hs_timestamp", "hs_createdate", "hs_meeting_title", "hs_meeting_body"]),
      batchRead<NoteProps>("notes", noteIds, ["hs_timestamp", "hs_createdate", "hs_note_body"]),
      batchRead<TaskProps>("tasks", taskIds, ["hs_timestamp", "hs_createdate", "hs_task_subject"]),
    ]);

    // Normalize v3 objects
    const activities: HubSpotActivity[] = [
      ...emails.map((r) => ({
        id: r.id,
        type: "EMAIL" as const,
        subject: r.properties.hs_email_subject ?? null,
        preview: cleanEmailText(r.properties.hs_email_text ?? null),
        timestamp: toIsoTimestamp(r.properties.hs_timestamp ?? r.properties.hs_createdate),
      })),
      ...calls.map((r) => ({
        id: r.id,
        type: "CALL" as const,
        subject: r.properties.hs_call_title ?? null,
        preview: r.properties.hs_call_body ?? null,
        timestamp: toIsoTimestamp(r.properties.hs_timestamp ?? r.properties.hs_createdate),
      })),
      ...meetings.map((r) => ({
        id: r.id,
        type: "MEETING" as const,
        subject: r.properties.hs_meeting_title ?? null,
        preview: r.properties.hs_meeting_body ?? null,
        timestamp: toIsoTimestamp(r.properties.hs_timestamp ?? r.properties.hs_createdate),
      })),
      ...notes.map((r) => ({
        id: r.id,
        type: "NOTE" as const,
        subject: "Note",
        preview: r.properties.hs_note_body ?? null,
        timestamp: toIsoTimestamp(r.properties.hs_timestamp ?? r.properties.hs_createdate),
      })),
      ...tasks.map((r) => ({
        id: r.id,
        type: "TASK" as const,
        subject: r.properties.hs_task_subject ?? null,
        preview: null,
        timestamp: toIsoTimestamp(r.properties.hs_timestamp ?? r.properties.hs_createdate),
      })),
    ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    // Augment with tracked sales emails via v1 engagements
    let v1EmailEngagements: V1EmailEngagementRow[] = [];
    try {
      v1EmailEngagements = await getV1EngagementEmailsForContact(contactId, 200);
    } catch {
      v1EmailEngagements = [];
    }

    const v1EmailActivities: HubSpotActivity[] = v1EmailEngagements.map((row) => {
      const eng = row.engagement ?? {};
      const meta = row.metadata ?? {};

      return {
        id: `v1-${String(eng.id ?? "")}`,
        type: "EMAIL",
        subject: meta.subject ?? meta.emailSubject ?? null,
        preview: cleanEmailText(meta.bodyPreview ?? meta.text ?? null),
        timestamp: toIsoTimestamp(eng.timestamp ?? eng.createdAt),
        ownerName: null,
      };
    });

    // Merge + dedupe + sort newest-first
    const merged = [...activities, ...v1EmailActivities];

    const seen = new Set<string>();
    const deduped: HubSpotActivity[] = merged.filter((a) => {
      const key =
        a.type === "EMAIL"
          ? `${a.type}|${a.timestamp}|${a.subject ?? ""}`
          : `${a.type}|${a.id}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({ ok: true, activities: deduped });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}