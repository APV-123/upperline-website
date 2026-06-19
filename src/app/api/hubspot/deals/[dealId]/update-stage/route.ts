import { NextRequest, NextResponse } from 'next/server';
import { HUBSPOT_DEAL_STAGES,
         STAGE_ID_TO_LABEL,
 } from '@/lib/hubspotStages';
import { supabaseServer } from '@/lib/SupabaseServer';
import { getToken } from 'next-auth/jwt';

type Params = { dealId: string };

function getHubSpotToken(): string | null {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) return null;
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function authHeaders(): Headers {
  const token = getHubSpotToken();

  const h = new Headers();
  if (token) h.set('authorization', `Bearer ${token}`);
  h.set('accept', 'application/json');
  h.set('content-type', 'application/json');

  return h;
}

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
  const raw = await res.text(); // ✅ read once
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

export async function POST(
  req: NextRequest,
  context: { params: Params | Promise<Params> }
) {
  const { dealId } = await context.params;

  const sessionToken = await getToken({
  req,
  secret: process.env.NEXTAUTH_SECRET,
});

const employeeEmail =
  typeof sessionToken?.email === 'string'
    ? sessionToken.email
    : null;

  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Missing HUBSPOT_PRIVATE_APP_TOKEN' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const stageId = body?.stageId;
    const amount = body?.amount;
    const raiseSubscriptionId =
      body?.raiseSubscriptionId ?? null;

    if (!dealId) {
      return NextResponse.json(
        { ok: false, error: 'Missing dealId' },
        { status: 400 }
      );
    }

    // ✅ Validate stageId
    const isValidStage = HUBSPOT_DEAL_STAGES.some(
      (stage) => stage.id === stageId
    );

    if (!isValidStage) {
      return NextResponse.json(
        { ok: false, error: 'Invalid stageId' },
        { status: 400 }
      );
    }

    const currentDealRes = await fetch(
  `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealstage`,
  {
    headers: authHeaders(),
    cache: 'no-store',
  }
);

const currentDealRead = await readJsonOrText<{
  properties?: {
    dealstage?: string;
  };
}>(currentDealRes);

const previousStage =
  currentDealRead.json?.properties?.dealstage ??
  null;

  const previousStageLabel =
  previousStage
    ? STAGE_ID_TO_LABEL[previousStage] ??
      previousStage
    : null;

const newStageLabel =
  stageId
    ? STAGE_ID_TO_LABEL[stageId] ??
      stageId
    : null;

    const { data: dealRecord } =
  await supabaseServer
    .from('deals')
    .select('name')
    .eq('id', dealId)
    .single();

const dealName =
  dealRecord?.name ?? null;

    const hubspotRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          properties: {
            dealstage: stageId,
            ...(amount != null ? { amount: String(amount) } : {}),
          },
        }),
        cache: 'no-store',
      }
    );

    const read = await readJsonOrText(hubspotRes);

    if (!read.ok) {
      console.error(
        '[UPDATE STAGE FAILED]',
        read.status,
        read.raw.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error: 'HubSpot update failed',
          status: read.status,
          details: read.raw.slice(0, 500),
        },
        { status: 502 }
      );
    }
    const { error: activityError } =
  await supabaseServer
    .from('raise_subscription_activity')
    .insert({
      raise_subscription_id:
        raiseSubscriptionId,

      activity_type: 'status_changed',
      activity_source: 'admin',
      created_by: employeeEmail,

      metadata: {
        from: previousStageLabel,
        to: newStageLabel,
        deal_id: dealId,
        deal_name: dealName,
      },
    });

console.log(
  '[ACTIVITY INSERT]',
  {
    raiseSubscriptionId,
    employeeEmail,
    previousStageLabel,
    newStageLabel,
    dealName,
  }
);

console.error(
  '[ACTIVITY INSERT ERROR]',
  activityError
);

  await supabaseServer
    .from('raise_subscriptions')
    .update({
      last_activity_at:
        new Date().toISOString(),
    })
    .eq('id', raiseSubscriptionId);

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';

    console.error('[UPDATE STAGE ERROR]', message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}