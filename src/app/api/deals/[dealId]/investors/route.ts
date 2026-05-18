import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function GET(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  // 1. Fetch deal
  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error || !deal?.raise_id) {
    return NextResponse.json({ ok: false, error: 'Missing raise_id' });
  }

  // 2. Call your EXISTING logic
  
    const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';


    const res = await fetch(
    `${baseUrl}/api/hubspot/raises/${deal.raise_id}`,
    { cache: 'no-store' }
    );


  const json = await res.json();

  return NextResponse.json(json);
}