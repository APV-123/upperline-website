import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

type Body = {
  email?: unknown;
  name?: unknown;
  company?: unknown;
};

function cleanText(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(req: Request, context: { params: Promise<Params> }) {
  const { dealId } = await context.params;

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = cleanText(body.email).toLowerCase();
  const name = cleanText(body.name);
  const company = cleanText(body.company);

  if (!dealId) {
    return NextResponse.json({ ok: false, error: 'Missing dealId' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Valid email required' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Name required' }, { status: 400 });
  }

  // capture basic request context
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const user_agent = req.headers.get('user-agent') ?? null;

  // 1) record CA acceptance
  const { error: caErr } = await supabaseServer
    .from('deal_ca_acceptances')
    .insert({ deal_id: dealId, email, name, company: company || null, ip, user_agent });

  if (caErr) {
    return NextResponse.json({ ok: false, error: caErr.message }, { status: 500 });
  }

  // 2) fetch full memo path from deals table
  const { data: deal, error: dealErr } = await supabaseServer
    .from('deals')
    .select('full_memo_url, full_memo_requires_ca')
    .eq('id', dealId)
    .single<{ full_memo_url: string | null; full_memo_requires_ca: boolean | null }>();

  if (dealErr || !deal?.full_memo_url) {
    return NextResponse.json({ ok: false, error: 'Full memo not configured' }, { status: 404 });
  }

  // 3) create signed URL from private bucket (10 minutes)
  const { data: signed, error: signErr } = await supabaseServer.storage
    .from('deal-documents-private')
    .createSignedUrl(deal.full_memo_url, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ ok: false, error: signErr?.message ?? 'Failed to sign URL' }, { status: 500 });
  }

  // 4) (optional next steps): HubSpot + AppFolio + portal subscription
  // Your internal plan explicitly calls for auto-creating a HubSpot contact and an AppFolio investor invite. 【1-449a0c】
  // We'll wire these in the next step after the modal works end-to-end.

  return NextResponse.json({ ok: true, signedUrl: signed.signedUrl });
}