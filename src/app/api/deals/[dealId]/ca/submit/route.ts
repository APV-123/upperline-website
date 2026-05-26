import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/SupabaseServer";

type Params = { dealId: string };

type Body = {
  firstname?: unknown;
  lastname?: unknown;
  email?: unknown;
  company?: unknown;
  jobtitle?: unknown;
  phone?: unknown;
};

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

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
  const raw = await res.text();
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

async function submitToHubSpotForm(payload: {
  firstname: string;
  lastname: string;
  email: string;
  company?: string;
  jobtitle?: string;
  phone?: string;
  deal_id: string;
  deal_name?: string;
  pageUri?: string;
}) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_CA_FORM_ID;
  if (!portalId || !formId) {
    console.warn("[CA HUBSPOT] Missing HUBSPOT_PORTAL_ID or HUBSPOT_CA_FORM_ID");
    return;
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

  const fields: Array<{ name: string; value: string }> = [
    { name: "firstname", value: payload.firstname },
    { name: "lastname", value: payload.lastname },
    { name: "email", value: payload.email },

    ...(payload.company ? [{ name: "company", value: payload.company }] : []),
    ...(payload.jobtitle ? [{ name: "jobtitle", value: payload.jobtitle }] : []),
    ...(payload.phone ? [{ name: "phone", value: payload.phone }] : []),

    { name: "source_detail", value: "CA → Full Memo Access" },
    { name: "deal_id", value: payload.deal_id },
    ...(payload.deal_name ? [{ name: "deal_name", value: payload.deal_name }] : []),
    { name: "engagement_action", value: "Signed CA" },
    { name: "entry_point", value: "Portal Deal Page" },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields,
      context: {
        pageUri: payload.pageUri ?? "https://portal.upperlineco.com",
        pageName: "Deal CA Access",
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[CA HUBSPOT] Submission failed:", res.status, text);
  }
}

async function findHubSpotContactIdByEmail(email: string): Promise<string | null> {
  const token = getHubSpotToken();
  if (!token) {
    console.warn("[CA HUBSPOT] Missing HUBSPOT_PRIVATE_APP_TOKEN for contact search");
    return null;
  }

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: hsHeaders("POST"),
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email"],
      limit: 1,
    }),
    cache: "no-store",
  });

  const read = await readJsonOrText<{ results?: Array<{ id: string }> }>(res);

  if (!read.ok) {
    console.error("[CA HUBSPOT CONTACT SEARCH FAILED]", read.status, read.raw.slice(0, 500));
    return null;
  }

  return read.json?.results?.[0]?.id ?? null;
}

