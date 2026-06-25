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

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ emailId: string }>;
  }
) {
  try {
    const { emailId } = await params;

    const res = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/emails/${emailId}`,
      {
        headers: authHeaders(),
        cache: "no-store",
      }
    );

    const json = await res.json();

    return NextResponse.json(json, {
      status: res.status,
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
      { status: 500 }
    );
  }
}