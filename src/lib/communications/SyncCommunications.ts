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
    };
};

type Communication = {
    hubspotEmailId: string;

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
};

function toCommunication(
    email: HubSpotEmail
): Communication {
    const p = email.properties;

    return {
        hubspotEmailId: email.id,

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

        openCount: Number(
            p.hs_email_open_count ?? 0
        ),

        clickCount: Number(
            p.hs_email_click_count ?? 0
        ),
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

    console.log("[UPSERT ATTEMPT]", {
        raiseSubscriptionId: subscription.id,
        hubspotEmailId: communication.hubspotEmailId,
        subject: communication.subject,
        sender: communication.fromEmail,
        recipient: communication.toEmail,
        hubspotDirection: communication.direction,
        databaseDirection,
    });

    const { data, error } =
        await supabaseServer
            .from("raise_subscription_communications")
            .upsert(
                {
                    raise_subscription_id:
                        subscription.id,

                    hubspot_email_id:
                        communication.hubspotEmailId,

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

                    status:
                        communication.direction ===
                        "INCOMING_EMAIL"
                            ? "received"
                            : "sent",

                    sync_status:
                        "synced",

                    last_synced_at:
                        now,
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

    console.log("[UPSERT SUCCESS]", data);
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

    console.log(
    "[SYNC] hubspot emails",
    hubspotEmails.length
);

    const subscriptionsByEmail =
    buildSubscriptionLookup(
        subscriptions
    );



let matched = 0;

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


matched++;
}

return {
    subscriptions:
        subscriptions.length,

    emails:
        hubspotEmails.length,

    matched,
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
        throw error;
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

