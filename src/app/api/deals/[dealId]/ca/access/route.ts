import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/SupabaseServer";

export async function POST(
  req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const email =
  typeof body?.email === "string"
    ? body.email.trim().toLowerCase()
    : null;

  const { data: deal, error } = await supabaseServer
  .from("deals")
  .select("raise_id, full_memo_url")
  .eq("id", dealId)
  .single<{
    raise_id: string | null;
    full_memo_url: string | null;
  }>();

  if (error || !deal?.full_memo_url) {
    return NextResponse.json(
      { ok: false, error: "Full memo not configured" },
      { status: 404 }
    );
  }

  const { data: signed, error: signErr } = await supabaseServer
    .storage
    .from("deal-documents-private")
    .createSignedUrl(deal.full_memo_url, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: "Failed to sign URL" },
      { status: 500 }
    );
  }

  if (email && deal?.raise_id) {
  const { data: subscription } =
    await supabaseServer
      .from("raise_subscriptions")
      .select("id")
      .eq("raise_id", deal.raise_id)
      .eq("contact_email", email)
      .single();

  if (subscription?.id) {
    await supabaseServer
      .from("raise_subscription_activity")
      .insert({
        raise_subscription_id: subscription.id,
        activity_type: "im_viewed",
        activity_source: "portal",
        metadata: {
          deal_id: dealId,
        },
      });

    await supabaseServer
      .from("raise_subscriptions")
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
  }
}
  return NextResponse.json({
    ok: true,
    signedUrl: signed.signedUrl,
  });
}