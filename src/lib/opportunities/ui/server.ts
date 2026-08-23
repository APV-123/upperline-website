import 'server-only';
import { NextResponse } from 'next/server';
import { requireUpperlineUser, OpportunityApplicationError, SupabaseOpportunityRepository } from '../application';
import { PersistenceEnvelopeValidationError } from '../underwriting/retail-development-persistence';
export type OpportunityServerContext = { actor: Awaited<ReturnType<typeof requireUpperlineUser>>; repository: SupabaseOpportunityRepository };
export type OpportunityHttpError = {
  status: number;
  error: { kind: string; message: string };
};

const HTTP_STATUS_BY_KIND: Partial<Record<OpportunityApplicationError['kind'], number>> = {
  unauthorized: 401, forbidden: 403, not_found: 404, ingestion_not_found: 404,
  revision_conflict: 409, integrity_conflict: 409, idempotency_conflict: 409,
  upload_conflict: 409, artifact_conflict: 409,
  validation: 400, invalid_upload_request: 400, unsupported_document: 415,
  invalid_pdf: 422, encrypted_pdf: 422, malformed_pdf: 422, pdf_page_limit: 422,
  upload_too_large: 413, upload_missing: 404, storage_unavailable: 503,
  verification_failure: 500,
};

export function translateOpportunityHttpError(cause: unknown): OpportunityHttpError {
  if (cause instanceof OpportunityApplicationError) {
    return {
      status: HTTP_STATUS_BY_KIND[cause.kind] ?? 500,
      error: { kind: cause.kind, message: cause.message },
    };
  }
  if (cause instanceof PersistenceEnvelopeValidationError) {
    const issues = cause.issues.slice(0, 8)
      .map(issue => issue.replace(/[^A-Za-z0-9 .:[\]_()-]/g, '').slice(0, 180));
    return { status: 400, error: { kind: 'validation',
      message: `Underwriting assumptions are invalid: ${issues.join('; ')}` } };
  }
  return { status: 500, error: { kind: 'unexpected',
    message: 'The Opportunity request could not be completed.' } };
}

export async function opportunityEndpoint<T>(
  operation: (context: OpportunityServerContext) => Promise<T>,
) {
  try {
    const actor = await requireUpperlineUser();
    return NextResponse.json({ ok: true,
      data: await operation({ actor, repository: new SupabaseOpportunityRepository() }) });
  } catch (cause) {
    const translated = translateOpportunityHttpError(cause);
    return NextResponse.json({ ok: false, error: translated.error }, { status: translated.status });
  }
}

export async function authenticatedOpportunityEndpoint<T>(
  operation: (actor: OpportunityServerContext['actor']) => Promise<T>,
) {
  try {
    const actor = await requireUpperlineUser();
    return NextResponse.json({ ok: true, data: await operation(actor) });
  } catch (cause) {
    const translated = translateOpportunityHttpError(cause);
    return NextResponse.json({ ok: false, error: translated.error }, { status: translated.status });
  }
}
