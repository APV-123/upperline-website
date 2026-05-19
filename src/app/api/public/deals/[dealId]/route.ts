import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type PublicDeal = {
  id: string;
  name: string;
  raise_id: string;
  target_amount: number;
  created_at: string | null;
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
        created_at
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