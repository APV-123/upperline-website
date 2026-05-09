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

/**
 * GET /api/hubspot/contacts/search?q=&after=&limit=
 * Returns paged contacts for a simple typeahead / table.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get('q') ?? '').trim();
    const after = searchParams.get('after');
    const limit = Number(searchParams.get('limit') ?? 25);

    const payload: any = {
      limit: Math.min(Math.max(limit, 1), 50),
      properties: ['firstname', 'lastname', 'email'],
    };

    // HubSpot search supports free-text query across properties
    if (q) payload.query = q;
    if (after) payload.after = after;

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json({ ok: false, error: 'HubSpot contact search failed', details }, { status: 500 });
    }

    const json = await res.json();

    const results = (json.results ?? []).map((c: any) => ({
      id: String(c.id),
      firstname: c.properties?.firstname ?? '',
      lastname: c.properties?.lastname ?? '',
      email: c.properties?.email ?? '',
      name: `${c.properties?.firstname ?? ''} ${c.properties?.lastname ?? ''}`.trim(),
    }));

    const nextAfter = json.paging?.next?.after ?? null;

    return NextResponse.json({ ok: true, results, nextAfter });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unhandled error' }, { status: 500 });
  }
}
