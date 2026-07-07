import { supabaseServer } from "@/lib/SupabaseServer";
import { graphFetch } from "@/lib/graph/graphFetch";

type GraphMessage = {
    id: string;
    conversationId: string;
    internetMessageId: string;
    webLink: string;
};

type Communication = {
    id: string;

    sender_email: string | null;
    recipient_email: string | null;

    subject: string | null;

    graph_message_id: string | null;
    graph_conversation_id: string | null;
    graph_web_link: string | null;
    graph_internet_message_id: string | null;

    created_at: string;
    sent_at: string | null;
};

export async function syncGraphCommunications() {
    const { data: communications, error } =
        await supabaseServer
            .from(
                "raise_subscription_communications"
            )
            .select(`
                id,
                sender_email,
                recipient_email,
                subject,
                graph_message_id,
                graph_conversation_id,
                graph_web_link,
                graph_internet_message_id,
                created_at,
                sent_at
            `)
            .is("graph_message_id", null);

    if (error) {
        throw error;
    }

    if (!communications?.length) {
        return;
    }

    for (const communication of communications) {
        await syncCommunication(
            communication as Communication
        );
    }
}

async function syncCommunication(
    communication: Communication
) {
    if (
        !communication.sender_email ||
        !communication.recipient_email
    ) {
        return;
    }

    const graphMessage =
    await findGraphMessage(
        communication
    );

console.log(
    "[GRAPH MATCH]",
    graphMessage
);
}

async function findGraphMessage(
    communication: Communication
): Promise<GraphMessage | null> {
    if (
        !communication.sender_email ||
        !communication.recipient_email
    ) {
        return null;
    }

    const messages = await graphFetch(
        `/users/${encodeURIComponent(
            communication.sender_email
        )}/messages?$top=25`
    );

    console.log(
        "[GRAPH MESSAGES]",
        messages
    );

    return null;
}