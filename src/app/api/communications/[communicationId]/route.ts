import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseServer } from "@/lib/SupabaseServer";

type Params = {
    communicationId: string;
};

export async function GET(
    req: NextRequest,
    context: {
        params: Params | Promise<Params>;
    }
) {
    const { communicationId } =
        await context.params;

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        return NextResponse.json(
            {
                ok: false,
                error: "Unauthorized",
            },
            { status: 401 }
        );
    }

    const { data: communication, error } =
    await supabaseServer
        .from("raise_subscription_communications")
        .select(`
            id,
            graph_message_id,
            graph_conversation_id,
            graph_web_link,
            graph_internet_message_id,
            sender_email,
            recipient_email,
            subject,
            notes
        `)
        .eq("id", communicationId)
        .single();

if (error || !communication) {
    return NextResponse.json(
        {
            ok: false,
            error: "Communication not found",
        },
        { status: 404 }
    );
}
const accessToken = (
    token as {
        accessToken?: string;
    }
).accessToken;

if (!accessToken) {
    return NextResponse.json(
        {
            ok: false,
            error: "Missing Graph token",
        },
        { status: 401 }
    );
}
if (!communication.graph_message_id) {
    return NextResponse.json({
        ok: true,
        communication,
        bodyHtml: communication.notes,
        outlookReady: false,
    });
}
const graphRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${communication.graph_message_id}`,
    {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
    }
);

const graphJson = await graphRes.json();
if (!graphRes.ok) {
    console.error(
        "[GRAPH GET MESSAGE]",
        graphJson
    );

    return NextResponse.json({
        ok: true,

        communication,

        bodyHtml:
            communication.notes,

        outlookReady: false,
    });
}
return NextResponse.json({
    ok: true,

    communication,

    bodyHtml:
        graphJson.body?.content ??
        communication.notes,

    bodyPreview:
        graphJson.bodyPreview ?? null,

    graphMessageId:
        communication.graph_message_id,

    graphWebLink:
        communication.graph_web_link,

    outlookReady: true,
});

}