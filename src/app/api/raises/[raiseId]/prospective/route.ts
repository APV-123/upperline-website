
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function GET(
  _req: Request,
  context: { params: Promise<{ raiseId: string }> }
) {
  const { raiseId } = await context.params;

  const { data, error } = await supabaseServer
    .from('raise_subscriptions')
    .select('*')
    .eq('raise_id', raiseId)
    .eq('status', 'subscribed')
    .neq('invite_status', 'invited')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, prospects: data ?? [] });
}
