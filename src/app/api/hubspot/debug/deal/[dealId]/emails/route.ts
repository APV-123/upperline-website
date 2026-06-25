import { NextResponse } from "next/server";

type DealAssociations = {
    associations?: Record<
        string,
        {
            results?: Array<{
                id: string | number;
            }>;
        }
    >;
};

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

async function hubspotGet<T>(
    path: string
): Promise<T> {
    const res = await fetch(
        `${HUBSPOT_BASE}${path}`,
        {
            headers: authHeaders(),
            cache: "no-store",
        }
    );

    const json = await res.json();

    if (!res.ok) {
        throw new Error(
            JSON.stringify(json)
        );
    }

    return json as T;
}

function assocIds(
    obj: DealAssociations,
    key: string
): string[] {
    return (
        obj.associations?.[key]?.results ?? []
    )
        .map((r) => String(r.id))
        .filter(Boolean);
}

export async function GET(
    _req: Request,
    {
        params,
    }: {
        params: Promise<{
            dealId: string;
        }>;
    }
) {
    try {
        const { dealId } =
            await params;

        const assocQuery =
            "?associations=emails";

        const deal =
            await hubspotGet<DealAssociations>(
                `/crm/v3/objects/deals/${dealId}${assocQuery}`
            );

        const emailIds = assocIds(
            deal,
            "emails"
        );

        return NextResponse.json({
            ok: true,
            dealId,
            emailCount:
                emailIds.length,
            emailIds,
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