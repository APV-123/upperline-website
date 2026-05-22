import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type UpdateBody = {
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
  estimated_closing_date: string | null;
  overview_text: string | null;

  project_unlevered_irr: string | null;
  project_levered_irr: string | null;
  target_lp_equity_multiple: string | null;
  target_lp_levered_irr: string | null;
  untrended_return_on_cost: string | null;
  stabilized_return_on_cost: string | null;
  total_equity_requirement: string | null;
  construction_loan: string | null;
  total_project_cost: string | null;

  image_1_url: string | null;
  image_2_url: string | null;
  image_3_url: string | null;

  // docs are optional on update (only set if provided)
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

    const name = cleanText(body.name);
    const target_amount = Number(body.target_amount ?? 0);

    const location = cleanText(body.location);
    const estimated_closing_date = cleanDate(body.estimated_closing_date);
    const overview_text = cleanText(body.overview_text);

    // ✅ metrics parsing
    const project_unlevered_irr = cleanText(body.project_unlevered_irr);
    const project_levered_irr = cleanText(body.project_levered_irr);
    const target_lp_equity_multiple = cleanText(body.target_lp_equity_multiple);
    const target_lp_levered_irr = cleanText(body.target_lp_levered_irr);
    const untrended_return_on_cost = cleanText(body.untrended_return_on_cost);
    const stabilized_return_on_cost = cleanText(body.stabilized_return_on_cost);
    const total_equity_requirement = cleanText(body.total_equity_requirement);
    const construction_loan = cleanText(body.construction_loan);
    const total_project_cost = cleanText(body.total_project_cost);
    const image_1_url = cleanText(body.image_1_url);
    const image_2_url = cleanText(body.image_2_url);
    const image_3_url = cleanText(body.image_3_url);    

    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

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
      };

      // ✅ only include docs if actually provided (prevents wipes)
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
