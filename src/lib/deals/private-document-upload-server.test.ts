import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('server-only', () => ({}));

import { authorizePrivateDealDocumentUpload, parsePrivateDealUploadRequest } from './private-document-upload-server';

const DEAL_ID = '11111111-1111-4111-8111-111111111111';
const OBJECT_ID = '22222222-2222-4222-8222-222222222222';

function client(found = true) {
  const maybeSingle = vi.fn(async () => ({ data: found ? { id: DEAL_ID } : null, error: null }));
  const eq = vi.fn(() => ({ maybeSingle })); const select = vi.fn(() => ({ eq }));
  const fromTable = vi.fn(() => ({ select }));
  const createSignedUploadUrl = vi.fn(async () => ({ data: { signedUrl: 'https://storage.invalid/exact?token=secret' }, error: null }));
  const fromBucket = vi.fn(() => ({ createSignedUploadUrl }));
  return { value: { from: fromTable, storage: { from: fromBucket } } as unknown as SupabaseClient,
    fromBucket, createSignedUploadUrl };
}

describe('private Deal upload authorization', () => {
  it('rejects malformed, caller-directed, and unsupported requests', () => {
    expect(() => parsePrivateDealUploadRequest({ documentType: 'investment_memorandum', filename: 'memo.pdf', bucket: 'other' })).toThrow();
    expect(() => parsePrivateDealUploadRequest({ documentType: 'investment_memorandum', filename: 'memo.exe' })).toThrow();
    expect(() => parsePrivateDealUploadRequest({ documentType: 'arbitrary', filename: 'memo.pdf' })).toThrow();
  });

  it('uses the exact private bucket, server UUID path, and create-only authorization', async () => {
    const fake = client();
    const result = await authorizePrivateDealDocumentUpload({ dealId: DEAL_ID,
      request: parsePrivateDealUploadRequest({ documentType: 'financial_model', filename: 'model.XLSX' }),
      client: fake.value, createId: () => OBJECT_ID });
    expect(fake.fromBucket).toHaveBeenCalledWith('deal-documents-private');
    expect(fake.createSignedUploadUrl).toHaveBeenCalledWith(
      `deals/${DEAL_ID}/private-documents/financial_model/${OBJECT_ID}.xlsx`, { upsert: false });
    expect(result.objectPath).toContain(OBJECT_ID); expect(result.authorization).toContain('token=secret');
  });

  it('requires an existing server-resolved Deal before issuing authority', async () => {
    const fake = client(false);
    await expect(authorizePrivateDealDocumentUpload({ dealId: DEAL_ID,
      request: { documentType: 'investment_memorandum', filename: 'memo.pdf' }, client: fake.value }))
      .rejects.toMatchObject({ kind: 'not_found', message: 'Deal not found.' });
    expect(fake.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
