
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

export async function GET(
  req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  // 1) Fetch deal -> raise_id
  const { data: deal, error } = await supabaseServer
    .from('deals')
    .select('raise_id')
    .eq('id', dealId)
    .single();

  if (error) {
    console.error('[DEAL LOOKUP ERROR]', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch deal' },
      { status: 500 }
    );
  }

  if (!deal?.raise_id) {
    return NextResponse.json(
      { ok: false, error: 'Missing raise_id' },
      { status: 400 }
    );
  }

  // 2) Call existing hubspot logic (but correctly, in production)
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get('cookie') ?? '';

  const url = `${origin}/api/hubspot/raises/${deal.raise_id}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      cookie, // ✅ forward auth/session
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[HUBSPOT RAISE FETCH FAILED]', res.status, text.slice(0, 300));
    return NextResponse.json(
      {
        ok: false,
        error: `Hubspot raises fetch failed (${res.status})`,
        details: text.slice(0, 300),
      },
      { status: 502 }
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('[HUBSPOT RAISE NON-JSON]', text.slice(0, 300));
    return NextResponse.json(
      {
        ok: false,
        error: 'Hubspot raises returned non-JSON response',
        details: text.slice(0, 300),
      },
      { status: 502 }
    );
  }

  const json = await res.json();
  return NextResponse.json(json);
}
