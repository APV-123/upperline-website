import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type HighlightPayload = {
  id?: string;
  title: string;
  description: string;
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
    const highlights = (body?.highlights ?? []) as HighlightPayload[];

    if (!Array.isArray(highlights)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid highlights payload' },
        { status: 400 }
      );
    }

    //
    // Delete existing highlights
    //
    const { error: deleteError } = await supabaseServer
      .from('deal_highlights')
      .delete()
      .eq('deal_id', dealId);

    if (deleteError) {
      console.error('[HIGHLIGHTS DELETE ERROR]', deleteError);

      return NextResponse.json(
        {
          ok: false,
          error: deleteError.message,
        },
        { status: 500 }
      );
    }

    //
    // Nothing left to insert
    //
    if (highlights.length === 0) {
      return NextResponse.json({ ok: true });
    }

    //
    // Insert current highlights
    //
    const rows = highlights.map((h, index) => ({
      deal_id: dealId,
      title: h.title?.trim() ?? '',
      description: h.description?.trim() ?? '',
      display_order: h.display_order ?? index + 1,
      is_visible: h.is_visible ?? true,
    }));

    const { error: insertError } = await supabaseServer
      .from('deal_highlights')
      .insert(rows);

    if (insertError) {
      console.error('[HIGHLIGHTS INSERT ERROR]', insertError);

      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (e) {
    console.error('[HIGHLIGHTS UPSERT CRASH]', e);

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error',
      },
      { status: 500 }
    );
  }
}