import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = {
  dealId: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    const body = await req.json();

    // ✅ Parse inputs safely
    const name =
      typeof body.name === 'string' ? body.name.trim() : null;

    const target_amount = Number(body.target_amount ?? 0);

    // ✅ DEBUG LOG (you can remove later)
    console.log('[UPDATE DEBUG]', {
      dealId,
      rawName: body.name,
      name,
      rawTarget: body.target_amount,
      parsedTarget: target_amount,
    });

    // ✅ Validation
    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Invalid name' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid target_amount' },
        { status: 400 }
      );
    }

    // ✅ Update DB
    const { data, error } = await supabaseServer
      .from('deals')
      .update({
        name,
        target_amount,
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

    // ✅ Ensure something actually updated
    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No rows updated — bad dealId?' },
        { status: 400 }
      );
    }

    console.log('[UPDATED ROW]', data);

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error('[UPDATE DEAL CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
