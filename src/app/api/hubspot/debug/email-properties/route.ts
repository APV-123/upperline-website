import { NextResponse } from "next/server";

const HUBSPOT_BASE =
    "https://api.hubapi.com";

function authHeaders() {
    const token =
        process.env
            .HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
        throw new Error(
            "Missing HUBSPOT_PRIVATE_APP_TOKEN"
        );
    }

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type":
            "application/json",
    };
}

export async function GET() {
    try {
        const res = await fetch(
            `${HUBSPOT_BASE}/crm/v3/properties/emails`,
            {
                headers: authHeaders(),
                cache: "no-store",
            }
        );

        const json =
            await res.json();

        if (!res.ok) {
            return NextResponse.json(
                json,
                {
                    status: res.status,
                }
            );
        }

        const properties =
            (json.results ?? []).map(
                (
                    p: {
                        name: string;
                        label: string;
                        type: string;
                        fieldType: string;
                        description?: string;
                    }
                ) => ({
                    name: p.name,
                    label: p.label,
                    type: p.type,
                    fieldType:
                        p.fieldType,
                    description:
                        p.description,
                })
            );

        return NextResponse.json({
            count:
                properties.length,
            properties,
        });
    } catch (e: unknown) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    e instanceof Error
                        ? e.message
                        : String(e),
            },
            {
                status: 500,
            }
        );
    }
}