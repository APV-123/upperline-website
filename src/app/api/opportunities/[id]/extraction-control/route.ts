import { NextResponse } from 'next/server';
import { requireUpperlineUser } from '@/lib/opportunities/application';
import { translateOpportunityHttpError } from '@/lib/opportunities/ui/server';
import { getExtractionControlState, runExtractionControl } from '@/lib/opportunities/ingestion/extraction-control';

export const runtime = 'nodejs';
export const maxDuration = 120;
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return respond(context, (id, actor) => getExtractionControlState(id, actor));
}
export async function POST(request: Request, context: Context) {
  return respond(context, async (id, actor) => runExtractionControl(id, actor, await readBody(request)));
}
async function respond(context: Context, operation: (id: string, actor: Awaited<ReturnType<typeof requireUpperlineUser>>) => Promise<unknown>) {
  try {
    const actor = await requireUpperlineUser(); const { id } = await context.params;
    return NextResponse.json({ ok: true, data: await operation(id, actor) });
  } catch (cause) {
    const translated = translateOpportunityHttpError(cause);
    const extractionStatus: Record<string, number> = { artifact_not_ready: 409, extraction_already_running: 409,
      extraction_retry_not_allowed: 409, provider_timeout: 504, provider_failure: 502,
      provider_invalid_output: 422, extraction_contract_violation: 500, persistence_failure: 503 };
    return NextResponse.json({ ok: false, error: translated.error },
      { status: extractionStatus[translated.error.kind] ?? translated.status });
  }
}
async function readBody(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return null; }
}
