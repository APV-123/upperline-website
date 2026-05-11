import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ raiseId: string; id: string }> }
) {
  const { raiseId, id } = await context.params;

  const { error } = await supabaseServer
    .from('raise_subscriptions')
    .delete()
    .eq('id', id)
    .eq('raise_id', raiseId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}