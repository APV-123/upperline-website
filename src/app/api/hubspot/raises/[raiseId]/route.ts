import { NextRequest, NextResponse } from "next/server";

type Bucket = "committed" | "circling" | "needs_touch" | "passed";
type Params = { raiseId: string };

/** ---------- Helpers ---------- */

function getHubSpotToken(): string | null {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) return null;

  // Remove surrounding quotes and trim whitespace/newlines
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function hsHeaders(method: "GET" | "POST"): Headers {
  const token = getHubSpotToken();

  // We’ll still return headers even if token missing; callers will handle
  const h = new Headers();
  if (token) h.set("authorization", `Bearer ${token}`);
  h.set("accept", "application/json");

  // Only set content-type when we actually send JSON
  if (method === "POST") h.set("content-type", "application/json");

  return h;
}

function isStale(hsLastActivityDate: string | null, days = 5) {
  if (!hsLastActivityDate) return true;
  const last = new Date(hsLastActivityDate).getTime();
  if (Number.isNaN(last)) return true;
  const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

function toPortalBucket(stageLabel: string | null, hsLastActivityDate: string | null): Bucket {
  const label = (stageLabel ?? "").toLowerCase();

  if (label === "committed" || label === "funded") return "committed";
  if (label === "passed" || label.includes("deferred") || label.includes("recycle")) return "passed";
  if (label === "soft interest" || label.includes("docs")) return "needs_touch";
  if (label === "introduced" || label === "engaged") return "circling";

  if (isStale(hsLastActivityDate)) return "needs_touch";
  return "circling";
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
  const raw = await res.text();
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

/** ---------- Minimal HubSpot response shapes (only what we use) ---------- */

type DealSearchPayload = {
  filterGroups: Array<{
    filters: Array<{ propertyName: string; operator: string; value: string }>;
  }>;
  properties: string[];
  limit: number;
};

type DealSearchResult = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    raise_id?: string;
    hs_lastactivitydate?: string;
    hs_lastmodifieddate?: string;
    [key: string]: string | undefined;
  };
};

type DealSearchResponse = { results?: DealSearchResult[] };

type PipelineStage = { id: string | number; label: string };
type StagesResponse = { results?: PipelineStage[] };

type AssocType = { category?: string; typeId?: number };
type AssocToEntry = { id?: string | number; toObjectId?: string | number; associationTypes?: AssocType[] };
type AssocRow = { from?: { id?: string | number }; to?: AssocToEntry[] };
type AssocBatchReadResponse = { results?: AssocRow[] };

type ContactProps = { firstname?: string; lastname?: string; email?: string; [key: string]: string | undefined };
type ContactResult = { id: string | number; properties?: ContactProps };
type ContactsBatchReadResponse = { results?: ContactResult[] };

/** ---------- Route ---------- */

