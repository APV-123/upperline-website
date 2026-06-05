import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type MetricPayload = {
  key: string;
  label: string;
  icon?: string;
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

    const metrics = (
      body?.metrics ?? []
    ) as MetricPayload[];

    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid metrics payload',
        },
        { status: 400 }
      );
    }

    const rows = metrics.map((m) => ({
      deal_id: dealId,
      key: m.key,
      label: m.label,
      icon: m.icon,
      value: m.value,
      section: m.section,
      display_order: m.display_order,
      is_visible: m.is_visible,
    }));

    //
    // STEP 1
    // Remove all existing metrics
    //
    const { error: deleteError } =
      await supabaseServer
        .from('deal_metrics')
        .delete()
        .eq('deal_id', dealId);

    if (deleteError) {
      console.error(
        '[METRICS DELETE ERROR]',
        deleteError
      );

      return NextResponse.json(
        {
          ok: false,
          error: deleteError.message,
        },
        { status: 500 }
      );
    }

    //
    // STEP 2
    // Reinsert current editor state
    //
    if (rows.length > 0) {
      const { error: insertError } =
        await supabaseServer
          .from('deal_metrics')
          .insert(rows);

      if (insertError) {
        console.error(
          '[METRICS INSERT ERROR]',
          insertError
        );

        return NextResponse.json(
          {
            ok: false,
            error: insertError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
    });

  } catch (e) {
    console.error(
      '[METRICS SAVE CRASH]',
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error',
      },
      { status: 500 }
    );
  }
}