import { NextResponse } from 'next/server';

const HUBSPOT_BASE = 'https://api.hubapi.com';

function authHeaders() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function POST(
  req: Request,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    const { body } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { ok: false, error: 'Missing contactId' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing note body' },
        { status: 400 }
      );
    }

    const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/notes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        properties: {
          hs_note_body: body,
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                // NOTE → CONTACT
                associationTypeId: 202,
              },
            ],
          },
        ],
      }),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error('[HubSpot NOTE error]', res.status, responseText);
      return NextResponse.json(
        { ok: false, error: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[NOTE route exception]', e);
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}