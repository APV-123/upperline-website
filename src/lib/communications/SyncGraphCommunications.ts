import { supabaseServer } from "@/lib/SupabaseServer";
import { graphFetch } from "@/lib/graph/graphFetch";

type GraphMessage = {
    id: string;
    conversationId: string;
    internetMessageId: string;
    webLink: string;

    subject: string;
    sentDateTime: string;

    toRecipients: {
        emailAddress: {
            address: string;
        };
    }[];
};

type Communication = {
    id: string;

    sender_email: string | null;
    recipient_email: string | null;
    direction: string |null;

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
                direction,
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
    console.log("[SYNCING]", {
    id: communication.id,
    sender: communication.sender_email,
    recipient: communication.recipient_email,
    subject: communication.subject,
});
    const graphMessage =
    await findGraphMessage(
        communication
    );

console.log(
    "[GRAPH MATCH]",
    graphMessage
);
if (!graphMessage) {
    return;
}

await supabaseServer
    .from("raise_subscription_communications")
    .update({
        graph_message_id:
            graphMessage.id,

        graph_conversation_id:
            graphMessage.conversationId,

        graph_web_link:
            graphMessage.webLink,

        graph_internet_message_id:
            graphMessage.internetMessageId,

        sync_status: "synced",

        last_synced_at:
            new Date().toISOString(),
    })
    .eq("id", communication.id);

console.log(
    "[GRAPH BACKFILLED]",
    communication.id
);
}
function isUpperline(
    email?: string | null
) {
    return (
        email
            ?.toLowerCase()
            .endsWith("@upperlineco.com") ?? false
    );
}
function normalizeSubject(
    subject: string
) {
    return subject
        .trim()
        .toLowerCase();
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

    const recipientAddresses =
    communication.recipient_email
        .split(";")
        .map((email) => email.trim());

const mailbox =
    isUpperline(communication.sender_email)
        ? communication.sender_email
        : recipientAddresses.find(isUpperline);

if (!mailbox) {
    return null;
}

console.log("[GRAPH MAILBOX]", mailbox);
const escapedSubject =
    (communication.subject ?? "")
        .replaceAll("'", "''");
if (!communication.subject) {
    return null;
}
const filter =
    encodeURIComponent(
        `subject eq '${escapedSubject}'`
    );

const messages = await graphFetch(
    `/users/${encodeURIComponent(mailbox)}/messages` +
    `?$filter=${filter}` +
    `&$select=id,conversationId,internetMessageId,webLink,subject,sentDateTime,toRecipients`
);

    console.log(
        "[GRAPH MESSAGES]",
        messages
    );
    const candidates =
    messages.value as GraphMessage[] | undefined;

    if (!candidates?.length) {
        return null;
    }
    const recipients =
    communication.recipient_email
        .split(";")
        .map((email) =>
            email.trim().toLowerCase()
        );
    console.log(
    "[EXPECTED RECIPIENTS]",
    recipients
);
    for (const message of candidates) {
    console.log(
        "[GRAPH RECIPIENTS]",
        message.subject,
        message.toRecipients.map(
            (r) => r.emailAddress.address
        )
    );
}

const match = candidates.find((message) =>
    normalizeSubject(message.subject) ===
        normalizeSubject(
            communication.subject ?? ""
        ) &&
    message.toRecipients.some((r) =>
        recipients.includes(
            r.emailAddress.address.toLowerCase()
        )
    )
);

    return match ?? null;
}