import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import type { InvestorRow, ProspectRow } from '@/lib/types/deal';

export async function GET() {
  const supabase = supabaseServer;

  const { data: deals, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !deals) {
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to fetch deals',
    });
  }

  // ✅ FIX: proper base URL fallback
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const enrichedDeals = await Promise.all(
      deals.map(async (deal) => {
        // ✅ FIXED URL construction (no more undefined crash)
        const [investorsRes, prospectsRes] = await Promise.all([
          fetch(`${baseUrl}/api/deals/${deal.id}/investors`, {
            cache: 'no-store',
          }),
          fetch(`${baseUrl}/api/deals/${deal.id}/prospects`, {
            cache: 'no-store',
          }),
        ]);

        const investorsJson = await investorsRes.json();
        const prospectsJson = await prospectsRes.json();

        // ✅ Typed
        const investors: InvestorRow[] = investorsJson?.investors ?? [];
        const prospects: ProspectRow[] = prospectsJson?.prospects ?? [];

        // ✅ Metrics
        const committed = investors
          .filter((i) => i.bucket === 'committed')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const investorCount = investors.length;

        const invitedCount = prospects.filter((p) => p.invited_at).length;

        const draftReadyCount = prospects.filter(
          (p) => p.invite_status === 'draft_ready'
        ).length;

        return {
          ...deal,
          metrics: {
            committed,
            investorCount,
            invitedCount,
            draftReadyCount,
          },
        };
      })
    );

    return NextResponse.json({
      ok: true,
      deals: enrichedDeals,
    });

  } catch (e) {
    console.error('[DEALS ENRICH ERROR]', e);

    return NextResponse.json({
      ok: false,
      error: 'Failed to enrich deals',
    });
  }
}