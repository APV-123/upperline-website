import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = {
  dealId: string;
};

export async function POST(
  req: Request,
  context: { params: Params }
) {
  const { dealId } = context.params;

  try {
    const body = await req.json();

    const { name, target_amount } = body;

    const { error } = await supabaseServer
      .from('deals')
      .update({
        name,
        target_amount,
      })
      .eq('id', dealId);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
      });
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error('[UPDATE DEAL ERROR]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}