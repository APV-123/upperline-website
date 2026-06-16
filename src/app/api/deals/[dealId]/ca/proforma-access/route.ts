import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/SupabaseServer";

export async function POST(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  const { data: deal, error } = await supabaseServer
    .from("deals")
    .select("proforma_url")
    .eq("id", dealId)
    .single<{ proforma_url: string | null }>();

  if (error || !deal?.proforma_url) {
    return NextResponse.json(
      { ok: false, error: "Financial model not configured" },
      { status: 404 }
    );
  }

  const { data: signed, error: signErr } = await supabaseServer
    .storage
    .from("deal-documents-private")
    .createSignedUrl(deal.proforma_url, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: "Failed to sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    signedUrl: signed.signedUrl,
  });
}