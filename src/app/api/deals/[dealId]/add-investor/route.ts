import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;
  const payload = await req.json().catch(() => ({}));

  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/hubspot/raises/${deal.raise_id}/add-investor`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
