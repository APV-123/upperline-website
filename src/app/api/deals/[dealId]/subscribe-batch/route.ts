import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;
  const payload = await req.json().catch(() => ({}));

  const supabase = supabaseServer;

  const { data: deal, error } = await supabase
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  const res = await fetch(
    `${baseUrl}/api/raises/${deal.raise_id}/subscribe-batch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const json = await res.json().catch(() => ({}));

  return NextResponse.json(json, { status: res.status });
}
