import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/SupabaseServer';
import type {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from "@/components/investors/types";
import { mapInvestor } from '@/components/investors/mapper';

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
        .select('raise_id')
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
    const { data: subscription, error } =
    await supabaseServer
        .from('raise_subscriptions')
        .select('*')
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

// ✅ Fetch HubSpot contact
const hubspotRes = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${investorId}` +
        `?properties=firstname,lastname,company,jobtitle,hs_avatar_url,email`,
    {
        headers: authHeaders(),
        cache: 'no-store',
    }
);

const hubspot = await hubspotRes.json();

console.log(
    '[HUBSPOT CONTACT]',
    hubspot.properties
);

// Temporary — we'll change this next
const investor = mapInvestor(subscription);

return NextResponse.json<InvestorWorkspaceResponse>({
    ok: true,
    investor,
    metrics: {
        amount: 0,
        relationship: "Healthy",
        memorandumViews: 0,
        modelDownloads: 0,
        lastContact: "",
        nextFollowUp: "",
    },
    timeline: [],
});
}