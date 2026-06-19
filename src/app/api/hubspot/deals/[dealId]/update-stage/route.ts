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

    if (!raiseSubscriptionId) {
  return NextResponse.json(
    {
      ok: false,
      error: 'Missing raiseSubscriptionId',
    },
    { status: 400 }
  );
}

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
  `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealstage,amount`,
  {
    headers: authHeaders(),
    cache: 'no-store',
  }
);

const currentDealRead = await readJsonOrText<{
  properties?: {
    dealstage?: string;
    amount?: string;
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
    const previousAmount =
  Number(
    currentDealRead.json?.properties?.amount ?? 0
  );

const newStageLabel =
  stageId
    ? STAGE_ID_TO_LABEL[stageId] ??
      stageId
    : null;

    const { data: subscription } =
  await supabaseServer
    .from('raise_subscriptions')
    .select('raise_id')
    .eq('id', raiseSubscriptionId)
    .single();

    if (!subscription?.raise_id) {
  return NextResponse.json(
    {
      ok: false,
      error: 'Subscription not found',
    },
    { status: 404 }
  );
}

const { data: portalDeal } =
  await supabaseServer
    .from('deals')
    .select('id,name')
    .eq('raise_id', subscription?.raise_id)
    .single();

const portalDealId =
  portalDeal?.id ?? null;

const dealName =
  portalDeal?.name ?? null;

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
    if (previousStageLabel !== newStageLabel) {
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
          deal_id: portalDealId,
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

  if (activityError) {
    console.error(
      '[ACTIVITY INSERT ERROR]',
      activityError
    );
  }
}
if (
  previousStageLabel !== 'Committed' &&
  newStageLabel === 'Committed'
) {
  const { error: commitmentError } =
    await supabaseServer
      .from('raise_subscription_activity')
      .insert({
        raise_subscription_id:
          raiseSubscriptionId,

        activity_type:
          'commitment_created',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          amount: Number(amount ?? 0),
          deal_id: portalDealId,
          deal_name: dealName,
        },
      });

  if (commitmentError) {
    console.error(
      '[COMMITMENT CREATED ERROR]',
      commitmentError
    );
  }
}
if (
  previousStageLabel === 'Committed' &&
  newStageLabel === 'Committed' &&
  previousAmount !== Number(amount)
) {
  const { error: commitmentUpdateError } =
    await supabaseServer
      .from('raise_subscription_activity')
      .insert({
        raise_subscription_id:
          raiseSubscriptionId,

        activity_type:
          'commitment_updated',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          old_amount: previousAmount,
          new_amount: Number(amount ?? 0),
          deal_id: portalDealId,
          deal_name: dealName,
        },
      });

  if (commitmentUpdateError) {
    console.error(
      '[COMMITMENT UPDATED ERROR]',
      commitmentUpdateError
    );
  }
}
if (
  previousStageLabel === 'Committed' &&
  newStageLabel === 'Funded'
) {
  const { error: fundedError } =
    await supabaseServer
      .from('raise_subscription_activity')
      .insert({
        raise_subscription_id:
          raiseSubscriptionId,

        activity_type: 'funded',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          amount: Number(amount ?? 0),
          deal_id: portalDealId,
          deal_name: dealName,
        },
      });

  if (fundedError) {
    console.error(
      '[FUNDED ERROR]',
      fundedError
    );
  }
}
if (
  previousStageLabel === 'Committed' &&
  newStageLabel !== 'Committed' &&
  newStageLabel !== 'Funded'
) {
  const { error: removedError } =
    await supabaseServer
      .from('raise_subscription_activity')
      .insert({
        raise_subscription_id:
          raiseSubscriptionId,

        activity_type:
          'commitment_removed',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          amount: previousAmount,
          new_status: newStageLabel,
          deal_id: portalDealId,
          deal_name: dealName,
        },
      });

  if (removedError) {
    console.error(
      '[COMMITMENT REMOVED ERROR]',
      removedError
    );
  }
}

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