import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type PublicDeal = {
  id: string;
  name: string;
  raise_id: string;
  target_amount: number;
  location?: string;
  estimated_closing_date?: string;
  overview_text?: string;
  created_at: string | null;

  project_unlevered_irr?: string;
  project_levered_irr?: string;
  target_lp_equity_multiple?: string;
  target_lp_levered_irr?: string;
  untrended_return_on_cost?: string;
  stabilized_return_on_cost?: string;
  total_equity_requirement?: string;
  construction_loan?: string;
  total_project_cost?: string;
  
  image_1_url?: string;
  image_2_url?: string;
  image_3_url?: string;

  
  pitch_book_url?: string;
  abridged_memo_url?: string;
  full_memo_url?: string;
  full_memo_requires_ca?: boolean;

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
    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from('deals')
      .select(`
        id,
        name,
        target_amount,
        location,
        estimated_closing_date,
        overview_text,
        raise_id,
        created_at,

        project_unlevered_irr,
        project_levered_irr,
        target_lp_equity_multiple,
        target_lp_levered_irr,
        untrended_return_on_cost,
        stabilized_return_on_cost,
        total_equity_requirement,
        construction_loan,
        total_project_cost,
              
        image_1_url,
        image_2_url,
        image_3_url,

        pitch_book_url,
        abridged_memo_url,
        full_memo_url,
        full_memo_requires_ca
      `)
      .eq('id', dealId)
      .eq('is_public', true) // ✅ CRITICAL: enforce visibility
      .single<PublicDeal>();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: 'Deal not found or not public' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deal: data,
    });

  } catch (e) {
    console.error('[PUBLIC DEAL DETAIL ERROR]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}