import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type CreateBody = {
  name?: unknown;
  target_amount?: unknown;
  location?: unknown;
  estimated_closing_date?: unknown;
  overview_text?: unknown;

  // ✅ metrics
  project_unlevered_irr?: unknown;
  project_levered_irr?: unknown;
  target_lp_equity_multiple?: unknown;
  target_lp_levered_irr?: unknown;
  untrended_return_on_cost?: unknown;
  stabilized_return_on_cost?: unknown;
  total_equity_requirement?: unknown;
  construction_loan?: unknown;
  total_project_cost?: unknown;

  // ✅ images
  image_1_url?: unknown;
  image_2_url?: unknown;
  image_3_url?: unknown;

  
  // ✅ documents
  pitch_book_url?: unknown;
  abridged_memo_url?: unknown;
  full_memo_url?: unknown;
  full_memo_requires_ca?: unknown;

};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : null;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function makeRaiseId(name: string) {
  const base = slugify(name);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const name = cleanText(body.name);
    const target_amount = Number(body.target_amount ?? 0);

    const location = cleanText(body.location);
    const estimated_closing_date = cleanDate(body.estimated_closing_date);
    const overview_text = cleanText(body.overview_text);

    // ✅ metrics
    const project_unlevered_irr = cleanText(body.project_unlevered_irr);
    const project_levered_irr = cleanText(body.project_levered_irr);
    const target_lp_equity_multiple = cleanText(body.target_lp_equity_multiple);
    const target_lp_levered_irr = cleanText(body.target_lp_levered_irr);
    const untrended_return_on_cost = cleanText(body.untrended_return_on_cost);
    const stabilized_return_on_cost = cleanText(body.stabilized_return_on_cost);
    const total_equity_requirement = cleanText(body.total_equity_requirement);
    const construction_loan = cleanText(body.construction_loan);
    const total_project_cost = cleanText(body.total_project_cost);

    // ✅ images
    const image_1_url = cleanText(body.image_1_url);
    const image_2_url = cleanText(body.image_2_url);
    const image_3_url = cleanText(body.image_3_url);

      
    // ✅ documents
    const pitch_book_url = cleanText(body.pitch_book_url);
    const abridged_memo_url = cleanText(body.abridged_memo_url);
    const full_memo_url = cleanText(body.full_memo_url);
    const full_memo_requires_ca = Boolean(body.full_memo_requires_ca ?? false);


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

    const raise_id = makeRaiseId(name);

    const { data, error } = await supabaseServer
      .from('deals')
      .insert({
        name,
        raise_id,
        target_amount,
        location,
        estimated_closing_date,
        overview_text,

        // ✅ metrics
        project_unlevered_irr,
        project_levered_irr,
        target_lp_equity_multiple,
        target_lp_levered_irr,
        untrended_return_on_cost,
        stabilized_return_on_cost,
        total_equity_requirement,
        construction_loan,
        total_project_cost,

        // ✅ images
        image_1_url,
        image_2_url,
        image_3_url,

        // ✅ documents
        pitch_book_url,
        abridged_memo_url,
        full_memo_url,
        full_memo_requires_ca,

        is_public: false,
      })
      .select(`
        id,
        name,
        raise_id,
        target_amount,
        location,
        estimated_closing_date,
        overview_text,

        project_unlevered_irr,
        project_levered_irr,
        target_lp_equity_multiple,
        target_lp_levered_irr,
        untrended_return_on_cost,
        stabilized_return_on_cost,
        total_equity_requirement,
        construction_loan,
        total_project_cost,

        image_1_url,
        image_2_url,
        image_3_url,

        pitch_book_url,
        abridged_memo_url,
        full_memo_url,
        full_memo_requires_ca,

        is_public,
        created_at
      `);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, deal: data?.[0] ?? null },
      { status: 201 }
    );
  } catch (e) {
    console.error('[CREATE DEAL CRASH]', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
