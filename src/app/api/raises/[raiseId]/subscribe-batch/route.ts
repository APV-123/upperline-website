import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';
import { getToken } from 'next-auth/jwt';

type InputContact = {
  contactId: string;
  contactName?: string;
  contactEmail?: string;
};

type SubscribeBatchRequest = {
  contacts?: InputContact[];
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ raiseId: string }> }
){
  try {
    const sessionToken = await getToken({
  req,
  secret: process.env.NEXTAUTH_SECRET,
});

const employeeEmail =
  typeof sessionToken?.email === 'string'
    ? sessionToken.email
    : null;

    const { raiseId } = await context.params;
    const { data: portalDeal } =
  await supabaseServer
    .from('deals')
    .select('id,name')
    .eq('raise_id', raiseId)
    .single();

const portalDealId =
  portalDeal?.id ?? null;

const dealName =
  portalDeal?.name ?? null;

    const body = (await req.json()) as SubscribeBatchRequest;
    const contacts = body?.contacts ?? [];

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'contacts[] is required' },
        { status: 400 }
      );
    }

    const rows = contacts.map((c) => ({
      raise_id: raiseId,
      contact_id: String(c.contactId),
      contact_name: c.contactName ?? null,
      contact_email: c.contactEmail ?? null,
      status: 'subscribed',
    }));

    const { data: existing } =
  await supabaseServer
    .from('raise_subscriptions')
    .select('contact_id')
    .eq('raise_id', raiseId)
    .in(
      'contact_id',
      contacts.map(c => String(c.contactId))
    );

const existingIds = new Set(
  (existing ?? []).map(x => String(x.contact_id))
);

    // Upsert prevents duplicates cleanly (unique(raise_id, contact_id))
    const { error } = await supabaseServer
      .from('raise_subscriptions')
      .upsert(rows, { onConflict: 'raise_id,contact_id' });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const { data: subscriptions } =
  await supabaseServer
    .from('raise_subscriptions')
    .select(`
      id,
      contact_id,
      contact_name,
      contact_email
    `)
    .eq('raise_id', raiseId)
    .in(
      'contact_id',
      contacts.map(c => String(c.contactId))
    );
    const newSubscriptions =
  subscriptions?.filter(
    sub => !existingIds.has(
      String(sub.contact_id)
    )
  ) ?? [];

if (newSubscriptions.length) {
  await supabaseServer
    .from('raise_subscription_activity')
    .insert(
      newSubscriptions.map(sub => ({
        raise_subscription_id: sub.id,

        activity_type: 'investor_created',

        activity_source: 'admin',

        created_by: employeeEmail,

        metadata: {
          contact_id: sub.contact_id,
          contact_name: sub.contact_name,
          contact_email: sub.contact_email,

          dealId: portalDealId,
          deal_name: dealName,
        },
      }))
    );
}

    return NextResponse.json({ ok: true, added: rows.length });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unhandled error';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}