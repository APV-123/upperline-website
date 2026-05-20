import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/SupabaseServer";

export async function POST(
  _req: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await context.params;

  const { data: deal, error } = await supabaseServer
    .from("deals")
    .select("full_memo_url")
    .eq("id", dealId)
    .single<{ full_memo_url: string | null }>();

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

  return NextResponse.json({
    ok: true,
    signedUrl: signed.signedUrl,
  });
}