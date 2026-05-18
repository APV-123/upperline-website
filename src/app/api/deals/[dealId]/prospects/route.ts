import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

export async function GET(
  _req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    // 1) Get raise_id from deals
    const { data: deal, error: dealError } = await supabaseServer
      .from('deals')
      .select('raise_id')
      .eq('id', dealId)
      .single<{ raise_id: string }>();

    if (dealError || !deal?.raise_id) {
      return NextResponse.json(
        { ok: false, error: 'Deal not found or missing raise_id' },
        { status: 404 }
      );
    }

    // 2) Get subscriptions tied to raise (return full rows so UI gets invite_status etc.)
    const { data, error } = await supabaseServer
      .from('raise_subscriptions')
      .select('*')
      .eq('raise_id', deal.raise_id);

    if (error) {
      console.error('[RAISE SUBSCRIPTIONS ERROR]', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      prospects: data ?? [],
    });
  } catch (e) {
    console.error('[PROSPECTS CRASH]', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
