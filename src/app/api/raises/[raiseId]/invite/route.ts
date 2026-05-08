import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

/**
 * HubSpot auth helper
 */
function hsHeaders() {
  const raw = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!raw) throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');

  const token = raw.replace(/^['"]|['"]$/g, '').trim();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// 🔐 Hard-coded for now (you already resolved these IDs)
const PIPELINE_ID = '2243555049';
const INTRODUCED_STAGE_ID = '3604434673';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
) {
  const { raiseId } = await context.params;
  const body = await req.json();

  const {
    contactId,
    amount,
  }: {
    contactId: string;
    amount: number;
  } = body;

  if (!contactId || !amount) {
    return NextResponse.json(
      { ok: false, error: 'contactId and amount are required' },
      { status: 400 }
    );
  }

  /**
   * 1️⃣ Create HubSpot deal (Introduced stage)
   */
  const dealRes = await fetch(
    'https://api.hubapi.com/crm/v3/objects/deals',
    {
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
    }
  );

  if (!dealRes.ok) {
    const details = await dealRes.text();
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to create HubSpot deal',
        details,
      },
      { status: 500 }
    );
  }

  const deal = await dealRes.json();
  const dealId = deal.id;

  /**
   * 2️⃣ Associate contact ↔ deal
   */
  await fetch(
    `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`,
    {
      method: 'PUT',
      headers: hsHeaders(),
    }
  );

  /**
   * 3️⃣ Update Supabase subscription → invited
   */
  await supabaseServer
    .from('raise_subscriptions')
    .update({
      status: 'invited',
      invited_at: new Date().toISOString(),
    })
    .eq('raise_id', raiseId)
    .eq('contact_id', contactId);

  return NextResponse.json({
    ok: true,
    dealId,
  });
}