export async function GET(
  _req: NextRequest,
  context: { params: Params | Promise<Params> }
) {
  const { raiseId } = await context.params;

  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing HUBSPOT_PRIVATE_APP_TOKEN" },
      { status: 500 }
    );
  }

  try {
    // 1) Search deals by raise_id
    const searchPayload: DealSearchPayload = {
      filterGroups: [
        { filters: [{ propertyName: "raise_id", operator: "EQ", value: raiseId }] },
      ],
      properties: [
        "dealname",
        "amount",
        "dealstage",
        "pipeline",
        "raise_id",
        "hs_lastactivitydate",
        "hs_lastmodifieddate",
      ],
      limit: 100,
    };

    const dealsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals/search",
      {
        method: "POST",
        headers: hsHeaders("POST"),
        body: JSON.stringify(searchPayload),
        cache: "no-store",
      }
    );

    const dealsRead = await readJsonOrText<DealSearchResponse>(dealsRes);

    if (!dealsRead.ok) {
      // Preserve HubSpot status + body snippet
      return NextResponse.json(
        {
          ok: false,
          error: "Deal search failed",
          status: dealsRead.status,
          details: dealsRead.raw.slice(0, 800),
        },
        { status: 502 }
      );
    }

    const deals: DealSearchResult[] = dealsRead.json?.results ?? [];

    if (!deals.length) {
      return NextResponse.json({ ok: true, raiseId, investors: [] });
    }

    // 1b) Build stageId -> label map per pipeline (parallel)
    const pipelineIds = Array.from(
      new Set(
        deals
          .map((d) => d.properties?.pipeline)
          .filter((p): p is string => Boolean(p))
      )
    );

    const stageLabelByPipeline = new Map<string, Map<string, string>>();

    await Promise.all(
      pipelineIds.map(async (pipelineId) => {
        const stagesRes = await fetch(
          `https://api.hubapi.com/crm/v3/pipelines/deals/${pipelineId}/stages`,
          {
            method: "GET",
            headers: hsHeaders("GET"),
            cache: "no-store",
          }
        );

        const stagesRead = await readJsonOrText<StagesResponse>(stagesRes);
        if (!stagesRead.ok) return;

        const map = new Map<string, string>();
        for (const s of stagesRead.json?.results ?? []) {
          map.set(String(s.id), String(s.label));
        }
        stageLabelByPipeline.set(String(pipelineId), map);
      })
    );

    // 2) Batch read Deal -> Contact associations
    const assocRes = await fetch(
      "https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read",
      {
        method: "POST",
        headers: hsHeaders("POST"),
        body: JSON.stringify({ inputs: deals.map((d) => ({ id: d.id })) }),
        cache: "no-store",
      }
    );

    const assocRead = await readJsonOrText<AssocBatchReadResponse>(assocRes);

    if (!assocRead.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Associations batch read failed",
          status: assocRead.status,
          details: assocRead.raw.slice(0, 800),
        },
        { status: 502 }
      );
    }

    const dealToContactId = new Map<string, string>();
    const contactIdSet = new Set<string>();

    for (const row of assocRead.json?.results ?? []) {
      const dealIdRaw = row.from?.id;
      if (!dealIdRaw) continue;
      const dealId = String(dealIdRaw);

      const contactAssoc = (row.to ?? []).find((t) =>
        (t.associationTypes ?? []).some(
          (a) => a.category === "HUBSPOT_DEFINED" && a.typeId === 3
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
    const contactsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/batch/read",
      {
        method: "POST",
        headers: hsHeaders("POST"),
        body: JSON.stringify({
          inputs: contactIds.map((id) => ({ id: String(id) })),
          properties: ["firstname", "lastname", "email"],
        }),
        cache: "no-store",
      }
    );

    const contactsRead = await readJsonOrText<ContactsBatchReadResponse>(contactsRes);

    if (!contactsRead.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Contacts batch read failed",
          status: contactsRead.status,
          details: contactsRead.raw.slice(0, 800),
        },
        { status: 502 }
      );
    }

    const contactsById = new Map<string, ContactResult>(
      (contactsRead.json?.results ?? []).map((c) => [String(c.id), c])
    );

    // 4) Normalize rows for portal
    const investors = deals.map((deal) => {
      const pipeline = deal.properties?.pipeline ?? null;
      const dealstage = deal.properties?.dealstage ?? null;

      const stageMap = pipeline ? stageLabelByPipeline.get(String(pipeline)) : undefined;
      const dealstageLabel = dealstage ? (stageMap?.get(String(dealstage)) ?? null) : null;

      const contactId = dealToContactId.get(String(deal.id)) ?? null;
      const contact = contactId ? contactsById.get(String(contactId)) : null;

      const first = contact?.properties?.firstname ?? "";
      const last = contact?.properties?.lastname ?? "";
      const email = contact?.properties?.email ?? null;
      const investorName = `${first} ${last}`.trim() || email || "Unknown Investor";

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Unhandled error", details: message },
      { status: 500 }
    );
  }
}