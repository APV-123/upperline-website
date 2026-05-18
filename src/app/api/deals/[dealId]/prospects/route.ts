
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

export async function GET(
  _req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    const supabase = supabaseServer;

    // 1. Get raise_id from deals
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('raise_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal?.raise_id) {
      return NextResponse.json(
        { ok: false, error: 'Deal not found or missing raise_id' },
        { status: 404 }
      );
    }

    // 2. Get subscriptions tied to raise
    const { data, error } = await supabase
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

    // 3. Normalize to "prospects" shape your UI expects
    const prospects = (data ?? []).map((row) => ({
      contact_id: row.contact_id,
      contact_name: row.contact_name,
      raise_id: row.raise_id,
    }));

    return NextResponse.json({
      ok: true,
      prospects,
    });

  } catch (e) {
    console.error('[PROSPECTS CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
