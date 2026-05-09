import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type InputContact = {
  contactId: string;
  contactName?: string;
  contactEmail?: string;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
) {
  try {
    const { raiseId } = await context.params;
    const body = await req.json();

    const contacts: InputContact[] = body?.contacts ?? [];
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ ok: false, error: 'contacts[] is required' }, { status: 400 });
    }

    const rows = contacts.map((c) => ({
      raise_id: raiseId,
      contact_id: String(c.contactId),
      contact_name: c.contactName ?? null,
      contact_email: c.contactEmail ?? null,
      status: 'subscribed',
    }));

    // Upsert prevents duplicates cleanly (unique(raise_id, contact_id))
    const { error } = await supabaseServer
      .from('raise_subscriptions')
      .upsert(rows, { onConflict: 'raise_id,contact_id' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, added: rows.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unhandled error' }, { status: 500 });
  }
}
