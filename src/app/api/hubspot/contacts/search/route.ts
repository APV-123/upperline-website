import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/safeJson";

function hsHeaders() {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");

  const token = raw.replace(/^['"]|['"]$/g, "").trim();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

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
};

/**
 * GET /api/hubspot/contacts/search?q=&after=&limit=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim();
    const after = searchParams.get("after");
    const limit = Number(searchParams.get("limit") ?? 25);

    const payload: SearchPayload = {
      limit: Math.min(Math.max(limit, 1), 50),
      properties: ["firstname", "lastname", "email"],
    };

    if (q) payload.query = q;
    if (after) payload.after = after;

    const res = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: hsHeaders(),
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json(
        { ok: false, error: "HubSpot contact search failed", details },
        { status: 500 }
      );
    }

    const json = await safeJson<HubSpotSearchResponse>(res);

    const results = (json?.results ?? []).map((c) => {
      const props = c.properties ?? {};

      return {
        id: String(c.id),
        firstname: props.firstname ?? "",
        lastname: props.lastname ?? "",
        email: props.email ?? "",
        name: `${props.firstname ?? ""} ${props.lastname ?? ""}`.trim(),
      };
    });

    const nextAfter = json?.paging?.next?.after ?? null;

    return NextResponse.json({ ok: true, results, nextAfter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unhandled error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
