// app/api/tap/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const FORM_GUID = process.env.HUBSPOT_FORM_GUID;
const PRIVATE_APP_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

const isBot = (v: string | undefined) => (v ?? "").trim().length > 0;
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const maybe = (name: string, value?: string) =>
  value && value.trim() ? [{ name, value: value.trim() }] : [];

export async function POST(req: NextRequest) {
  // Check envs precisely
  const missing = [
    !PRIVATE_APP_TOKEN && "HUBSPOT_PRIVATE_APP_TOKEN",
    !PORTAL_ID && "HUBSPOT_PORTAL_ID",
    !FORM_GUID && "HUBSPOT_FORM_GUID",
  ].filter(Boolean) as string[];

  if (missing.length) {
    console.error("Missing env:", missing.join(", "));
    return NextResponse.json(
      { ok: false, error: `Server configuration error: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const {
      firstname = "",
      lastname = "",
      company = "",
      jobtitle = "",
      email = "",
      phone = "",
      met_with = "",
      source_detail = "Tap → Networking Event",
      utm_source = "",
      utm_medium = "",
      utm_campaign = "",
      utm_content = "",
      utm_term = "",
      hutk = "",
      pageUrl = "",
      pageName = "Upperline Tap Contact",
      website, // honeypot
    } = body || {};

    // Honeypot
    if (isBot(website)) return NextResponse.json({ ok: true, spam: true });

    // Required fields
    if (!email || !isValidEmail(email) || !firstname || !lastname) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing required fields" },
        { status: 400 }
      );
    }

    // Pull HubSpot cookie + IP when available (omit hutk if empty)
    const hutkCookie =
      req.cookies.get("hubspotutk")?.value || hutk || ""; // prefer cookie, then body, else ""
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    const fields = [
      { name: "firstname", value: firstname.trim() },
      { name: "lastname", value: lastname.trim() },
      { name: "company", value: company.trim() },
      { name: "jobtitle", value: jobtitle.trim() },
      { name: "email", value: email.trim() },
      { name: "phone", value: phone.trim() },
      { name: "met_with", value: met_with.trim() },
      { name: "source_detail", value: source_detail.trim() },
      ...maybe("utm_source", utm_source),
      ...maybe("utm_medium", utm_medium),
      ...maybe("utm_campaign", utm_campaign),
      ...maybe("utm_content", utm_content),
      ...maybe("utm_term", utm_term),
    ];

    const context: Record<string, string> = {
      pageUri: pageUrl,
      pageName,
    };
    if (hutkCookie) context.hutk = hutkCookie; // only include if truthy
    if (ipAddress) context.ipAddress = ipAddress;

    const payload = { fields, context };

    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`;

    const hsRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRIVATE_APP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = hsRes.headers.get("content-type") || "";
    const hsBody = contentType.includes("application/json")
      ? await hsRes.json()
      : await hsRes.text();

    if (!hsRes.ok) {
      console.error("HubSpot API error:", hsRes.status, hsBody);
      return NextResponse.json(
        { ok: false, error: "HubSpot submission failed", details: hsBody },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: hsBody });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Server error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
