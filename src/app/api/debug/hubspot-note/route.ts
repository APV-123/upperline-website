import { NextResponse } from "next/server";

function token() {
    return (
        process.env.HUBSPOT_PRIVATE_APP_TOKEN ??
        process.env.HUBSPOT_LEGACY_PRIVATE_APP_TOKEN
    );
}

export async function GET() {
    const noteId = "381070734045";

    const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_createdate,hs_timestamp`,
        {
            headers: {
                Authorization: `Bearer ${token()}`,
                Accept: "application/json",
            },
            cache: "no-store",
        }
    );

    const text = await res.text();

    return NextResponse.json({
        status: res.status,
        body: text,
    });
}