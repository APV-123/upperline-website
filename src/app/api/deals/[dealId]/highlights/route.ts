import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function GET(
  req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from('deal_highlights')
      .select('*')
      .eq('deal_id', dealId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[HIGHLIGHTS LOAD ERROR]', error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      highlights: data ?? [],
    });
  } catch (e) {
    console.error('[HIGHLIGHTS LOAD CRASH]', e);

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error',
      },
      { status: 500 }
    );
  }
}