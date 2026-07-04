import { supabaseServer } from "@/lib/SupabaseServer";

type RaiseSubscription = {
    id: string;
    contact_email: string | null;
    contact_name: string | null;
};

type HubSpotEmail = {
    id: string;

    properties: {
        hs_timestamp?: string;
        hs_createdate?: string;
        hs_email_subject?: string;
        hs_email_text?: string;
        hs_email_status?: string;
        hs_email_direction?:
            | "EMAIL"
            | "INCOMING_EMAIL";
        hs_email_headers?: string;
        hs_email_from_email?: string;
        hs_email_to_email?: string;
        hs_email_open_count?: string;
        hs_email_click_count?: string;
        hs_lastmodifieddate?: string;
    };

    propertiesWithHistory?: {
        hs_email_open_count?: unknown[];
        hs_email_click_count?: unknown[];
        hs_email_reply_count?: unknown[];
    };
};

type Communication = {
    hubspotEmailId: string;

    graphMessageId: string | null;
    graphConversationId: string | null;
    graphWebLink: string | null;
    graphInternetMessageId: string | null;

    subject: string | null;
    body: string | null;

    fromEmail: string | null;
    toEmail: string | null;

    direction:
        | "EMAIL"
        | "INCOMING_EMAIL";

    sentAt: string | null;

    openCount: number;
    clickCount: number;

    openHistory: unknown;
    clickHistory: unknown;
    replyHistory: unknown;
    hubspotLastModifiedAt: string | null;
};

function toCommunication(
    email: HubSpotEmail
): Communication {
    const p = email.properties;

    return {
    hubspotEmailId: email.id,

    graphMessageId: null,

    graphConversationId: null,

    graphWebLink: null,

    graphInternetMessageId: null,

    subject:
        p.hs_email_subject ?? null,

    body:
        p.hs_email_text ?? null,

    fromEmail:
        p.hs_email_from_email ??
        null,

    toEmail:
        p.hs_email_to_email ??
        null,

    direction:
        p.hs_email_direction ??
        "EMAIL",

    sentAt:
        p.hs_timestamp ??
        p.hs_createdate ??
        null,

    hubspotLastModifiedAt:
    p.hs_lastmodifieddate ?? null,

    openCount: Number(
        p.hs_email_open_count ?? 0
    ),

    clickCount: Number(
        p.hs_email_click_count ?? 0
    ),

    openHistory: [],

    clickHistory: [],

    replyHistory: [],
};
}

async function upsertCommunication(
    subscription: RaiseSubscription,
    communication: Communication
) {
    const now = new Date().toISOString();

    const databaseDirection =
        communication.direction ===
        "INCOMING_EMAIL"
            ? "inbound"
            : "outbound";



    const { data, error } =
        await supabaseServer
            .from("raise_subscription_communications")
            .upsert(
                {
                    raise_subscription_id:
                        subscription.id,

                    hubspot_email_id:
                        communication.hubspotEmailId,

                    graph_message_id:
                        communication.graphMessageId,

                    graph_conversation_id:
                        communication.graphConversationId,

                    graph_web_link:
                        communication.graphWebLink,

                    graph_internet_message_id:
                        communication.graphInternetMessageId,

                    subject:
                        communication.subject,

                    sender_email:
                        communication.fromEmail,

                    recipient_email:
                        communication.toEmail,

                    direction:
                        databaseDirection,

                    sent_at:
                        communication.sentAt,

                    open_count:
                        communication.openCount,

                    click_count:
                        communication.clickCount,

                    communication_type:
                        "EMAIL",

                    status: "sent",

                    sync_status:
                        "synced",

                    last_synced_at:
                        now,
                    open_history:
                        communication.openHistory,
                    click_history:
                        communication.clickHistory,
                    reply_history:
                        communication.replyHistory,
                    hubspot_last_modified_at:
                        communication.hubspotLastModifiedAt,
                },
                {
                    onConflict:
                        "hubspot_email_id",
                }
            )
            .select();

    if (error) {
        console.error("[SUPABASE UPSERT ERROR]");
        console.error(error);
        throw new Error(error.message);
    }

}

