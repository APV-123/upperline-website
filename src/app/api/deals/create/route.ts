import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type CreateBody = {
  name?: unknown;
  target_amount?: unknown;
  location?: unknown;
  estimated_closing_date?: unknown; // "YYYY-MM-DD"
  overview_text?: unknown;
};

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
  // short-ish stable prefix + random suffix to avoid collisions
  const base = slugify(name);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const name = typeof body.name === 'string' ? body.name.trim() : null;
    const target_amount = Number(body.target_amount ?? 0);
    const location =
      typeof body.location === 'string' ? body.location.trim() : null;
    const estimated_closing_date = cleanDate(body.estimated_closing_date);
    const overview_text =
      typeof body.overview_text === 'string' ? body.overview_text.trim() : null;

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
        raise_id,                 // ✅ added
        target_amount,
        location,
        estimated_closing_date,
        overview_text,
        is_public: false,         // default = draft
      })
      .select('id, name, raise_id, target_amount, location, estimated_closing_date, overview_text, is_public, created_at');

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