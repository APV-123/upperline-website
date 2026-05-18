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

    const name = typeof body.name === 'string' ? body.name.trim() : null;

    const target_amount_num =
      typeof body.target_amount === 'number'
        ? body.target_amount
        : typeof body.target_amount === 'string'
          ? Number(body.target_amount)
          : NaN;

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

    if (!Number.isFinite(target_amount_num)) {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid target_amount' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from('deals')
      .update({
        name,
        target_amount: target_amount_num,
      })
      .eq('id', dealId);

    if (error) {
      console.error('[DEAL UPDATE ERROR]', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
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