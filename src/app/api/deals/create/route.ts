export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type CreateBody = {
  name?: unknown;
  target_amount?: unknown;
};

function cleanText(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function makeRaiseId(name: string) {
  const base = slugify(name);
  const suffix = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `${base}-${suffix}`;
}

 const DEFAULT_METRICS = [
    {
      key: 'lp_irr',
      label: 'LP IRR',
      section: 'lp_summary',
      display_order: 1,
    },
    {
      key: 'lp_moic',
      label: 'LP Equity Multiple (MOIC)',
      section: 'lp_summary',
      display_order: 2,
    },
    {
      key: 'minimum_investment',
      label: 'Minimum Investment',
      section: 'lp_summary',
      display_order: 3,
    },

    {
      key: 'project_unlevered_irr',
      label: 'Project Unlevered IRR',
      section: 'project_returns',
      display_order: 1,
    },
    {
      key: 'project_levered_irr',
      label: 'Project Levered IRR',
      section: 'project_returns',
      display_order: 2,
    },

    {
      key: 'gp_equity',
      label: 'GP Equity',
      section: 'capital_stack',
      display_order: 1,
    },
  ];

export async function POST(req: Request) {
  try {
    const body = (await req
      .json()
      .catch(() => ({}))) as CreateBody;

    const name =
      cleanText(body.name) || 'Untitled Deal';

    const target_amount = Number(
      body.target_amount ?? 1
    );

    const raise_id = makeRaiseId(name);

    const { data, error } = await supabaseServer
      .from('deals')
      .insert({
        name,
        raise_id,
        target_amount,
        is_public: false,
      })
      .select(`
        id,
        name,
        raise_id,
        target_amount,
        is_public,
        created_at
      `)
      .single();

    if (error) {
      console.error(
        '[CREATE DEAL ERROR]',
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
   
  const { error: metricsError } =
  await supabaseServer
    .from('deal_metrics')
    .insert(
      DEFAULT_METRICS.map((m) => ({
        deal_id: data.id,
        key: m.key,
        label: m.label,
        section: m.section,
        display_order: m.display_order,
        value: null,
        is_visible: true,
      }))
    );

    if (metricsError) {
      console.error(
        '[CREATE DEFAULT METRICS ERROR]',
        metricsError
      );

      return NextResponse.json(
        {
          ok: false,
          error: metricsError.message,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        deal: data,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(
      '[CREATE DEAL CRASH]',
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