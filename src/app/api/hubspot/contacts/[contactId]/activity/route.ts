import { NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

type Params = { contactId: string };

type HubSpotActivity = {
  id: string;
  type: "EMAIL" | "CALL" | "MEETING" | "NOTE" | "TASK";
  subject?: string | null;
  preview?: string | null;
  timestamp: string; // ISO
  ownerName?: string | null;
};

function getHubSpotToken(): string | null {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) return null;
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function authHeaders(method: "GET" | "POST"): Headers {
  const token = getHubSpotToken();
  const h = new Headers();
  if (token) h.set("authorization", `Bearer ${token}`);
  h.set("accept", "application/json");
  if (method === "POST") h.set("content-type", "application/json");
  return h;
}

function toIsoTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();

  if (typeof value === "number" || typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return new Date(n).toISOString();
  }

  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

function cleanEmailText(text: string | null): string | null {
  if (!text) return null;

  let s = text;

  s = s.replace(/https?:\/\/\S*hs-sales-engage\S*/gi, "");
  s = s.replace(/https?:\/\/\S+/gi, (url) => (url.length > 120 ? "" : url));
  s = s.replace(/BEGIN:VCARD[\s\S]*?END:VCARD/gi, "");
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

function parseJsonMaybe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readJsonOrText<T>(res: Response): Promise<{
  ok: boolean;
  status: number;
  raw: string;
  json: T | null;
}> {
  const raw = await res.text(); // ✅ read once
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

type AssocResults = { results: Array<{ id: string | number }> };
type ContactWithAssociations = { associations?: Record<string, AssocResults> };

function assocIds(obj: ContactWithAssociations | null, key: string): string[] {
  const results = obj?.associations?.[key]?.results ?? [];
  return results.map((r) => String(r.id));
}

async function hubspotGet<T>(path: string) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: authHeaders("GET"),
    cache: "no-store",
  });

  return readJsonOrText<T>(res);
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

    // ✅ IMPORTANT: Use '&' (not '&amp;') in server strings
    const url =
      `${HUBSPOT_BASE}/engagements/v1/engagements/associated/contact/${contactId}/paged` +
      `?limit=${pageSize}&offset=${offset}`;

    const res = await fetch(url, {
      headers: authHeaders("GET"),
      cache: "no-store",
    });

    const read = await readJsonOrText<V1EngagementsPagedResponse>(res);

    if (!read.ok || !read.json) {
      // Don't throw — keep activity timeline alive
      console.error("[V1 ENGAGEMENTS FAILED]", read.status, read.raw.slice(0, 400));
      return [];
    }

    const page = read.json.results ?? [];
    results.push(...page);

    hasMore = Boolean(read.json.hasMore);
    offset = Number(read.json.offset ?? 0);

    if (!hasMore) break;
    if (!offset) break; // defensive
  }

  return results.filter((r) => r.engagement?.type === "EMAIL");
}

/** Batch read v3 */
type BatchReadResponse<TProps> = {
  results?: Array<{ id: string; properties: TProps }>;
};

async function batchRead<TProps>(
  objectType: string,
  ids: string[],
  properties: string[]
): Promise<Array<{ id: string; properties: TProps }>> {
  if (ids.length === 0) return [];

  const url =
    `${HUBSPOT_BASE}/crm/v3/objects/${objectType}/batch/read` +
    `?properties=${encodeURIComponent(properties.join(","))}`;

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders("POST"),
    body: JSON.stringify({ inputs: ids.map((id) => ({ id })) }),
    cache: "no-store",
  });

  const read = await readJsonOrText<BatchReadResponse<TProps>>(res);

  if (!read.ok || !read.json?.results) {
    console.error(`[BATCH READ FAILED] ${objectType}`, read.status, read.raw.slice(0, 400));
    return [];
  }

  return read.json.results;
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
  context: { params: Params | Promise<Params> }
) {
  const { contactId } = await context.params;

  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing HUBSPOT_PRIVATE_APP_TOKEN" },
      { status: 500 }
    );
  }

  try {
    // ✅ IMPORTANT: Use '&' not '&amp;' for query params
    const contact = await hubspotGet<ContactWithAssociations>(
      `/crm/v3/objects/contacts/${contactId}` +
        `?associations=emails&associations=calls&associations=meetings&associations=notes&associations=tasks`
    );

    if (!contact.ok || !contact.json) {
      return NextResponse.json(
        { ok: false, error: "Contact not found", status: contact.status, details: contact.raw.slice(0, 400) },
        { status: 404 }
      );
    }

    const emailIds = assocIds(contact.json, "emails");
    const callIds = assocIds(contact.json, "calls");
    const meetingIds = assocIds(contact.json, "meetings");
    const noteIds = assocIds(contact.json, "notes");
    const taskIds = assocIds(contact.json, "tasks");

    const [emails, calls, meetings, notes, tasks] = await Promise.all([
      batchRead<EmailProps>("emails", emailIds, ["hs_timestamp", "hs_createdate", "hs_email_subject", "hs_email_text"]),
      batchRead<CallProps>("calls", callIds, ["hs_timestamp", "hs_createdate", "hs_call_title", "hs_call_body"]),
      batchRead<MeetingProps>("meetings", meetingIds, ["hs_timestamp", "hs_createdate", "hs_meeting_title", "hs_meeting_body"]),
      batchRead<NoteProps>("notes", noteIds, ["hs_timestamp", "hs_createdate", "hs_note_body"]),
      batchRead<TaskProps>("tasks", taskIds, ["hs_timestamp", "hs_createdate", "hs_task_subject"]),
    ]);

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

    // v1 tracked emails (optional augmentation; never fatal)
    const v1EmailEngagements = await getV1EngagementEmailsForContact(contactId, 200);

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

    const merged = [...activities, ...v1EmailActivities];

    const seen = new Set<string>();
    const deduped = merged.filter((a) => {
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
    console.error("[CONTACT ACTIVITY ERROR]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
