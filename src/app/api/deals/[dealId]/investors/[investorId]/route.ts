import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/SupabaseServer';
import type {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from "@/components/investors/types";
import { mapInvestor } from '@/components/investors/mapper';
import { formatActivityDate } from "@/components/investors/formatters";

const HUBSPOT_BASE = 'https://api.hubapi.com';

function getHubSpotToken(): string | null {
    const raw =
        process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!raw) return null;

    return raw
        .replace(/^['"]|['"]$/g, '')
        .trim();
}

function authHeaders() {
    const token = getHubSpotToken();

    return {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
    };
}

type InvestorWorkspaceResponse = {
    ok: true;
    investor: Investor;
    metrics: InvestorMetrics;
    timeline: TimelineEvent[];
};

type InvestorWorkspaceError = {
    ok: false;
    error: string;
};

type Params = {
    dealId: string;
    investorId: string;
};
type RaiseInvestor = {
    dealId: string;
    contactId: string;
    raiseSubscriptionId: string;
    amount: number;
    dealstage: string;
};
type CommunicationRow = {
    id: string;

    subject: string | null;

    status: string | null;

    direction: string | null;

    sent_at: string | null;

    delivered_at: string | null;

    opened_at: string | null;

    replied_at: string | null;

    clicked_at: string | null;

    created_at: string;

    open_count: number | null;

    click_count: number | null;

    sender_email: string | null;

    recipient_email: string | null;

    graph_message_id: string | null;

    graph_conversation_id: string | null;

    notes: string | null;
};

export async function GET(
    req: Request,
    context: {
        params: Params | Promise<Params>;
    }
) {
    const { dealId, investorId } =
    await context.params;

    const { data: deal, error: dealError } =
    await supabaseServer
        .from('deals')
        .select(`
            raise_id,
            name
        `)
                .eq('id', dealId)
                .single();
        
            if (dealError || !deal) {
            return NextResponse.json<InvestorWorkspaceError>(
                {
                    ok: false,
                    error: 'Deal not found',
                },
                {
                    status: 404,
                }
            );
        }    

    if (dealError || !deal) {
    return NextResponse.json<InvestorWorkspaceError>(
        {
            ok: false,
            error: 'Deal not found',
        },
        {
            status: 404,
        }
    );
}    
    const { data: subscription, error } =
    await supabaseServer
        .from('raise_subscriptions')
        .select(`
            id,
            raise_id,
            contact_id,
            contact_name,
            contact_email,
            status,
            last_activity_at
            `)
        .eq('raise_id', deal.raise_id)
        .eq('contact_id', investorId)
        .single();


    if (error || !subscription) {
    return NextResponse.json<InvestorWorkspaceError>(
        {
            ok: false,
            error: 'Investor not found',
        },
        {
            status: 404,
        }
    );
}

const { data: activities, error: activityError } =
    await supabaseServer
        .from('raise_subscription_activity')
        .select('*')
        .eq(
            'raise_subscription_id',
            subscription.id
        )
        .order('activity_at', {
            ascending: false,
        });
const {
    data: communications,
    error: communicationsError,
} = await supabaseServer
    .from('raise_subscription_communications')
    .select(`
    id,
    subject,
    status,
    direction,
    sent_at,
    delivered_at,
    opened_at,
    replied_at,
    clicked_at,
    open_count,
    click_count,
    sender_email,
    recipient_email,
    graph_message_id,
    graph_conversation_id,
    notes,
    created_at
`)
    .eq(
        'raise_subscription_id',
        subscription.id
    )
    .order('sent_at', {
        ascending: false,
    });

if (communicationsError) {
    console.error(
        '[COMMUNICATIONS ERROR]',
        communicationsError
    );
}

console.log(
    '[COMMUNICATIONS]',
    communications
);

if (activityError) {
    console.error(
        '[ACTIVITY ERROR]',
        activityError
    );
}

console.log(
    '[ACTIVITIES]',
    activities
);

const hubspotActivityRes = await fetch(
    `${new URL(req.url).origin}/api/hubspot/contacts/${investorId}/activity`,
    {
        headers: {
            cookie: req.headers.get("cookie") ?? "",
        },
        cache: "no-store",
    }
);

const hubspotActivityJson =
    await hubspotActivityRes.json();

function getActivityTitle(
    activity: {
        activity_type: string;
    }
) {
    switch (activity.activity_type) {
        case 'status_changed':
            return 'Stage Changed';

        case 'im_viewed':
            return 'Investment Memorandum Viewed';

        case 'financial_model_downloaded':
            return 'Financial Model Downloaded';

        case 'commitment_created':
            return 'Commitment Created';

        case 'commitment_updated':
            return 'Commitment Updated';

        case 'commitment_removed':
            return 'Commitment Removed';

        case 'ca_completed':
            return 'Confidentiality Agreement Executed';

        case 'note_added':
            return 'Internal Note Added';

        default:
            return activity.activity_type;
    }
}

function getActivityDescription(
    activity: {
        activity_type: string;
        metadata: Record<string, unknown> | null;
    }
) {
    const m = activity.metadata ?? {};

    switch (activity.activity_type) {
        case 'status_changed':
            return `${m.from} → ${m.to}`;

        case 'commitment_created':
            return `$${Number(
                m.amount ?? 0
            ).toLocaleString()} committed`;

        case 'commitment_updated':
            return `$${Number(
                m.old_amount ?? 0
            ).toLocaleString()} → $${Number(
                m.new_amount ?? 0
            ).toLocaleString()}`;

        case 'commitment_removed':
            return `$${Number(
                m.amount ?? 0
            ).toLocaleString()} commitment removed`;

        case 'im_viewed':
            return 'Viewed Investment Memorandum';

        case 'financial_model_downloaded':
            return 'Downloaded Financial Model';

        case 'ca_completed':
            return 'Executed Confidentiality Agreement';

        case 'note_added':
            return 'Internal note added';

        default:
            return '';
    }
}

const activityTimeline: TimelineEvent[] =
    (activities ?? []).map((activity) => ({
        id: activity.id,

        type:
    activity.activity_type === 'status_changed'
        ? 'stage'
        : activity.activity_type ===
          'commitment_created'
        ? 'commitment'
        : activity.activity_type ===
              'im_viewed' ||
          activity.activity_type ===
              'financial_model_downloaded' ||
          activity.activity_type ===
              'ca_completed'
        ? 'document'
        : 'note',

        source:
            activity.activity_source ===
            'portal'
                ? 'portal'
                : 'employee',

        title: getActivityTitle(activity),

        description: getActivityDescription(activity),

        actor:
            activity.created_by ?? undefined,

        timestamp:
            activity.activity_at,

        metadata:
            activity.metadata ?? {},
    }));

    const communicationTimeline: TimelineEvent[] =
    (communications as CommunicationRow[] ?? [])
        .map((email) => ({
            id: email.id,

            type: 'email',

            source: 'employee',

            title:
    email.direction === "inbound"
        ? "Email Received"
        : "Email Sent",

            description:
                email.subject ??
                'No subject',

            actor:
    email.sender_email ?? undefined,

            timestamp:
                email.sent_at ??
                email.created_at,

            metadata: {
    status: email.status ?? undefined,

    direction: email.direction ?? undefined,

    senderEmail: email.sender_email ?? undefined,

    recipientEmail:
        email.recipient_email ?? undefined,

    sentAt: email.sent_at ?? undefined,

    deliveredAt:
        email.delivered_at ?? undefined,

    notes: email.notes ?? undefined,

    opens: email.open_count || undefined,

    clicks: email.click_count || undefined,

    replied: !!email.replied_at,

    graphMessageId:
        email.graph_message_id ?? undefined,

    graphConversationId:
        email.graph_conversation_id ??
        undefined,
}
        }));

        const hubspotTimeline: TimelineEvent[] =
    (hubspotActivityJson.activities ?? [])
        .filter(
            (a: {
                type: string;
            }) => a.type !== "EMAIL"
        )
        .map(
            (a: {
                id: string;
                type: string;
                subject?: string | null;
                preview?: string | null;
                timestamp: string;
                ownerName?: string | null;
            }): TimelineEvent => ({
                id: a.id,

                source: "hubspot",

                type:
                    a.type === "NOTE"
                        ? "note"
                        : a.type === "MEETING"
                        ? "meeting"
                        : a.type === "TASK"
                        ? "task"
                        : "note",

                title:
                    a.subject ??
                    (a.type === "NOTE"
                        ? "Internal Note"
                        : a.type === "MEETING"
                        ? "Meeting"
                        : "Task"),

                description:
                    a.preview ?? "",

                actor:
                    a.ownerName ?? undefined,

                timestamp:
                    a.timestamp,
            })
        );

        const timeline = [
    ...activityTimeline,
    ...communicationTimeline,
    ...hubspotTimeline,
].sort(
    (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
);


    console.log(
    '[COMMUNICATION TIMELINE]',
    communicationTimeline
);

    console.log(
    "[HUBSPOT TIMELINE]",
    hubspotTimeline
);

console.log(
    "[FINAL TIMELINE]",
    timeline
);

    const memorandumViews =
    (activities ?? []).filter(
        (a) =>
            a.activity_type ===
            'im_viewed'
    ).length;

const modelDownloads =
    (activities ?? []).filter(
        (a) =>
            a.activity_type ===
            'financial_model_downloaded'
    ).length;

const lastContact =
    formatActivityDate(
        activities?.[0]?.activity_at ?? null
    );

// ✅ Fetch HubSpot contact
const hubspotRes = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${investorId}` +
        `?properties=firstname,lastname,company,jobtitle,email,photo,twitterprofilephoto`,
    {
        headers: authHeaders(),
        cache: 'no-store',
    }
);

let hubspotProperties: Record<string, unknown> = {};

if (hubspotRes.ok) {
    const hubspot = await hubspotRes.json();


hubspotProperties = hubspot.properties ?? {};

    

    console.log(
        '[HUBSPOT CONTACT]',
        hubspotProperties
    );
} else {
    console.error(
        '[HUBSPOT CONTACT FAILED]',
        hubspotRes.status
    );
}


const raiseRes = await fetch(
    `${new URL(req.url).origin}/api/hubspot/raises/${deal.raise_id}`,
    {
        headers: {
            cookie: req.headers.get('cookie') ?? '',
        },
        cache: 'no-store',
    }
);

const raiseJson = await raiseRes.json();
console.log(
    '[RAISE]',
    raiseJson
);



const hubspotInvestor =
    (raiseJson.investors as RaiseInvestor[]).find(
        (i) => i.contactId === investorId
    );

console.log(
    '[HUBSPOT INVESTOR]',
    hubspotInvestor
);

const investor = mapInvestor(
    subscription,    
    {
        dealName: deal.name,
        company:
            typeof hubspotProperties.company === 'string'
                ? hubspotProperties.company
                : null,

        jobtitle:
            typeof hubspotProperties.jobtitle === 'string'
                ? hubspotProperties.jobtitle
                : null,

        photo:
    typeof hubspotProperties.photo === 'string'
        ? hubspotProperties.photo
        : null,
        hubspotDealId:
            hubspotInvestor?.dealId ?? null,
        raiseSubscriptionId:
            hubspotInvestor?.raiseSubscriptionId ?? null,
        hubspotStageId:
            hubspotInvestor?.dealstage ?? null,
    }
);
return NextResponse.json<InvestorWorkspaceResponse>({
    ok: true,
    investor,
    metrics: {
        amount: hubspotInvestor?.amount ?? 250000,
        relationship: "Healthy",
        memorandumViews,
        modelDownloads,
        lastContact,
        nextFollowUp: "",
    },
    timeline,
});
}