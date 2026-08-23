export const CLIENT_PDF_MAX_BYTES = 25 * 1024 * 1024;

export type FlyerStage = 'empty' | 'selected' | 'preparing' | 'uploading'
  | 'uploaded' | 'verifying' | 'verified' | 'failed';

export type FlyerUiState = {
  stage: FlyerStage; filename?: string; byteSize?: number; pageCount?: number;
  ingestionId?: string; idempotencyKey?: string; error?: string;
};

export type PreliminaryFile = { name: string; type: string; size: number };

export function validateFlyerSelection(file: PreliminaryFile | null): string | null {
  if (!file) return 'Select a PDF flyer.';
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Select a file with a .pdf extension.';
  if (file.type && file.type.toLowerCase() !== 'application/pdf') return 'The selected file is not reported as a PDF.';
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return 'The selected PDF is empty.';
  if (file.size > CLIENT_PDF_MAX_BYTES) return 'This PDF is larger than the 25 MB limit.';
  return null;
}

export function flyerErrorMessage(kind: string | undefined): string {
  const messages: Record<string, string> = {
    upload_too_large: 'This PDF is larger than the 25 MB limit.',
    encrypted_pdf: 'This PDF is password-protected or encrypted and can’t be processed.',
    invalid_pdf: 'This file could not be verified as a valid PDF.',
    malformed_pdf: 'This file could not be verified as a valid PDF.',
    pdf_page_limit: 'This PDF exceeds the 250-page limit.',
    upload_missing: 'The upload could not be found. Please try again.',
    upload_conflict: 'This flyer has already been uploaded or the Opportunity changed. Refresh and try again.',
    artifact_conflict: 'This flyer has already been uploaded or the Opportunity changed. Refresh and try again.',
    idempotency_conflict: 'This flyer has already been uploaded or the Opportunity changed. Refresh and try again.',
    storage_unavailable: 'File storage is temporarily unavailable. Please try again.',
  };
  return messages[kind ?? ''] ?? 'Something went wrong while processing the flyer.';
}

export function formatFlyerBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function recoverFlyerState(value: string | null): FlyerUiState {
  if (!value) return { stage: 'empty' };
  try {
    const parsed = JSON.parse(value) as Partial<FlyerUiState>;
    if (!parsed.ingestionId || !parsed.idempotencyKey ||
        !['uploaded', 'verifying', 'verified'].includes(parsed.stage ?? '')) return { stage: 'empty' };
    return {
      // A request interrupted while verifying is replayable after refresh.
      stage: parsed.stage === 'verifying' ? 'uploaded' : parsed.stage as FlyerStage,
      ingestionId: parsed.ingestionId,
      idempotencyKey: parsed.idempotencyKey,
      ...(typeof parsed.filename === 'string' && { filename: parsed.filename }),
      ...(typeof parsed.byteSize === 'number' && { byteSize: parsed.byteSize }),
      ...(typeof parsed.pageCount === 'number' && { pageCount: parsed.pageCount }),
    };
  } catch { return { stage: 'empty' }; }
}

export async function uploadToSignedPdfAuthorization(
  authorization: string,
  file: Blob,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);
  const response = await fetcher(authorization, {
    method: 'PUT', headers: { 'x-upsert': 'false' }, body,
  });
  if (!response.ok) throw new Error('Direct upload failed.');
}
