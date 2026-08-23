export type OpportunityErrorKind =
  | 'unauthorized' | 'forbidden' | 'not_found' | 'revision_conflict'
  | 'validation' | 'immutable' | 'integrity_conflict' | 'calculation' | 'persistence'
  | 'invalid_upload_request' | 'unsupported_document' | 'upload_too_large'
  | 'ingestion_not_found' | 'idempotency_conflict' | 'upload_conflict'
  | 'upload_missing' | 'invalid_pdf' | 'encrypted_pdf' | 'malformed_pdf'
  | 'pdf_page_limit' | 'verification_failure' | 'artifact_conflict' | 'storage_unavailable'
  | 'artifact_not_ready' | 'extraction_already_running' | 'provider_timeout'
  | 'provider_failure' | 'provider_invalid_output' | 'extraction_contract_violation'
  | 'persistence_failure';

export class OpportunityApplicationError extends Error {
  constructor(
    readonly kind: OpportunityErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OpportunityApplicationError';
  }
}

export const opportunityError = (kind: OpportunityErrorKind, message: string, cause?: unknown) =>
  new OpportunityApplicationError(kind, message, cause);

type DatabaseErrorLike = { code?: string; message?: string };

export function translateOpportunityPersistenceError(cause: unknown): OpportunityApplicationError {
  const error = cause as DatabaseErrorLike | null;
  if (error?.code === 'P0002') return opportunityError('not_found', 'Requested resource was not found.', cause);
  if (error?.code === '40001') return opportunityError('revision_conflict', 'The resource changed; refresh and retry.', cause);
  if (error?.code === '55000') {
    return opportunityError('immutable', 'The finalized resource cannot be changed.', cause);
  }
  if (error?.code === 'P0001' && (
    error.message === 'Final underwriting versions are historical and cannot be deleted' ||
    error.message === 'Final underwriting economic state is immutable' ||
    error.message === 'Provenance associated with a final underwriting version is immutable'
  )) return opportunityError('immutable', 'The finalized resource cannot be changed.', cause);
  if (error?.code === 'P0001' &&
    error.message === 'Cannot finalize underwriting whose provenance has been superseded') {
    return opportunityError('integrity_conflict',
      'Underwriting provenance changed and finalization could not complete.', cause);
  }
  if (error?.code === '23505' || error?.code?.startsWith('23')) {
    return opportunityError('integrity_conflict', 'The requested change conflicts with existing data.', cause);
  }
  if (error?.code === '22023') return opportunityError('validation', 'The request is inconsistent with persisted data.', cause);
  return opportunityError('persistence', 'Opportunity persistence failed.', cause);
}
