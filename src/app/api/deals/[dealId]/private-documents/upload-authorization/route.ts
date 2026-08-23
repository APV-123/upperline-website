export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireUpperlineUser } from '../../../../../../lib/opportunities/application/actor';
import { supabaseServer } from '../../../../../../lib/SupabaseServer';
import { authorizePrivateDealDocumentUpload, parsePrivateDealUploadRequest, PrivateDealUploadError } from '../../../../../../lib/deals/private-document-upload-server';

type Params = { dealId: string };
export async function POST(request: Request, context: { params: Promise<Params> }) {
  try {
    await requireUpperlineUser(); const { dealId } = await context.params;
    const result = await authorizePrivateDealDocumentUpload({ dealId,
      request: parsePrivateDealUploadRequest(await request.json().catch(() => null)), client: supabaseServer });
    return NextResponse.json({ ok: true, data: result });
  } catch (cause) {
    const kind = errorKind(cause);
    if (kind === 'unauthorized') return safeError(401, 'Authentication is required.');
    if (kind === 'forbidden') return safeError(403, 'Upperline access is required.');
    if (cause instanceof PrivateDealUploadError) {
      return safeError(cause.kind === 'validation' ? 400 : cause.kind === 'not_found' ? 404 : 503, cause.message);
    }
    return safeError(500, 'Private document upload could not be authorized.');
  }
}
function errorKind(value: unknown): string | null {
  return value && typeof value === 'object' && 'kind' in value && typeof value.kind === 'string' ? value.kind : null;
}
function safeError(status: number, message: string) { return NextResponse.json({ ok: false, error: { message } }, { status }); }
