import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import { DEAL_SELECT } from '../../../../lib/deals/dealFields';

export async function GET(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from('deals')
    .select(DEAL_SELECT)
    .eq('id', dealId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Deal not found' },
      { status: 404 }
    );
  }

  const { deal_metrics, ...rest } = data;

  const deal = {
    ...rest,
    metrics: (deal_metrics ?? [])
      .filter(m => m.is_visible !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
  };

  return NextResponse.json({
    ok: true,
    deal,
  });
}