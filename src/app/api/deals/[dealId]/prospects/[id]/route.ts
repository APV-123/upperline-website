import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ dealId: string; id: string }> }
) {
  const { dealId, id } = await context.params;

  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();
    const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' });
  }

  
  const res = await fetch(
    `${baseUrl}/api/raises/${deal.raise_id}/prospective/${id}`,
    { method: 'DELETE' }
  );

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}