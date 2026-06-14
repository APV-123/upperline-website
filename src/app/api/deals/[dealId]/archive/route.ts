import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  _req: Request,
  context: {
    params: Promise<{ dealId: string }>;
  }
) {
  const { dealId } = await context.params;

  const { error } = await supabaseServer
    .from('deals')
    .update({
      is_archived: true,
    })
    .eq('id', dealId);

  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    ok: true,
  });
}