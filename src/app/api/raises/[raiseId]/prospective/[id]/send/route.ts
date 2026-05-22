import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  context: { params: Promise<{ raiseId: string; id: string }> }
) {
  const { raiseId, id } = await context.params;
  const contactId = id; // keep route shape, but treat it as contact_id

  try {
    const { data, error } = await supabaseServer
      .from('raise_subscriptions')
      .update({
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .eq('raise_id', raiseId)
      .eq('contact_id', contactId)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Subscription not found for raise_id + contact_id' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unhandled error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
