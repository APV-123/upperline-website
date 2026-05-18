import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type UpdateDealBody = {
  name?: unknown;
  target_amount?: unknown;
};

export async function POST(
  req: Request,
  context: { params: Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    const body = (await req.json().catch(() => ({}))) as UpdateDealBody;

    const name =
      typeof body.name === 'string' ? body.name.trim() : null;

    const target_amount_num = Number(body.target_amount ?? 0);

    // ✅ DEBUG LOGGING (THIS IS THE KEY)
    console.log('[UPDATE DEBUG]', {
      dealId,
      rawName: body.name,
      name,
      rawTarget: body.target_amount,
      parsedTarget: target_amount_num,
    });

    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid name' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(target_amount_num) || target_amount_num <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid target_amount' },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT: select() returns updated rows
    const { data, error } = await supabaseServer
      .from('deals')
      .update({
        name,
        target_amount: target_amount_num,
      })
      .eq('id', dealId)
      .select();

    if (error) {
      console.error('[SUPABASE ERROR]', error);

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // ✅ THIS TELLS US IF ANY ROW UPDATED
    console.log('[UPDATED ROW]', data);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No rows updated — dealId mismatch?' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error('[DEAL UPDATE CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
