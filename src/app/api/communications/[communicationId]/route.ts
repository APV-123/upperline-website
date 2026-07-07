import { NextRequest, NextResponse } from "next/server";
import { getGraphAppToken } from "@/lib/graph/getGraphAppToken";
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

const accessToken =
    await getGraphAppToken();

if (!communication.graph_message_id) {
    return NextResponse.json({
    ok: true,

    communication,

    bodyHtml: communication.notes,

    graphWebLink:
        communication.graph_web_link,

    outlookReady: false,
});
}
const graphRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
        communication.sender_email!
    )}/messages/${communication.graph_message_id}?$select=body,bodyPreview,webLink`,
    {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer:
                'outlook.body-content-type="html"',
        },
        cache: "no-store",
    }
);

const graphJson = await graphRes.json();
console.log(
    "[GRAPH FETCH STATUS]",
    graphRes.status
);

console.log(
    "[GRAPH FETCH BODY]",
    JSON.stringify(graphJson, null, 2)
);
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

        graphWebLink:
            communication.graph_web_link,

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