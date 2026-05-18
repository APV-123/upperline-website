import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = { dealId: string };

function parseJsonMaybe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readJsonOrText<T>(res: Response): Promise<{
  ok: boolean;
  status: number;
  raw: string;
  json: T | null;
}> {
  const raw = await res.text();
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

export async function POST(
  req: Request,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  const payload = await req.json().catch(() => ({}));
  const supabase = supabaseServer;

  try {
    // 1. Get raise_id
    const { data: deal, error } = await supabase
      .from('deals')
      .select('raise_id')
      .eq('id', dealId)
      .single();

    if (error || !deal?.raise_id) {
      return NextResponse.json(
        { ok: false, error: 'Missing raise_id' },
        { status: 400 }
      );
    }

    // ✅ FIX: use request origin (not env)
    const origin = new URL(req.url).origin;

    // ✅ FIX: forward cookies (critical)
    const cookie = req.headers.get('cookie') ?? '';

    const res = await fetch(
      `${origin}/api/hubspot/raises/${deal.raise_id}/add-investor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie,
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    const read = await readJsonOrText<unknown>(res);

    if (!read.ok) {
      console.error(
        '[DEAL → RAISE ADD INVESTOR FAILED]',
        read.status,
        read.raw.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error: 'Add investor failed',
          status: read.status,
          details: read.raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(read.json ?? { ok: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';

    console.error('[DEAL ADD INVESTOR ERROR]', message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}