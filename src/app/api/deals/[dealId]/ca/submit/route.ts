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
})
 {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_CA_FORM_ID;
  if (!portalId || !formId) {
    console.warn("[CA HUBSPOT] Missing HUBSPOT_PORTAL_ID or HUBSPOT_CA_FORM_ID");
    return;
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

  // IMPORTANT: HubSpot will drop unknown property names silently.
  // Ensure these custom properties exist in HubSpot:
  // source_detail, deal_id, deal_name, engagement_action, entry_point
  const fields: Array<{ name: string; value: string }> = [
  { name: "firstname", value: payload.firstname },
  { name: "lastname", value: payload.lastname },
  { name: "email", value: payload.email },

  ...(payload.company ? [{ name: "company", value: payload.company }] : []),
  ...(payload.jobtitle ? [{ name: "jobtitle", value: payload.jobtitle }] : []), // ✅
  ...(payload.phone ? [{ name: "phone", value: payload.phone }] : []),         // ✅

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
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[CA HUBSPOT] Submission failed:", res.status, text);
  }
}

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
  
  if (!firstname.trim() || !lastname.trim()) {
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
  // NOTE: For true de-dupe, add a unique constraint/index on (deal_id, email) in Supabase:
  // create unique index if not exists deal_ca_unique on deal_ca_acceptances (deal_id, email);
  const { error: caErr } = await supabaseServer
    .from("deal_ca_acceptances")
    
    .upsert(
    {
        deal_id: dealId,
        email,
        name,
        company: company || null,
        jobtitle: jobtitle || null,  // ✅ ADD
        phone: phone || null,        // ✅ ADD
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

  // 2) Pull memo path + deal name (for HubSpot logging + signing)
  const { data: deal, error: dealErr } = await supabaseServer
    .from("deals")
    .select("name, full_memo_url")
    .eq("id", dealId)
    .single<{ name: string; full_memo_url: string | null }>();

  if (dealErr || !deal?.full_memo_url) {
    return NextResponse.json({ ok: false, error: "Full memo not configured" }, { status: 404 });
  }

  // 3) HubSpot submission (non-blocking)
    submitToHubSpotForm({
    firstname,
    lastname,
    email,
    company: company || undefined,
    jobtitle: jobtitle || undefined, // ✅ ADD
    phone: phone || undefined,       // ✅ ADD
    deal_id: dealId,
    deal_name: deal.name,
    pageUri: referer ?? `https://portal.upperlineco.com/deals/${dealId}`,
    });

  // 4) Signed URL for private memo (10 minutes)
  const { data: signed, error: signErr } = await supabaseServer.storage
    .from("deal-documents-private")
    .createSignedUrl(deal.full_memo_url, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signErr?.message ?? "Failed to sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, signedUrl: signed.signedUrl });
}
