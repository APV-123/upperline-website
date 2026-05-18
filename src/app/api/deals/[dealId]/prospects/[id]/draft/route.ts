import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string; id: string };

type DraftPayload = {
  subject?: unknown;
  body?: unknown;
  invite_method?: unknown;
};

export async function POST(
  req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId, id } = await context.params; // id === contact_id

  try {
    const payload = (await req.json().catch(() => ({}))) as DraftPayload;

    const subject =
      typeof payload.subject === 'string' ? payload.subject.trim() : '';
    const body =
      typeof payload.body === 'string' ? payload.body.trim() : '';
    const invite_method =
      typeof payload.invite_method === 'string'
        ? payload.invite_method.trim()
        : null;

    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing contact_id' },
        { status: 400 }
      );
    }

    if (!subject || !body) {
      return NextResponse.json(
        { ok: false, error: 'Missing subject or body' },
        { status: 400 }
      );
    }

    // 1) Get raise_id for this deal
    const { data: deal, error: dealError } = await supabaseServer
      .from('deals')
      .select('raise_id')
      .eq('id', dealId)
      .single<{ raise_id: string }>();

    if (dealError || !deal?.raise_id) {
      return NextResponse.json(
        { ok: false, error: 'Missing raise_id' },
        { status: 400 }
      );
    }

    // 2) Update raise_subscriptions (your real "prospects" table)
    const { error: updateError } = await supabaseServer
      .from('raise_subscriptions')
      .update({
        invite_subject: subject,
        invite_body: body,
        invite_method,
        invite_status: 'draft_ready',
      })
      .eq('raise_id', deal.raise_id)
      .eq('contact_id', id);

    if (updateError) {
      console.error('[DRAFT UPDATE ERROR]', updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // ✅ Always return JSON (prevents "Unexpected end of JSON input")
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DRAFT ROUTE CRASH]', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}