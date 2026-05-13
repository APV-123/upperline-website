import { NextRequest, NextResponse } from 'next/server';
import { HUBSPOT_DEAL_STAGES } from '@/lib/hubspotStages';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const { stageId, amount } = await req.json();

  // ✅ Defensive validation: only allow known stage IDs
  const isValidStage = HUBSPOT_DEAL_STAGES.some(
    (stage) => stage.id === stageId
  );

  if (!isValidStage) {
    return NextResponse.json(
      { ok: false, error: 'Invalid stageId' },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          dealstage: stageId,
          ...(amount != null ? { amount: String(amount) } : {}),
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { ok: false, error: text },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}