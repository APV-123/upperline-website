import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/SupabaseServer';
import type {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from "@/components/investors/types";

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
    return NextResponse.json({
    ok: true,
    deal,
    subscription,
});
}