
import { NextRequest, NextResponse } from 'next/server';

function hsHeaders() {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');

  const token = raw.replace(/^['"]|['"]$/g, '').trim();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// 🔑 HARD-CODE THESE FOR NOW (you already resolved them)
const PIPELINE_ID = '2243555049';
const INTRODUCED_STAGE_ID = '3604434673';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
) {
  try {
    const { raiseId } = await context.params;
    const { contactId, amount } = await req.json();    
    const DEFAULT_INVITE_AMOUNT = 250000;

    const normalizedAmount =
      amount === undefined || amount === null
        ? DEFAULT_INVITE_AMOUNT
        : amount;

    if (!contactId || amount === undefined || amount === null) {
      return NextResponse.json(
        { ok: false, error: 'contactId and amount are required' },
        { status: 400 }
      );
    }

    // 1️⃣ Create the deal
    const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify({
        properties: {
          dealname: `Investor – ${raiseId}`,
          amount: String(amount),
          pipeline: PIPELINE_ID,
          dealstage: INTRODUCED_STAGE_ID,
          raise_id: raiseId,
        },
      }),
    });

    if (!dealRes.ok) {
      const details = await dealRes.text();
      return NextResponse.json(
        { ok: false, error: 'Deal creation failed', details },
        { status: 500 }
      );
    }

    const deal = await dealRes.json();
    const dealId = deal.id;

    // 2️⃣ Associate deal ↔ contact (HubSpot default association)
    await fetch(
      `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`,
      {
        method: 'PUT',
        headers: hsHeaders(),
      }
    );

    return NextResponse.json({ ok: true, dealId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unhandled error' },
      { status: 500 }
    );
  }
}
