import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function GET(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const supabase = supabaseServer;

  const { dealId } = await context.params;

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('deal_id', dealId);

  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    ok: true,
    prospects: data ?? [],
  });
}