import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const { amount } = await req.json();

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
          //To find internal id for dealstage Hubspot Data Management > Data Model> Deals > Deal Stage
          dealstage: '3604434677',
          amount: String(amount),
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}