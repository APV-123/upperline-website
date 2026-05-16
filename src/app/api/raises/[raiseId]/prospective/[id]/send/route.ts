import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  _req: Request,
  context: { params: Promise<{ raiseId: string; id: string }> }
) {
  const { raiseId, id } = await context.params;

  try {
    const { error } = await supabaseServer
      .from('raise_subscriptions')
      .update({
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('raise_id', raiseId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unhandled error';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}