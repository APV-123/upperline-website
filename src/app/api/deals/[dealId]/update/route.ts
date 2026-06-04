export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type UpdateBody = {
  name?: unknown;
  target_amount?: unknown;
  location?: unknown;
  asset_class?: unknown;
  strategy?: unknown;
  estimated_closing_date?: unknown;
  why_we_like_it?: unknown;
  overview_text?: unknown;
  business_plan_text?: unknown;

  image_1_url?: unknown;
  image_2_url?: unknown;
  image_3_url?: unknown;

  pitch_book_url?: unknown;
  abridged_memo_url?: unknown;
  full_memo_url?: unknown;
  full_memo_requires_ca?: unknown;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length ? v : null;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function cleanBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return null;
}

type DealUpdatePayload = {
  name: string;
  target_amount: number;
  location: string | null;
  asset_class: string | null;
  strategy: string | null;
  estimated_closing_date: string | null;
  why_we_like_it: string | null;
  overview_text: string | null;
  business_plan_text: string | null;

  image_1_url: string | null;
  image_2_url: string | null;
  image_3_url: string | null;

  pitch_book_url?: string | null;
  abridged_memo_url?: string | null;
  full_memo_url?: string | null;
  full_memo_requires_ca?: boolean | null;
};

export async function POST(
  req: Request,
  context: { params: Promise<Params> }
) {
  const { dealId } = await context.params;

  try {
    const body = (await req.json().catch(() => ({}))) as UpdateBody;

    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

    const name = cleanText(body.name);
    const target_amount = Number(body.target_amount ?? 0);

    const location = cleanText(body.location);
    const asset_class = cleanText(body.asset_class);
    const strategy = cleanText(body.strategy);
    const estimated_closing_date = cleanDate(body.estimated_closing_date);
    const why_we_like_it = cleanText(body.why_we_like_it);
    const overview_text = cleanText(body.overview_text);
    const business_plan_text = cleanText(body.business_plan_text);

    const image_1_url = cleanText(body.image_1_url);
    const image_2_url = cleanText(body.image_2_url);
    const image_3_url = cleanText(body.image_3_url);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Invalid name' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid target_amount' },
        { status: 400 }
      );
    }

    const updatePayload: DealUpdatePayload = {
      name,
      target_amount,
      location,
      asset_class,
      strategy,
      estimated_closing_date,
      why_we_like_it,
      overview_text,
      business_plan_text,
      image_1_url,
      image_2_url,
      image_3_url,
    };

    // only include docs if explicitly provided
    if (body.pitch_book_url !== undefined) {
      updatePayload.pitch_book_url = cleanText(body.pitch_book_url);
    }

    if (body.abridged_memo_url !== undefined) {
      updatePayload.abridged_memo_url = cleanText(body.abridged_memo_url);
    }

    if (body.full_memo_url !== undefined) {
      updatePayload.full_memo_url = cleanText(body.full_memo_url);
    }

    if (body.full_memo_requires_ca !== undefined) {
      updatePayload.full_memo_requires_ca = cleanBool(body.full_memo_requires_ca);
    }

    const { data, error } = await supabaseServer
      .from('deals')
      .update(updatePayload)
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      console.error('[DEAL UPDATE ERROR]', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'No rows updated (bad dealId?)' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, deal: data });
  } catch (e) {
    console.error('[DEAL UPDATE CRASH]', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
