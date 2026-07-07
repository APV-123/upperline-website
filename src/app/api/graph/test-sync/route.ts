import { NextResponse } from "next/server";
import { syncGraphCommunications } from "@/lib/communications/SyncGraphCommunications";

export async function GET() {
    await syncGraphCommunications();

    return NextResponse.json({
        ok: true,
    });
}