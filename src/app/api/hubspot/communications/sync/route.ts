import { NextResponse } from "next/server";
import { syncHubspotCommunications } from "@/lib/communications/SyncCommunications";

export async function POST() {
    try {
        const result =
            await syncHubspotCommunications(
                "UPLN_01_COLONY_LAKES"
            );

        return NextResponse.json(result);
    } catch (e: unknown) {
    console.error("[SYNC ERROR]", e);

    return NextResponse.json(
        {
            ok: false,
            type: typeof e,
            isError: e instanceof Error,
            value: e,
            stringified: JSON.stringify(e, null, 2),
            message:
                e instanceof Error
                    ? e.message
                    : null,
            stack:
                e instanceof Error
                    ? e.stack
                    : null,
        },
        {
            status: 500,
        }
    );


        return NextResponse.json(
            {
                ok: false,
                error: String(e),
            },
            {
                status: 500,
            }
        );
    }
}