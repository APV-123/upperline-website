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
          limit: 25,
          properties: [
            "hs_email_subject",
            "hs_email_to_email",
            "hs_email_from_email",
            "hs_email_headers",
            "hs_email_open_count",
            "hs_email_click_count",
            "hs_timestamp",
          ],
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_email_headers",
                  operator: "CONTAINS_TOKEN",
                  value: "243869924@bcc.na2.hubspot.com",
                },
              ],
            },
          ],
        }),
      }
    );

    const json = await res.json();

return NextResponse.json(
  {
    ok: res.ok,
    status: res.status,
    response: json,
  },
  {
    status: res.status,
  }
);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}