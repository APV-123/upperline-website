import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
) {
  const { raiseId } = await context.params;
  const body = await req.json();

  const {
    contactId,
    contactName,
    contactEmail,
  }: {
    contactId: string;
    contactName?: string;
    contactEmail?: string;
  } = body;

  if (!contactId) {
    return NextResponse.json(
      { ok: false, error: 'contactId is required' },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from('raise_subscriptions')
    .insert({
      raise_id: raiseId,
      contact_id: contactId,
      contact_name: contactName ?? null,
      contact_email: contactEmail ?? null,
      status: 'subscribed',
    });

  if (error) {
    // Unique constraint hit → already subscribed (safe to ignore)
    if (error.code === '23505') {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}