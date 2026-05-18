import { NextRequest, NextResponse } from 'next/server';
import { HUBSPOT_DEAL_STAGES } from '@/lib/hubspotStages';

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