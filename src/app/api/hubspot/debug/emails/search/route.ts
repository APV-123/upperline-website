import { NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  if (!token) {
    throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  try {
    const res = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/emails/search`,
      {
        method: "POST",
        headers: authHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          limit: 250,
          properties: [
            "hs_timestamp",
            "hs_createdate",
            "hs_email_subject",
            "hs_email_text",
            "hs_email_status",
            "hs_email_direction",
            "hs_email_headers",
            "hs_email_from_email",
            "hs_email_to_email",
            "hs_email_cc_email",
            "hs_email_bcc_email",
            "hs_email_open_count",
            "hs_email_click_count",
          ],
          sorts: [
            {
              propertyName: "hs_timestamp",
              direction: "DESCENDING",
            },
          ],
        }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          response: json,
        },
        {
          status: res.status,
        }
      );
    }

    const emails = (json.results ?? []).map((email: any) => {
      const p = email.properties ?? {};

      const headers =
        p.hs_email_headers ?? "";

      return {
        id: email.id,

        subject:
          p.hs_email_subject ?? null,

        from:
          p.hs_email_from_email ??
          null,

        to:
          p.hs_email_to_email ??
          null,

        opens: Number(
          p.hs_email_open_count ?? 0
        ),

        clicks: Number(
          p.hs_email_click_count ?? 0
        ),

        timestamp:
          p.hs_timestamp ??
          p.hs_createdate,

        hasHubSpotBcc:
          headers.includes(
            "243869924@bcc.na2.hubspot.com"
          ),

        direction:
          p.hs_email_direction ??
          null,
      };
    });

    const withBcc = emails.filter(
      (e: any) => e.hasHubSpotBcc
    );

    return NextResponse.json({
      ok: true,

      totalEmails:
        emails.length,

      emailsWithBcc:
        withBcc.length,

      uniqueSenders: [
        ...new Set(
          emails.map(
            (e: any) => e.from
          )
        ),
      ],

      matchingEmails: withBcc,

      sample: emails.slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}