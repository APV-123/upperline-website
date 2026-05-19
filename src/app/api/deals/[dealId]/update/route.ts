import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type UpdateBody = {
  name?: unknown;
  target_amount?: unknown;
  location?: unknown;
  estimated_closing_date?: unknown;
  overview_text?: unknown;
};

function cleanDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function POST(
  req: Request,
  context: { params: Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    const body = (await req.json().catch(() => ({}))) as UpdateBody;

    const name = typeof body.name === 'string' ? body.name.trim() : null;
    const target_amount = Number(body.target_amount ?? 0);
    const location = typeof body.location === 'string' ? body.location.trim() : null;
    const estimated_closing_date = cleanDate(body.estimated_closing_date);
    const overview_text = typeof body.overview_text === 'string' ? body.overview_text.trim() : null;

    if (!dealId) {
      return NextResponse.json({ ok: false, error: 'Missing dealId' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Invalid name' }, { status: 400 });
    }
    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid target_amount' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('deals')
      .update({
        name,
        target_amount,
        location,
        estimated_closing_date,
        overview_text,
      })
      .eq('id', dealId)
      .select();

    if (error) {
      console.error('[DEAL UPDATE ERROR]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: 'No rows updated (bad dealId?)' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deal: data[0] });
  } catch (e) {
    console.error('[DEAL UPDATE CRASH]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