export async function syncHubspotCommunications(
    raiseId: string
) {
    const subscriptions =
        await loadRaiseSubscriptions(
            raiseId
        );
    
    console.log(
    "[SYNC] subscriptions",
    subscriptions.length
);

    const hubspotEmails =
        await loadHubspotEmails();

    const existingCommunications =
    await loadExistingCommunications(
        subscriptions
    );
    const existingByHubspotId =
    new Map(
        existingCommunications.map(
            (c) => [
                c.hubspot_email_id,
                c,
            ]
        )
    );



console.log(
    JSON.stringify(
        hubspotEmails[0],
        null,
        2
    )
);
    console.log(
    "[SYNC] hubspot emails",
    hubspotEmails.length
);

    const subscriptionsByEmail =
    buildSubscriptionLookup(
        subscriptions
    );



let matched = 0;
let skipped = 0;
let updated = 0;

for (const hubspotEmail of hubspotEmails) {
    const communication =
        toCommunication(
            hubspotEmail
        );
        
    
const investorEmail =
        communication.direction ===
        "INCOMING_EMAIL"
            ? communication.fromEmail
            : communication.toEmail;

    if (!investorEmail)
        continue;

    const subscription =
        subscriptionsByEmail.get(
            investorEmail.toLowerCase()
        );

    if (!subscription)
        continue;

    matched++;

    const existing =
    existingByHubspotId.get(
        communication.hubspotEmailId
    );


const needsHistory =
    !existing ||
    existing.hubspot_last_modified_at !==
        communication.hubspotLastModifiedAt;
        if (!needsHistory) {
            skipped++;
    continue;
}

const history =
    await loadCommunicationHistory(
        communication.hubspotEmailId
    );

communication.openHistory =
    history.propertiesWithHistory
        ?.hs_email_open_count ?? [];

communication.clickHistory =
    history.propertiesWithHistory
        ?.hs_email_click_count ?? [];

communication.replyHistory =
    history.propertiesWithHistory
        ?.hs_email_reply_count ?? [];

    
console.log(
    "[UPSERT]",
    {
        email:
            communication.hubspotEmailId,
        subject:
            communication.subject,
    }
);

    await upsertCommunication(
    subscription,
    communication
);
updated++
}
console.log(
    `[SYNC] ${updated} updated, ${skipped} skipped`
);
return {
    subscriptions:
        subscriptions.length,

    emails:
        hubspotEmails.length,

    matched,
    skipped,
    updated,
};
}

async function loadRaiseSubscriptions(
    raiseId: string
): Promise<RaiseSubscription[]> {
    const { data, error } =
        await supabaseServer
            .from(
                "raise_subscriptions"
            )
            .select(`
                id,
                contact_email,
                contact_name
            `)
            .eq("raise_id", raiseId);

    if (error) {
        throw new Error(error.message);
    }

    return data ?? [];
}

type ExistingCommunication = {
    hubspot_email_id: string;
    open_count: number | null;
    click_count: number | null;
    hubspot_last_modified_at: string | null;
};

async function loadExistingCommunications(
    subscriptions: RaiseSubscription[]
) {
    const subscriptionIds =
        subscriptions.map((s) => s.id);

    const { data, error } =
        await supabaseServer
            .from(
                "raise_subscription_communications"
            )
            .select(`
                raise_subscription_id,
                hubspot_email_id,
                open_count,
                click_count,
                hubspot_last_modified_at
            `)
            .in(
                "raise_subscription_id",
                subscriptionIds
            );

    if (error) {
        throw new Error(error.message);
    }

    return data ?? [];
}

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

async function loadHubspotEmails(): Promise<
    HubSpotEmail[]
> {
    const res = await fetch(
        `${HUBSPOT_BASE}/crm/v3/objects/emails/search`,
        {
            method: "POST",

            headers: authHeaders(),

            cache: "no-store",

            body: JSON.stringify({
                limit: 200,

                properties: [
                    "hs_timestamp",
                    "hs_createdate",
                    "hs_email_subject",
                    "hs_email_text",
                    "hs_email_status",
                    "hs_email_direction",
                    "hs_email_headers",
                    "hs_email_from_email",
                    "hs_email_to_email",
                    "hs_email_open_count",
                    "hs_email_click_count",
                    "hs_lastmodifieddate",
                ],
                propertiesWithHistory: [
                    "hs_email_open_count",
                    "hs_email_click_count",
                    "hs_email_reply_count",
                ],

                sorts: [
                    {
                        propertyName:
                            "hs_timestamp",

                        direction:
                            "DESCENDING",
                    },
                ],
            }),
        }
    );

    
    const json = (await res.json()) as {
        results?: HubSpotEmail[];
    };

    if (!res.ok) {
        throw new Error(
            JSON.stringify(json)
        );
    }

    return json.results ?? [];
}

async function loadCommunicationHistory(
    emailId: string
): Promise<HubSpotEmail> {

    const url =
        `${HUBSPOT_BASE}/crm/v3/objects/emails/${emailId}` +
        "?properties=hs_email_open_count,hs_email_click_count,hs_email_reply_count" +
        "&propertiesWithHistory=hs_email_open_count,hs_email_click_count,hs_email_reply_count";



    const res = await fetch(url, {
        headers: authHeaders(),
        cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
        throw new Error(
            `HubSpot ${res.status}: ${text}`
        );
    }

    return JSON.parse(text) as HubSpotEmail;
}

function buildSubscriptionLookup(
    subscriptions: RaiseSubscription[]
) {
    const lookup = new Map<
        string,
        RaiseSubscription
    >();

    for (const subscription of subscriptions) {
        if (!subscription.contact_email)
            continue;

        lookup.set(
            subscription.contact_email,
            subscription
        );

        lookup.set(
            subscription.contact_email.toLowerCase(),
            subscription
        );
    }

    return lookup;
}

