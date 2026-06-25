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

        if (e instanceof Error) {
            return NextResponse.json(
                {
                    ok: false,
                    message: e.message,
                    stack: e.stack,
                },
                {
                    status: 500,
                }
            );
        }

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