
import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/SupabaseServer';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

const HUBSPOT_BASE = "https://api.hubapi.com";

type Params = { contactId: string };

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

// Cache association type IDs so we only look them up once per server instance
let NOTE_TO_CONTACT_TYPE_ID: number | null = null;
let NOTE_TO_DEAL_TYPE_ID: number | null = null;

type AssocLabel = {
  category: string; // "HUBSPOT_DEFINED" | "USER_DEFINED"
  typeId: number;
  label: string | null;
};

type AssocLabelsResponse = {
  results: AssocLabel[];
};

type NoteCreateResponse = {
  id?: string;
};

type CreateNoteAssociation = {
  to: { id: string };
  types: Array<{
    associationCategory: "HUBSPOT_DEFINED";
    associationTypeId: number;
  }>;
};

async function getHubSpotDefinedUnlabeledTypeId(
  from: string,
  to: string
): Promise<number> {
  const token = getHubSpotToken();
  if (!token) {
    throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");
  }

  const res = await fetch(
    `${HUBSPOT_BASE}/crm/associations/v4/${from}/${to}/labels`,
    {
      method: "GET",
      headers: authHeaders("GET"),
      cache: "no-store",
    }
  );

  const read = await readJsonOrText<AssocLabelsResponse>(res);

  if (!read.ok || !read.json) {
    throw new Error(
      `Failed to fetch association labels for ${from}->${to}: ${read.status} ${read.raw.slice(
        0,
        300
      )}`
    );
  }

  const unlabeled = read.json.results.find(
    (r) =>
      r.category === "HUBSPOT_DEFINED" && (r.label === null || r.label === "")
  );

  if (!unlabeled) {
    throw new Error(
      `No HUBSPOT_DEFINED unlabeled association type found for ${from}->${to}`
    );
  }

  return unlabeled.typeId;
}

type NoteRequestBody = {
  body?: unknown;
  dealId?: unknown;
  raiseSubscriptionId?: unknown;
};

export async function POST(
  req: NextRequest,
  context: { params: Params | Promise<Params> }
) {
  const { contactId } = await context.params;
  const sessionToken = await getToken({
  req,
  secret: process.env.NEXTAUTH_SECRET,
});

const employeeEmail =
  typeof sessionToken?.email === 'string'
    ? sessionToken.email
    : null;

  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing HUBSPOT_PRIVATE_APP_TOKEN" },
      { status: 500 }
    );
  }

  try {
    const payload = (await req.json()) as NoteRequestBody;

    const body =
      typeof payload.body === "string" ? payload.body.trim() : "";

    const dealId =
      typeof payload.dealId === "string" || typeof payload.dealId === "number"
        ? String(payload.dealId)
        : null;

    const raiseSubscriptionId =
      typeof payload.raiseSubscriptionId === 'string'
        ? payload.raiseSubscriptionId
        : null;

    if (!contactId) {
      return NextResponse.json(
        { ok: false, error: "Missing contactId" },
        { status: 400 }
      );
    }

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Missing note body" },
        { status: 400 }
      );
    }

    // Resolve association type IDs once
    if (NOTE_TO_CONTACT_TYPE_ID == null) {
      NOTE_TO_CONTACT_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId(
        "notes",
        "contacts"
      );
    }

    if (dealId && NOTE_TO_DEAL_TYPE_ID == null) {
      NOTE_TO_DEAL_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId(
        "notes",
        "deals"
      );
    }

    const associations: CreateNoteAssociation[] = [
      {
        to: { id: String(contactId) },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: NOTE_TO_CONTACT_TYPE_ID,
          },
        ],
      },
    ];

    if (dealId) {
      if (NOTE_TO_DEAL_TYPE_ID == null) {
        return NextResponse.json(
          { ok: false, error: "NOTE_TO_DEAL_TYPE_ID not resolved" },
          { status: 500 }
        );
      }

      associations.push({
        to: { id: dealId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: NOTE_TO_DEAL_TYPE_ID,
          },
        ],
      });
    }

    // Create note (v3 Notes API)
    const createRes = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/notes`, {
      method: "POST",
      headers: authHeaders("POST"),
      body: JSON.stringify({
        properties: {
          hs_note_body: body,
          // HubSpot commonly accepts ms timestamps; this is safest
          hs_timestamp: Date.now(),
        },
        associations,
      }),
      cache: "no-store",
    });

    const createRead = await readJsonOrText<NoteCreateResponse>(createRes);

    if (!createRead.ok) {
      console.error(
        "[NOTE CREATE FAILED]",
        createRead.status,
        createRead.raw.slice(0, 600)
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Note create failed",
          status: createRead.status,
          details: createRead.raw.slice(0, 600),
        },
        { status: 502 }
      );
    }
    if (raiseSubscriptionId) {
  const { error: activityError } =
    await supabaseServer
      .from('raise_subscription_activity')
      .insert({
        raise_subscription_id:
          raiseSubscriptionId,

        activity_type: 'note_added',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          deal_id: dealId,
          note_id:
            createRead.json?.id ?? null,
        },
      });

  if (activityError) {
    console.error(
      '[NOTE ACTIVITY ERROR]',
      activityError
    );
  }
}

    return NextResponse.json({ ok: true, noteId: createRead.json?.id ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[NOTE ROUTE ERROR]", message);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
