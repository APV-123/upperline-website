import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import { PUBLIC_DEAL_SELECT } from '@/lib/deals/publicDealFields';

type Params = { dealId: string };

type PublicDealMetric = {
  key: string;
  label: string;
  icon?: string;
  value?: string | null;
  section: string;
  display_order: number;
  is_visible?: boolean;
};

type PublicDealHighlight ={
  id: string;
  title: string;
  description: string;
  display_order: number;
  is_visible: boolean;
};

type PublicDeal = {
  id: string;
  name: string;
  raise_id: string;
  target_amount: number;
  location?: string;
  asset_class?: string;
  strategy?: string;
  estimated_closing_date?: string;
  why_we_like_it?: string;
  overview_text?: string;
  business_plan_text?: string;
  created_at: string | null;

  image_1_url?: string;
  image_2_url?: string;
  image_3_url?: string;

  pitch_book_url?: string;
  abridged_memo_url?: string;
  full_memo_url?: string;
  full_memo_requires_ca?: boolean;
  
  deal_highlights?: PublicDealHighlight[];
  deal_metrics?: PublicDealMetric[];
};

export async function GET(
  _req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from('deals')
      .select(PUBLIC_DEAL_SELECT)
      .eq('id', dealId)
      .eq('is_public', true)
      .single<PublicDeal>();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: 'Deal not found or not public' },
        { status: 404 }
      );
    }

    const { 
      deal_highlights,
      deal_metrics,
      ...rest 
    } = data;

    const deal = {
      ...rest,

      deal_highlights: (deal_highlights ?? [])
        .filter((h) => h.is_visible !== false)
        .sort(
          (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
        ),

      metrics: (deal_metrics ?? [])
        .filter((m) => m.is_visible !== false)
        .sort(
          (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
        ),
    };

    return NextResponse.json({
      ok: true,
      deal,
    });

  } catch (e) {
    console.error('[PUBLIC DEAL DETAIL ERROR]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
