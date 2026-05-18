import { NextRequest, NextResponse } from "next/server";

type HubSpotContact = {
  id: string | number;
  properties?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
};

type HubSpotSearchResponse = {
  results?: HubSpotContact[];
  paging?: {
    next?: {
      after?: string;
    };
  };
};

type SearchPayload = {
  limit: number;
  properties: string[];
  query?: string;
  after?: string;
  // Keeping room for future expansion (filters/sorts are supported by CRM search endpoints)
  // filterGroups?: Array<{ filters: Array<{ propertyName: string; operator: string; value: string }> }>;
  // sorts?: string[];
};

function getHubSpotToken(): string | null {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) return null;
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function hsHeaders(method: "GET" | "POST"): Headers {
  const token = getHubSpotToken();
  const h = new Headers();
  if (token) h.set("authorization", `Bearer ${token}`);
  h.set("accept", "application/json");
  if (method === "POST") h.set("content-type", "application/json");
  return h;
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
  const raw = await res.text(); // ✅ read body ONCE
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

/**
 * GET /api/hubspot/contacts/search?q=&after=&limit=
 *
 * HubSpot CRM search supports POST to /crm/v3/objects/contacts/search with:
 * - query
 * - after (paging cursor)
 * - limit
 * - properties
 * and returns paging.next.after for subsequent pages. 【1-df29fa】【2-7304eb】
 */
export async function GET(req: NextRequest) {
  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing HUBSPOT_PRIVATE_APP_TOKEN" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim();
    const after = searchParams.get("after") ?? undefined;
    const limitRaw = Number(searchParams.get("limit") ?? 25);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 50);

    const payload: SearchPayload = {
      limit,
      properties: ["firstname", "lastname", "email"],
      ...(q ? { query: q } : {}),
      ...(after ? { after } : {}),
    };

    const hsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: hsHeaders("POST"),
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    const read = await readJsonOrText<HubSpotSearchResponse>(hsRes);

    if (!read.ok) {
      // Preserve HubSpot status + body snippet (useful for 401/403/429)
      console.error("[HS CONTACT SEARCH FAILED]", read.status, read.raw.slice(0, 600));

      return NextResponse.json(
        {
          ok: false,
          error: "HubSpot contact search failed",
          status: read.status,
          details: read.raw.slice(0, 600),
        },
        { status: 502 }
      );
    }

    const json = read.json ?? {};
    const results = (json.results ?? []).map((c) => {
      const props = c.properties ?? {};
      const firstname = props.firstname ?? "";
      const lastname = props.lastname ?? "";
      const email = props.email ?? "";

      return {
        id: String(c.id),
        firstname,
        lastname,
        email,
        name: `${firstname} ${lastname}`.trim(),
      };
    });

    // paging.next.after is the cursor for next page if present 【2-7304eb】【1-df29fa】
    const nextAfter = json.paging?.next?.after ?? null;

    return NextResponse.json({ ok: true, results, nextAfter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unhandled error";
    console.error("[CONTACT SEARCH ERROR]", message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
