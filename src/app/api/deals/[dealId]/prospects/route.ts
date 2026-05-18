
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

export async function GET(
  req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  const supabase = supabaseServer;

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('deal_id', dealId);

  if (error) {
    console.error('[PROSPECTS FETCH ERROR]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to fetch prospects',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    prospects: data ?? [],
  });
}
