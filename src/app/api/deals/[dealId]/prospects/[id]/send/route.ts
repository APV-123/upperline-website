import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  _req: Request,
  context: { params: Promise<{ dealId: string; id: string }> }
) {
  const { dealId, id } = await context.params;

  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/raises/${deal.raise_id}/prospective/${id}/send`,
    { method: 'POST' }
  );

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}