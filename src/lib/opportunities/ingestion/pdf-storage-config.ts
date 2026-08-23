import 'server-only';

import { opportunityError } from '../application/errors';

export const PDF_STORAGE_BUCKET_ENV = 'OPPORTUNITY_PDF_STORAGE_BUCKET';
const BUCKET_NAME = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;

export type PdfStorageConfig = Readonly<{ bucket: string }>;

export function readPdfStorageConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PdfStorageConfig {
  const bucket = environment[PDF_STORAGE_BUCKET_ENV]?.trim();
  if (!bucket || !BUCKET_NAME.test(bucket)) {
    throw opportunityError('storage_unavailable', 'Private PDF Storage is not configured.');
  }
  return Object.freeze({ bucket });
}
