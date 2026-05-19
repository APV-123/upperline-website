import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name =
      typeof body.name === 'string' ? body.name.trim() : null;

    const target_amount = Number(body.target_amount ?? 0);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Invalid name' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid target amount' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('deals')
      .insert({
        name,
        target_amount,
        is_public: false, // ✅ default = hidden
      })
      .select();

    if (error) {
      console.error('[CREATE DEAL ERROR]', error);

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deal: data?.[0] ?? null,
    });

  } catch (e) {
    console.error('[CREATE DEAL CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
