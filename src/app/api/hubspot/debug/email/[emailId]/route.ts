import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

function authHeaders() {
    const token =
        process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
        throw new Error(
            "Missing HUBSPOT_PRIVATE_APP_TOKEN"
        );
    }

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

export async function GET(
    _req: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            emailId: string;
        }>;
    }
) {
    const { emailId } = await params;

    const url =
        `${HUBSPOT_BASE}` +
        `/crm/objects/2026-03/emails/${emailId}` +
        `?properties=` +
        [
            "hs_email_open_count",
            "hs_email_click_count",
            "hs_email_reply_count",
            "hs_unique_tracker_key",
            "hs_email_send_event_id",
            "hs_email_status",
            "hs_email_post_send_status",
        ].join(",") +
        "&propertiesWithHistory=" +
        [
            "hs_email_open_count",
            "hs_email_click_count",
            "hs_email_reply_count",
        ].join(",");

    const res = await fetch(url, {
        headers: authHeaders(),
        cache: "no-store",
    });

    const json = await res.json();

    return NextResponse.json(json, {
        status: res.status,
    });
}