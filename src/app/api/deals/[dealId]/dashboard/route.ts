import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import type { InvestorRow, ProspectRow } from '@/lib/types/deal';

type Params = { dealId: string };

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
  details?: string;
};

async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json<DashboardError>(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  try {
    const supabase = supabaseServer;

    // 1) Deal core fields (Supabase)
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

    // 2) Server-to-server calls MUST preserve auth cookies
    const origin = new URL(req.url).origin;
    const cookie = req.headers.get('cookie') ?? '';

    const [investorsRes, prospectsRes] = await Promise.all([
      fetch(`${origin}/api/deals/${dealId}/investors`, {
        cache: 'no-store',
        headers: { cookie, accept: 'application/json' },
      }),
      fetch(`${origin}/api/deals/${dealId}/prospects`, {
        cache: 'no-store',
        headers: { cookie, accept: 'application/json' },
      }),
    ]);

    // 3) Hard guards: don't let HTML/401 explode into catch()
    if (!investorsRes.ok) {
      const t = await investorsRes.text();
      return NextResponse.json<DashboardError>(
        {
          ok: false,
          error: `Investors route failed (${investorsRes.status})`,
          details: t.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!prospectsRes.ok) {
      const t = await prospectsRes.text();
      return NextResponse.json<DashboardError>(
        {
          ok: false,
          error: `Prospects route failed (${prospectsRes.status})`,
          details: t.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const investorsJson =
      (await safeJson<{ investors?: InvestorRow[] }>(investorsRes)) ?? {};
    const prospectsJson =
      (await safeJson<{ prospects?: ProspectRow[] }>(prospectsRes)) ?? {};

    // If either returned non-JSON despite 200, treat as upstream issue
    if (!('investors' in investorsJson)) {
      const t = await investorsRes.text();
      return NextResponse.json<DashboardError>(
        {
          ok: false,
          error: 'Investors route returned non-JSON',
          details: t.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!('prospects' in prospectsJson)) {
      const t = await prospectsRes.text();
      return NextResponse.json<DashboardError>(
        {
          ok: false,
          error: 'Prospects route returned non-JSON',
          details: t.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const investors: InvestorRow[] = investorsJson.investors ?? [];
    const prospects: ProspectRow[] = prospectsJson.prospects ?? [];

    // 4) Metrics
    const committed = investors
      .filter((i) => i.bucket === 'committed')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const committedCount = investors.filter((i) => i.bucket === 'committed').length;

    const avgCheck = committedCount > 0 ? Math.round(committed / committedCount) : 0;

    const invitedCount = prospects.filter((p) => p.invited_at).length;

    const draftReadyCount = prospects.filter(
      (p) => p.invite_status === 'draft_ready'
    ).length;

    const activeInvestorsCount = investors.filter((i) => i.bucket !== 'passed').length;

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