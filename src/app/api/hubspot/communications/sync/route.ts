import { NextResponse } from "next/server";
import { syncHubspotCommunications } from "@/lib/communications/SyncCommunications";

export async function POST() {
    try {
        const result =
            await syncHubspotCommunications(
                "UPLN_01_COLONY_LAKES"
            );

        return NextResponse.json(result);
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