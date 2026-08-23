import 'server-only';

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIVATE_DEAL_DOCUMENT_BUCKET, type PrivateDealDocumentType } from './private-document-upload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTENSIONS: Record<PrivateDealDocumentType, ReadonlySet<string>> = {
  investment_memorandum: new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx']), financial_model: new Set(['xlsx', 'xls', 'csv']),
};
export type PrivateDealUploadErrorKind = 'validation' | 'not_found' | 'storage_unavailable';
export class PrivateDealUploadError extends Error {
  constructor(public readonly kind: PrivateDealUploadErrorKind, message: string) { super(message); this.name = 'PrivateDealUploadError'; }
}
export type PrivateDealUploadRequest = { documentType: PrivateDealDocumentType; filename: string };

export function parsePrivateDealUploadRequest(value: unknown): PrivateDealUploadRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw validation();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !['documentType', 'filename'].includes(key))) throw validation();
  const documentType = record.documentType;
  const filename = typeof record.filename === 'string' ? record.filename.trim() : '';
  if ((documentType !== 'investment_memorandum' && documentType !== 'financial_model') || !filename ||
      filename.length > 255 || /[\u0000-\u001f]/.test(filename)) throw validation();
  if (!EXTENSIONS[documentType].has(extensionFor(filename))) throw validation('This file type is not supported for that document.');
  return { documentType, filename };
}

export async function authorizePrivateDealDocumentUpload(input: {
  dealId: string; request: PrivateDealUploadRequest; client: SupabaseClient; createId?: () => string;
}): Promise<{ authorization: string; objectPath: string }> {
  if (!UUID.test(input.dealId)) throw validation('Deal identity is invalid.');
  const { data, error } = await input.client.from('deals').select('id').eq('id', input.dealId).maybeSingle();
  if (error) throw unavailable(); if (!data) throw new PrivateDealUploadError('not_found', 'Deal not found.');
  const id = (input.createId ?? randomUUID)(); if (!UUID.test(id)) throw unavailable();
  const objectPath = `deals/${input.dealId}/private-documents/${input.request.documentType}/${id}.${extensionFor(input.request.filename)}`;
  const signed = await input.client.storage.from(PRIVATE_DEAL_DOCUMENT_BUCKET).createSignedUploadUrl(objectPath, { upsert: false });
  if (signed.error || !signed.data?.signedUrl) throw unavailable();
  return { authorization: signed.data.signedUrl, objectPath };
}
function extensionFor(filename: string): string { return /\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase() ?? ''; }
function validation(message = 'Private document upload request is invalid.') { return new PrivateDealUploadError('validation', message); }
function unavailable() { return new PrivateDealUploadError('storage_unavailable', 'Private document upload is temporarily unavailable.'); }
