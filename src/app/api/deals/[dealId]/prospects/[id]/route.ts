import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ dealId: string; id: string }> }
) {
  const { dealId, id } = await context.params;

  try {
    const supabase = supabaseServer;

    // ✅ 1. Get raise_id from deals table
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('raise_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal?.raise_id) {
      return NextResponse.json(
        { ok: false, error: 'Missing raise_id' },
        { status: 400 }
      );
    }

    // ✅ 2. Delete directly from raise_subscriptions
    const { error } = await supabase
      .from('raise_subscriptions')
      .delete()
      .eq('raise_id', deal.raise_id)
      .eq('contact_id', id); // 🔥 this is the key

    if (error) {
      console.error('[DELETE PROSPECT ERROR]', error);

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error('[DELETE PROSPECT CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
