
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import type { InvestorRow, ProspectRow } from '@/lib/types/deal';

export async function GET(req: Request) {
  const supabase = supabaseServer;

  const { data: deals, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !deals) {
    console.error('[DEALS FETCH ERROR]', error);
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to fetch deals',
    });
  }

  // ✅ Use request origin instead of env guessing (fixes Vercel issues)
  const origin = new URL(req.url).origin;

  // ✅ Forward auth/session cookies
  const cookie = req.headers.get('cookie') ?? '';

  const enrichedDeals = await Promise.all(
    deals.map(async (deal) => {
      try {
        const [investorsRes, prospectsRes] = await Promise.all([
          fetch(`${origin}/api/deals/${deal.id}/investors`, {
            cache: 'no-store',
            headers: { cookie },
          }),
          fetch(`${origin}/api/deals/${deal.id}/prospects`, {
            cache: 'no-store',
            headers: { cookie },
          }),
        ]);

        // ✅ Guard against failed responses
        if (!investorsRes.ok) {
          const t = await investorsRes.text();
          throw new Error(`Investors fetch failed (${investorsRes.status}): ${t.slice(0, 200)}`);
        }

        if (!prospectsRes.ok) {
          const t = await prospectsRes.text();
          throw new Error(`Prospects fetch failed (${prospectsRes.status}): ${t.slice(0, 200)}`);
        }

        // ✅ Guard against non-JSON responses (VERY common in auth failures)
        const investorsContentType = investorsRes.headers.get('content-type') || '';
        const prospectsContentType = prospectsRes.headers.get('content-type') || '';

        if (!investorsContentType.includes('application/json')) {
          const t = await investorsRes.text();
          throw new Error(`Investors returned non-JSON: ${t.slice(0, 200)}`);
        }

        if (!prospectsContentType.includes('application/json')) {
          const t = await prospectsRes.text();
          throw new Error(`Prospects returned non-JSON: ${t.slice(0, 200)}`);
        }

        const investorsJson = await investorsRes.json();
        const prospectsJson = await prospectsRes.json();

        const investors: InvestorRow[] = investorsJson?.investors ?? [];
        const prospects: ProspectRow[] = prospectsJson?.prospects ?? [];

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
      } catch (err) {
        // ✅ DO NOT BREAK ENTIRE PAGE
        console.error('[ENRICH FAILED FOR DEAL]', deal.id, err);

        return {
          ...deal,
          metrics: {
            committed: 0,
            investorCount: 0,
            invitedCount: 0,
            draftReadyCount: 0,
          },
        };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    deals: enrichedDeals,
  });
}
