import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import type { InvestorRow, ProspectRow } from '@/lib/types/deal';

type DashboardResponse = {
  ok: true;
  deal: {
    id: string;
    name: string;
    raise_id: string;
    target_amount: number;
  };
  investors: InvestorRow[];
  prospects: ProspectRow[];
  metrics: {
    committed: number;
    committedCount: number;
    avgCheck: number;
    invitedCount: number;
    draftReadyCount: number;
    activeInvestorsCount: number;
  };
};

type DashboardError = {
  ok: false;
  error: string;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  try {
    const supabase = supabaseServer;

    // ✅ get deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, name, raise_id, target_amount')
      .eq('id', dealId)
      .single<{
        id: string;
        name: string;
        raise_id: string;
        target_amount: number;
      }>();

    if (dealError || !deal) {
      return NextResponse.json<DashboardError>(
        { ok: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // ✅ base URL fix
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // ✅ fetch investors
    const investorsRes = await fetch(
      `${baseUrl}/api/deals/${dealId}/investors`,
      { cache: 'no-store' }
    );

    const investorsJson: { investors?: InvestorRow[] } =
      await investorsRes.json();

    const investors: InvestorRow[] = investorsJson.investors ?? [];

    // ✅ fetch prospects
    const prospectsRes = await fetch(
      `${baseUrl}/api/deals/${dealId}/prospects`,
      { cache: 'no-store' }
    );

    const prospectsJson: { prospects?: ProspectRow[] } =
      await prospectsRes.json();

    const prospects: ProspectRow[] = prospectsJson.prospects ?? [];

    // ✅ metrics (fully typed)
    const committed = investors
      .filter((i) => i.bucket === 'committed')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const committedCount = investors.filter(
      (i) => i.bucket === 'committed'
    ).length;

    const avgCheck =
      committedCount > 0 ? Math.round(committed / committedCount) : 0;

    const invitedCount = prospects.filter((p) => p.invited_at).length;

    const draftReadyCount = prospects.filter(
      (p) => p.invite_status === 'draft_ready'
    ).length;

    const activeInvestorsCount = investors.filter(
      (i) => i.bucket !== 'passed'
    ).length;

    return NextResponse.json<DashboardResponse>({
      ok: true,
      deal,
      investors,
      prospects,
      metrics: {
        committed,
        committedCount,
        avgCheck,
        invitedCount,
        draftReadyCount,
        activeInvestorsCount,
      },
    });

  } catch (e) {
    console.error('[dashboard error]', e);

    return NextResponse.json<DashboardError>(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
