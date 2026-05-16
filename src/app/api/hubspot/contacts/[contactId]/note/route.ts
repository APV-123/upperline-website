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

// Cache association type IDs so we only look them up once per server instance
let NOTE_TO_CONTACT_TYPE_ID: number | null = null;
let NOTE_TO_DEAL_TYPE_ID: number | null = null;

type AssocLabel = {
  category: string; // e.g. "HUBSPOT_DEFINED" | "USER_DEFINED"
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

async function getHubSpotDefinedUnlabeledTypeId(from: string, to: string): Promise<number> {
  const res = await fetch(`${HUBSPOT_BASE}/crm/associations/v4/${from}/${to}/labels`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  const json = await safeJson<AssocLabelsResponse>(res);

  if (!res.ok || !json) {
    const fallbackText = !json ? await res.text().catch(() => "") : "";
    throw new Error(
      `Failed to fetch association labels for ${from}->${to}: ${fallbackText || res.status}`
    );
  }

  const unlabeled = json.results.find(
    (r) => r.category === "HUBSPOT_DEFINED" && (r.label === null || r.label === "")
  );

  if (!unlabeled) {
    throw new Error(`No HUBSPOT_DEFINED unlabeled association type found for ${from}->${to}`);
  }

  return unlabeled.typeId;
}

type NoteRequestBody = {
  body?: unknown;
  dealId?: unknown;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;

    const payload = (await req.json()) as NoteRequestBody;
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    const dealId = typeof payload.dealId === "string" || typeof payload.dealId === "number"
      ? String(payload.dealId)
      : null;

    if (!contactId) {
      return NextResponse.json({ ok: false, error: "Missing contactId" }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ ok: false, error: "Missing note body" }, { status: 400 });
    }

    // Resolve association type IDs once (portal-specific) using labels endpoint.
    if (NOTE_TO_CONTACT_TYPE_ID == null) {
      NOTE_TO_CONTACT_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId("notes", "contacts");
    }

    if (dealId && NOTE_TO_DEAL_TYPE_ID == null) {
      NOTE_TO_DEAL_TYPE_ID = await getHubSpotDefinedUnlabeledTypeId("notes", "deals");
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
        // Defensive: should never happen, but avoids non-null assertions.
        throw new Error("NOTE_TO_DEAL_TYPE_ID not resolved");
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
      headers: authHeaders(),
      body: JSON.stringify({
        properties: {
          hs_note_body: body,
          hs_timestamp: new Date().toISOString(),
        },
        associations,
      }),
    });

    const createJson = await safeJson<NoteCreateResponse>(createRes);

    if (!createRes.ok) {
      const fallbackText = !createJson ? await createRes.text().catch(() => "") : "";
      console.error("[NOTE CREATE FAILED]", createRes.status, createJson ?? fallbackText);
      return NextResponse.json(
        { ok: false, error: createJson ?? fallbackText ?? "Note create failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, noteId: createJson?.id ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[NOTE ROUTE ERROR]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}