async function findHubSpotContactIdByEmailWithRetry(email: string): Promise<string | null> {
  // HubSpot Forms can be a little laggy before the contact is visible in CRM search
  for (let i = 0; i < 3; i++) {
    const contactId = await findHubSpotContactIdByEmail(email);
    if (contactId) return contactId;

    // short retry delay
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return null;
}

type ExistingInvestorResponse = {
  ok?: boolean;
  investors?: Array<{
    contactId?: string | null;
  }>;
};

export async function POST(req: Request, context: { params: Promise<Params> }) {
  const { dealId } = await context.params;

  const body = (await req.json().catch(() => ({}))) as Body;
  const firstname = cleanText(body.firstname);
  const lastname = cleanText(body.lastname);
  const name = [firstname, lastname].filter(Boolean).join(" ");
  const email = cleanText(body.email).toLowerCase();
  const company = cleanText(body.company);
  const jobtitle = cleanText(body.jobtitle);
  const phone = cleanText(body.phone);

  if (!dealId) {
    return NextResponse.json({ ok: false, error: "Missing dealId" }, { status: 400 });
  }

  if (!firstname || !lastname) {
    return NextResponse.json(
      { ok: false, error: "First and last name required" },
      { status: 400 }
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const referer = req.headers.get("referer") ?? null;

  // 1) Record acceptance in Supabase (idempotent)
  const { error: caErr } = await supabaseServer
    .from("deal_ca_acceptances")
    .upsert(
      {
        deal_id: dealId,
        email,
        name,
        company: company || null,
        jobtitle: jobtitle || null,
        phone: phone || null,
        ip,
        user_agent: userAgent,
      },
      {
        onConflict: "deal_id,email",
      }
    );

  if (caErr) {
    return NextResponse.json({ ok: false, error: caErr.message }, { status: 500 });
  }

  // 2) Pull deal metadata needed for sync + signing
  const { data: deal, error: dealErr } = await supabaseServer
    .from("deals")
    .select("name, full_memo_url, raise_id")
    .eq("id", dealId)
    .single<{ name: string; full_memo_url: string | null; raise_id: string | null }>();

  if (dealErr || !deal?.full_memo_url) {
    return NextResponse.json({ ok: false, error: "Full memo not configured" }, { status: 404 });
  }

  // 3) Signed URL stays on the critical path
  const { data: signed, error: signErr } = await supabaseServer.storage
    .from("deal-documents-private")
    .createSignedUrl(deal.full_memo_url, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signErr?.message ?? "Failed to sign URL" },
      { status: 500 }
    );
  }

  // 4) Best-effort sync path (should not block memo access)
  const syncWarnings: string[] = [];

  try {
    // 4a) Submit to HubSpot form first (awaited on purpose)
    await submitToHubSpotForm({
      firstname,
      lastname,
      email,
      company: company || undefined,
      jobtitle: jobtitle || undefined,
      phone: phone || undefined,
      deal_id: dealId,
      deal_name: deal.name,
      pageUri: referer ?? `https://portal.upperlineco.com/deals/${dealId}`,
    });

    if (!deal.raise_id) {
      syncWarnings.push("Missing raise_id on deal; skipped raise sync");
    } else {
      // 4b) find HubSpot contact by email
      const contactId = await findHubSpotContactIdByEmailWithRetry(email);

      if (!contactId) {
        syncWarnings.push("HubSpot contact not found after CA submission");
      } else {
        // 4c) upsert subscription directly
        const { error: subErr } = await supabaseServer
          .from("raise_subscriptions")
          .upsert(
            {
              raise_id: deal.raise_id,
              contact_id: String(contactId),
              contact_name: name || null,
              contact_email: email,
              status: "subscribed",
              // deal has effectively been sent already
              invite_status: "invited",
              invited_at: new Date().toISOString(),
            },
            {
              onConflict: "raise_id,contact_id",
            }
          );

        if (subErr) {
          console.error("[CA SUBSCRIPTION UPSERT FAILED]", subErr);
          syncWarnings.push(`Subscription upsert failed: ${subErr.message}`);
        }

        // 4d) guard against creating duplicate HubSpot investor deals
        const origin = new URL(req.url).origin;

        const existingInvestorsRes = await fetch(
          `${origin}/api/hubspot/raises/${deal.raise_id}`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const existingInvestorsRead =
          await readJsonOrText<ExistingInvestorResponse>(existingInvestorsRes);

        const alreadyExists =
          existingInvestorsRead.ok &&
          (existingInvestorsRead.json?.investors ?? []).some(
            (inv) => String(inv.contactId ?? "") === String(contactId)
          );

        if (!alreadyExists) {
          const addInvestorRes = await fetch(
            `${origin}/api/hubspot/raises/${deal.raise_id}/add-investor`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                accept: "application/json",
              },
              body: JSON.stringify({
                contactId,
                stageOverride:
                  process.env.HUBSPOT_DOCS_STAGE_ID ?? "REPLACE_WITH_REAL_DOCS_STAGE_ID",
              }),
              cache: "no-store",
            }
          );

          const addInvestorRead = await readJsonOrText<unknown>(addInvestorRes);

          if (!addInvestorRead.ok) {
            console.error(
              "[CA ADD INVESTOR FAILED]",
              addInvestorRead.status,
              addInvestorRead.raw.slice(0, 500)
            );
            syncWarnings.push(
              `HubSpot deal creation failed (${addInvestorRead.status})`
            );
          }
        }
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown sync error";
    console.error("[CA SYNC ERROR]", message);
    syncWarnings.push(message);
  }

  return NextResponse.json({
    ok: true,
    signedUrl: signed.signedUrl,
    ...(syncWarnings.length ? { syncWarnings } : {}),
  });
}