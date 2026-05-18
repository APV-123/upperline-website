import { NextRequest, NextResponse } from 'next/server';

type Params = { raiseId: string };

function getHubSpotToken(): string | null {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) return null;
  return raw.replace(/^['"]|['"]$/g, '').trim();
}

function authHeaders(method: 'GET' | 'POST' | 'PUT'): Headers {
  const token = getHubSpotToken();

  const h = new Headers();
  if (token) h.set('authorization', `Bearer ${token}`);
  h.set('accept', 'application/json');
  if (method !== 'GET') h.set('content-type', 'application/json');

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
  const raw = await res.text();
  const json = parseJsonMaybe<T>(raw);
  return { ok: res.ok, status: res.status, raw, json };
}

const PIPELINE_ID = '2243555049';
const INTRODUCED_STAGE_ID = '3604434673';

export async function POST(
  req: NextRequest,
  context: { params: Params | Promise<Params> }
) {
  const { raiseId } = await context.params;

  const token = getHubSpotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Missing HUBSPOT_PRIVATE_APP_TOKEN' },
      { status: 500 }
    );
  }

  try {
    const { contactId, amount } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { ok: false, error: 'contactId is required' },
        { status: 400 }
      );
    }

    const DEFAULT_INVITE_AMOUNT = 250000;

    const normalizedAmount =
      amount === undefined || amount === null
        ? DEFAULT_INVITE_AMOUNT
        : amount;

    /**
     * 1. Create deal
     */
    const dealRes = await fetch(
      'https://api.hubapi.com/crm/v3/objects/deals',
      {
        method: 'POST',
        headers: authHeaders('POST'),
        body: JSON.stringify({
          properties: {
            dealname: `Investor – ${raiseId}`,
            amount: String(normalizedAmount),
            pipeline: PIPELINE_ID,
            dealstage: INTRODUCED_STAGE_ID,
            raise_id: raiseId,
          },
        }),
        cache: 'no-store',
      }
    );

    const dealRead = await readJsonOrText<{ id?: string }>(dealRes);

    if (!dealRead.ok || !dealRead.json?.id) {
      console.error(
        '[ADD INVESTOR DEAL CREATE FAILED]',
        dealRead.status,
        dealRead.raw.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error: 'Deal creation failed',
          status: dealRead.status,
          details: dealRead.raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const dealId = dealRead.json.id;

    /**
     * 2. Associate to contact
     */
    const assocRes = await fetch(
      `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`,
      {
        method: 'PUT',
        headers: authHeaders('PUT'),
        cache: 'no-store',
      }
    );

    const assocRead = await readJsonOrText<unknown>(assocRes);

    if (!assocRead.ok) {
      console.error(
        '[ADD INVESTOR ASSOCIATION FAILED]',
        assocRead.status,
        assocRead.raw.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error: 'Association failed',
          dealId,
          status: assocRead.status,
          details: assocRead.raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      dealId,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unhandled error';

    console.error('[ADD INVESTOR ERROR]', message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}