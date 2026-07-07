import { NextResponse } from "next/server";
import { getGraphAppToken } from "@/lib/graph/getGraphAppToken";

export async function GET() {
    const token =
        await getGraphAppToken();

    const res = await fetch(
        "https://graph.microsoft.com/v1.0/users",
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    const json = await res.json();

    return NextResponse.json(json);
}