import { NextResponse } from "next/server";

/* ---------- TYPES ---------- */

type HubSpotActivity = {
  id: string;
  type: "EMAIL" | "CALL" | "MEETING" | "NOTE" | "TASK";
  subject?: string | null;
  preview?: string | null;
  timestamp: string;
  ownerName?: string | null;
};

type DealAssociations = {
  associations?: Record<
    string,
    {
      results?: Array<{ id: string | number }>;
    }
  >;
};

type BatchResult<T> = {
  id: string;
  properties: T;
};

type BatchResponse<T> = {
  results?: BatchResult<T>[];
};

type ContactProps = Record<string, unknown>;

/* ---------- CONFIG ---------- */

const HUBSPOT_BASE = "https://api.hubapi.com";

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/* ---------- UTIL ---------- */

function toIsoFromHsTimestamp(v?: string | null): string | null {
  if (!v) return null;

  const asNum = Number(v);
  if (!Number.isNaN(asNum) && asNum > 0) {
    return new Date(asNum).toISOString();
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

function pickFirstIso(...vals: Array<string | null | undefined>): string {
  for (const v of vals) {
    const iso = toIsoFromHsTimestamp(v ?? null);
    if (iso) return iso;
  }
  return new Date().toISOString();
}

function truncate(s: string, n = 180) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/* ---------- API HELPERS ---------- */

async function hubspotGet<T>(path: string): Promise<T> {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as T | null;

  if (!res.ok || !json) {
    throw new Error(`HubSpot GET failed: ${res.status}`);
  }

  return json;
}

async function hubspotPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as T | null;

  if (!res.ok || !json) {
    throw new Error(`HubSpot POST failed: ${res.status}`);
  }

  return json;
}

function assocIdsFromDeal(obj: DealAssociations, key: string): string[] {
  const results = obj?.associations?.[key]?.results ?? [];
  return results.map((r) => String(r.id)).filter(Boolean);
}

async function batchReadObject<TProps>(
  objectType: string,
  ids: string[],
  properties: string[]
): Promise<Array<{ id: string; properties: TProps }>> {
  if (ids.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100));
  }

  const out: Array<{ id: string; properties: TProps }> = [];

  for (const chunk of chunks) {
    const qp = properties.length
      ? `?properties=${encodeURIComponent(properties.join(","))}`
      : "";

    const body = { inputs: chunk.map((id) => ({ id })) };

    const json = await hubspotPost<BatchResponse<TProps>>(
      `/crm/v3/objects/${objectType}/batch/read${qp}`,
      body
    );

    out.push(...(json?.results ?? []));
  }

  return out;
}

/* ---------- ROUTE ---------- */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    const assocQuery =
      "?associations=calls&associations=emails&associations=meetings&associations=notes&associations=tasks";

    const deal = await hubspotGet<DealAssociations>(
      `/crm/v3/objects/deals/${dealId}${assocQuery}`
    );

    const callIds = assocIdsFromDeal(deal, "calls");
    const emailIds = assocIdsFromDeal(deal, "emails");
    const meetingIds = assocIdsFromDeal(deal, "meetings");
    const noteIds = assocIdsFromDeal(deal, "notes");
    const taskIds = assocIdsFromDeal(deal, "tasks");

    const [calls, emails, meetings, notes, tasks] = await Promise.all([
      batchReadObject<ContactProps>("calls", callIds, [
        "hs_timestamp",
        "hs_call_title",
        "hs_call_body",
        "hs_createdate",
      ]),
      batchReadObject<ContactProps>("emails", emailIds, [
        "hs_timestamp",
        "hs_email_subject",
        "hs_email_text",
        "hs_createdate",
      ]),
      batchReadObject<ContactProps>("meetings", meetingIds, [
        "hs_timestamp",
        "hs_meeting_title",
        "hs_meeting_body",
        "hs_createdate",
      ]),
      batchReadObject<ContactProps>("notes", noteIds, [
        "hs_timestamp",
        "hs_note_body",
        "hs_createdate",
      ]),
      batchReadObject<ContactProps>("tasks", taskIds, [
        "hs_timestamp",
        "hs_task_subject",
        "hs_task_body",
        "hs_createdate",
      ]),
    ]);

    const activities: HubSpotActivity[] = [];

    for (const c of calls) {
      const p = c.properties;
      activities.push({
        id: String(c.id),
        type: "CALL",
        subject: (p["hs_call_title"] as string) ?? null,
        preview: p["hs_call_body"]
          ? truncate(p["hs_call_body"] as string)
          : null,
        timestamp: pickFirstIso(
          p["hs_timestamp"] as string,
          p["hs_createdate"] as string
        ),
      });
    }

    for (const e of emails) {
      const p = e.properties;
      activities.push({
        id: String(e.id),
        type: "EMAIL",
        subject: (p["hs_email_subject"] as string) ?? null,
        preview: p["hs_email_text"]
          ? truncate(p["hs_email_text"] as string)
          : null,
        timestamp: pickFirstIso(
          p["hs_timestamp"] as string,
          p["hs_createdate"] as string
        ),
      });
    }

    for (const m of meetings) {
      const p = m.properties;
      activities.push({
        id: String(m.id),
        type: "MEETING",
        subject: (p["hs_meeting_title"] as string) ?? null,
        preview: p["hs_meeting_body"]
          ? truncate(p["hs_meeting_body"] as string)
          : null,
        timestamp: pickFirstIso(
          p["hs_timestamp"] as string,
          p["hs_createdate"] as string
        ),
      });
    }

    for (const n of notes) {
      const p = n.properties;
      activities.push({
        id: String(n.id),
        type: "NOTE",
        subject: "Note",
        preview: p["hs_note_body"]
          ? truncate(p["hs_note_body"] as string)
          : null,
        timestamp: pickFirstIso(
          p["hs_timestamp"] as string,
          p["hs_createdate"] as string
        ),
      });
    }

    for (const t of tasks) {
      const p = t.properties;
      activities.push({
        id: String(t.id),
        type: "TASK",
        subject: (p["hs_task_subject"] as string) ?? null,
        preview: p["hs_task_body"]
          ? truncate(p["hs_task_body"] as string)
          : null,
        timestamp: pickFirstIso(
          p["hs_timestamp"] as string,
          p["hs_createdate"] as string
        ),
      });
    }

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}