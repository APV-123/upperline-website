import { NextResponse } from "next/server";
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

    return NextResponse.json<{
    ok: true;
    dealId: string;
    investorId: string;
}>({
    ok: true,
    dealId,
    investorId,
});
}