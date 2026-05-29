import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type MetricPayload = {
  key: string;
  value: string | null;
  section: string;
  display_order: number;
  is_visible: boolean;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  if (!dealId) {
    return NextResponse.json(
      { ok: false, error: 'Missing dealId' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const metrics = (body?.metrics ?? []) as MetricPayload[];

    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid metrics payload' },
        { status: 400 }
      );
    }

    const rows = metrics.map((m) => ({
      deal_id: dealId,
      key: m.key,
      value: m.value,
      section: m.section,
      display_order: m.display_order,
      is_visible: m.is_visible,
    }));

    const { error } = await supabaseServer
      .from('deal_metrics')
      .upsert(rows, {
        onConflict: 'deal_id,key',
      });

    if (error) {
      console.error('[METRICS UPSERT ERROR]', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[METRICS UPSERT CRASH]', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}