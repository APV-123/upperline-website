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
    raise_subscription_id: string;

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
                raise_subscription_id,
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
const { data: existingConversation } =
    await supabaseServer
        .from("raise_subscription_communications")
        .select("graph_conversation_id")
        .eq(
            "raise_subscription_id",
            communication.raise_subscription_id
        )
        .neq("id", communication.id)
        .not("graph_conversation_id", "is", null)
        .limit(1)
        .maybeSingle();
console.log(
    "[KNOWN CONVERSATION]",
    existingConversation?.graph_conversation_id
);        
console.log("[GRAPH MAILBOX]", mailbox);

if (!communication.subject) {
    return null;
}
const communicationTime =
    communication.sent_at
        ? new Date(communication.sent_at)
        : new Date(communication.created_at);

const start =
    new Date(
        communicationTime.getTime() -
        10 * 60 * 1000
    ).toISOString();

const end =
    new Date(
        communicationTime.getTime() +
        10 * 60 * 1000
    ).toISOString();

const filter = existingConversation?.graph_conversation_id
    ? encodeURIComponent(
          `conversationId eq '${existingConversation.graph_conversation_id}'`
      )
    : encodeURIComponent(
          `sentDateTime ge ${start} and sentDateTime le ${end}`
      );

let messages;

if (existingConversation?.graph_conversation_id) {
    console.log(
        "[SEARCH STRATEGY]",
        "conversation"
    );

    const conversationFilter =
        encodeURIComponent(
            `conversationId eq '${existingConversation.graph_conversation_id}'`
        );

    messages = await graphFetch(
        `/users/${encodeURIComponent(mailbox)}/messages` +
        `?$filter=${conversationFilter}` +
        `&$select=id,conversationId,internetMessageId,webLink,subject,sentDateTime,toRecipients`
    );
} else {
    console.log(
        "[SEARCH STRATEGY]",
        "subject"
    );

    messages = await graphFetch(
        `/users/${encodeURIComponent(mailbox)}/messages` +
        `?$filter=${filter}` +
        `&$select=id,conversationId,internetMessageId,webLink,subject,sentDateTime,toRecipients`
    );
}

    console.log(
        "[GRAPH MESSAGES]",
        messages
    );
    const candidates =
    messages.value as GraphMessage[] | undefined;

    
    
    console.log(
        "[GRAPH CANDIDATE COUNT]",
        candidates?.length ?? 0
    );

    if (!candidates?.length) {
        console.log(
            "[NO GRAPH CANDIDATES]",
            {
                mailbox,
                subject: communication.subject,
            }
        );
        return null;
    }
    const recipients =
    communication.recipient_email
        .split(";")
        .map((email) =>
            email.trim().toLowerCase()
        );

    const communicationSent =
    communication.sent_at
        ? new Date(communication.sent_at).getTime()
        : null;

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

let bestMatch: GraphMessage | null = null;
let bestScore = -1;

for (const message of candidates) {
    let score = 0;

    const recipientMatch =
        message.toRecipients.some((r) =>
            recipients.includes(
                r.emailAddress.address.toLowerCase()
            )
        );

    if (recipientMatch) {
        score += 100;
    }

    const subjectMatch =
        normalizeSubject(message.subject) ===
        normalizeSubject(
            communication.subject ?? ""
        );

    if (subjectMatch) {
        score += 50;
    }

    if (communicationSent) {
        const deltaMinutes =
            Math.abs(
                new Date(
                    message.sentDateTime
                ).getTime() -
                    communicationSent
            ) /
            60000;

        console.log(
            "[TIME DELTA]",
            deltaMinutes
        );

        if (deltaMinutes <= 1) {
            score += 40;
        } else if (deltaMinutes <= 5) {
            score += 20;
        } else if (deltaMinutes <= 30) {
            score += 10;
        }
    }

    console.log("[GRAPH SCORE]", {
        subject: message.subject,
        score,
    });

    if (score > bestScore) {
        bestScore = score;
        bestMatch = message;
    }
}

console.log("[BEST SCORE]", bestScore);

if (bestScore < 150) {
    return null;
}

return bestMatch;
}