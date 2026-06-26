import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/SupabaseServer";
import { syncHubspotCommunications } from "@/lib/communications/SyncCommunications";

export async function GET(
    request: Request
) {
    const { searchParams } =
        new URL(request.url);

    if (
        searchParams.get("secret") !==
        process.env.CRON_SECRET
    ) {
        return NextResponse.json(
            {
                ok: false,
                error: "Unauthorized",
            },
            {
                status: 401,
            }
        );
    }

    try {
        const { data: deals, error } =
            await supabaseServer
                .from("deals")
                .select("raise_id")
                .eq("is_archived", false)
                .not("raise_id", "is", null);

        if (error) {
            throw new Error(error.message);
        }

        const raiseIds =
            deals?.map((d) => d.raise_id) ?? [];

        const results = [];

        for (const raiseId of raiseIds) {
            console.log(
                `[CRON] Syncing ${raiseId}`
            );

            try {
                const result =
                    await syncHubspotCommunications(
                        raiseId
                    );

                results.push({
                    raiseId,
                    ok: true,
                    ...result,
                });
            } catch (e) {
                console.error(
                    `[SYNC FAILED] ${raiseId}`,
                    e
                );

                results.push({
                    raiseId,
                    ok: false,
                    error:
                        e instanceof Error
                            ? e.message
                            : String(e),
                });
            }
        }

        const successful =
            results.filter(
                (r) => r.ok
            ).length;

        const failed =
            results.length - successful;

        return NextResponse.json({
            ok: true,
            raisesProcessed:
                results.length,
            successful,
            failed,
            results,
            completedAt:
                new Date().toISOString(),
        });
    } catch (e) {
        console.error(
            "[CRON SYNC ERROR]",
            e
        );

        return NextResponse.json(
            {
                ok: false,
                message:
                    e instanceof Error
                        ? e.message
                        : String(e),
                stack:
                    e instanceof Error
                        ? e.stack
                        : undefined,
            },
            {
                status: 500,
            }
        );
    }
}