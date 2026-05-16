import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type DraftRequest = {
  subject?: string;
  body?: string;
  invite_method?: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ raiseId: string; id: string }> }
) {
  const { raiseId, id } = await context.params;

  try {
    const body = (await req.json()) as DraftRequest;
    const { subject, body: invite_body, invite_method } = body;

    if (!subject || !invite_body) {
      return NextResponse.json(
        { ok: false, error: 'Missing subject or body' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from('raise_subscriptions')
      .update({
        invite_subject: subject,
        invite_body: invite_body,
        invite_method: invite_method ?? 'hubspot_outlook',
        invite_status: 'draft_ready',
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