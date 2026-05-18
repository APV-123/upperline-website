import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  // 1. Get current value
  const { data: deal, error: fetchError } = await supabaseServer
    .from('deals')
    .select('is_public')
    .eq('id', dealId)
    .single();

  if (fetchError || !deal) {
    return NextResponse.json({ ok: false, error: fetchError?.message });
  }

  // 2. Toggle
  const { error: updateError } = await supabaseServer
    .from('deals')
    .update({ is_public: !deal.is_public })
    .eq('id', dealId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message });
  }

  return NextResponse.json({
    ok: true,
    is_public: !deal.is_public,
  });
}