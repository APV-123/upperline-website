// app/api/tap/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const FORM_GUID = process.env.HUBSPOT_FORM_GUID;
const PRIVATE_APP_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

// Basic honeypot
const isBot = (v: string | undefined) => (v ?? "").trim().length > 0;

// Email validation regex
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function POST(req: NextRequest) {
  try {
    if (!PORTAL_ID || !FORM_GUID || !PRIVATE_APP_TOKEN) {
      console.error("Missing HubSpot environment variables");
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

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
      website,
    } = body || {};

    if (isBot(website)) {
      return NextResponse.json({ ok: true, spam: true });
    }

    if (!email || !isValidEmail(email) || !firstname || !lastname) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing required fields" },
        { status: 400 }
      );
    }

    const payload = {
      fields: [
        { name: "firstname", value: firstname.trim() },
        { name: "lastname", value: lastname.trim() },
        { name: "company", value: company.trim() },
        { name: "jobtitle", value: jobtitle.trim() },
        { name: "email", value: email.trim() },
        { name: "phone", value: phone.trim() },
        { name: "met_with", value: met_with.trim() },
      ],
      context: {
        hutk,
        pageUri: pageUrl,
        pageName,
      },
    };

    const hsRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PRIVATE_APP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!hsRes.ok) {
      const errText = await hsRes.text();
      console.error("HubSpot API error:", errText);
      return NextResponse.json(
        { ok: false, error: "HubSpot submission failed", details: errText },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Server error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}