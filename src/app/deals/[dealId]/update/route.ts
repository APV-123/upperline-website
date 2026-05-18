import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(req: Request, { params }: any) {
  const { dealId } = params;
  const body = await req.json();

  const { name, target_amount } = body;

  const { error } = await supabaseServer
    .from('deals')
    .update({
      name,
      target_amount,
    })
    .eq('id', dealId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({ ok: true });
}
