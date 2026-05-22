import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export const runtime = 'nodejs';

async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ dealId: string; id: string }> }
) {
  const { dealId, id } = await context.params;

  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' }, { status: 400 });
  }

  // ✅ mirror dashboard approach: origin + cookie forwarding
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get('cookie') ?? '';

  const res = await fetch(
    `${origin}/api/raises/${deal.raise_id}/prospective/${id}/send`,
    {
      method: 'POST',
      headers: {
        cookie,
        accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  const json = await safeJson<Record<string, unknown>>(res);

  if (!json) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { ok: false, error: `Non-JSON response from downstream send route (${res.status})`, details: text.slice(0, 300) },
      { status: 500 }
    );
  }

  return NextResponse.json(json, { status: res.status });
}