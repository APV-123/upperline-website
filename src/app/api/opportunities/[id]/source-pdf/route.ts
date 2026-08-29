import { NextResponse } from 'next/server';
import { requireUpperlineUser } from '@/lib/opportunities/application';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { createOpportunitySourcePdfAccess } from '@/lib/opportunities/ingestion/source-pdf-access';
import { translateOpportunityHttpError } from '@/lib/opportunities/ui/server';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUpperlineUser();
    const { id } = await context.params;
    const pageValue = new URL(request.url).searchParams.get('page');
    const page = pageValue === null ? null : Number(pageValue);
    return NextResponse.redirect(await createOpportunitySourcePdfAccess(createOpportunitySupabaseClient(), id, page), 307);
  } catch (cause) {
    const translated = translateOpportunityHttpError(cause);
    return NextResponse.json({ ok: false, error: translated.error }, { status: translated.status });
  }
}
