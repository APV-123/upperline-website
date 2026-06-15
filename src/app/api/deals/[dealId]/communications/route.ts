import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type CommunicationPayload = {
  name: string;
  step_order: number;
  delay_days: number;
  subject: string;
  body: string;
  is_active: boolean;
};

export async function GET(
  req: Request,
  context: {
    params: Promise<{ dealId: string }>;
  }
) {
  const { dealId } =
    await context.params;

  const { data: deal } =
  await supabaseServer
    .from('deals')
    .select(`
      name,
      location,
      asset_class,
      strategy,
      thesis
    `)
    .eq('id', dealId)
    .single();

  const { data: metrics } =
    await supabaseServer
      .from('deal_metrics')
      .select('key')
      .eq('deal_id', dealId);
      
  const tokens = [
    'deal_name',
    'location',
    'asset_class',
    'strategy',
    'thesis',
    ...(metrics ?? []).map(
      (m) => m.key
    ),
  ];    

  const { data, error } =
    await supabaseServer
      .from(
        'deal_communication_templates'
      )
      .select('*')
      .eq('deal_id', dealId)
      .order('step_order');

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
  ok: true,
  templates: data ?? [],
  tokens,
});

export async function POST(
  req: Request,
  context: {
    params: Promise<{ dealId: string }>;
  }
) {
  const { dealId } =
    await context.params;

  if (!dealId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing dealId',
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    const templates =
      (body?.templates ??
        []) as CommunicationPayload[];

    if (
      !Array.isArray(templates)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Invalid communications payload',
        },
        { status: 400 }
      );
    }

    const rows =
      templates.map((t) => ({
        deal_id: dealId,
        name: t.name,
        step_order:
          t.step_order,
        delay_days:
          t.delay_days,
        subject: t.subject,
        body: t.body,
        is_active:
          t.is_active,
      }));

    const {
      error: deleteError,
    } =
      await supabaseServer
        .from(
          'deal_communication_templates'
        )
        .delete()
        .eq('deal_id', dealId);

    if (deleteError) {
      console.error(
        '[COMM DELETE ERROR]',
        deleteError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            deleteError.message,
        },
        { status: 500 }
      );
    }

    if (rows.length > 0) {
      const {
        error: insertError,
      } =
        await supabaseServer
          .from(
            'deal_communication_templates'
          )
          .insert(rows);

      if (insertError) {
        console.error(
          '[COMM INSERT ERROR]',
          insertError
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              insertError.message,
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
      '[COMM SAVE CRASH]',
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          'Server error',
      },
      { status: 500 }
    );
  }
}