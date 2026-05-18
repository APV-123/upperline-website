import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function GET(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  const { data, error } = await supabaseServer
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single();

  if (error || !data) {
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Deal not found',
    });
  }

  return NextResponse.json({
    ok: true,
    deal: data,
  });
}