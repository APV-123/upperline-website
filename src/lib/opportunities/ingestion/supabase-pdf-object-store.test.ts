import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPdfStorageConfig } from './pdf-storage-config';
import { SupabasePrivatePdfObjectStore } from './supabase-pdf-object-store';
import { buildPdfObjectIdentity, MAX_PDF_BYTES } from './pdf-acquisition';

const PATH = buildPdfObjectIdentity({ opportunityId: '11111111-1111-4111-8111-111111111111',
  ingestionId: '22222222-2222-4222-8222-222222222222' }).objectPath;
const BUCKET = 'private-pdf-source';

function storageApi(overrides: Record<string, unknown> = {}) {
  const api = {
    createSignedUploadUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.invalid/exact?token=credential', token: 'credential', path: PATH }, error: null })),
    info: vi.fn(async () => ({ data: { size: 123, contentType: 'browser/claim', lastModified: 'now' }, error: null })),
    download: vi.fn(async () => ({ data: new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }), error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.invalid/read?token=credential' }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })), ...overrides,
  };
  const from = vi.fn(() => api);
  return { api, from, value: { storage: { from } } as unknown as SupabaseClient };
}

describe('private PDF Storage configuration', () => {
  it('accepts a server-configured bucket', () => {
    expect(readPdfStorageConfig({ OPPORTUNITY_PDF_STORAGE_BUCKET: BUCKET })).toEqual({ bucket: BUCKET });
  });
  it.each([{}, { OPPORTUNITY_PDF_STORAGE_BUCKET: '' }, { OPPORTUNITY_PDF_STORAGE_BUCKET: '../browser' }])
  ('fails closed without a safe configured bucket', environment => {
    expect(() => readPdfStorageConfig(environment)).toThrow(expect.objectContaining({
      kind: 'storage_unavailable', message: 'Private PDF Storage is not configured.',
    }));
    try { readPdfStorageConfig({ ...environment, OPPORTUNITY_PDF_STORAGE_BUCKET: 'secret/bucket' }); }
    catch (cause) { expect((cause as Error).message).not.toContain('secret/bucket'); }
  });
});

describe('Supabase private PDF object store', () => {
  it('creates one exact create-only authorization with the configured bucket', async () => {
    const fake = storageApi(); const store = new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET },
      () => new Date('2026-08-23T10:00:00.000Z'));
    const result = await store.createExactUploadAuthorization({ objectPath: PATH,
      mediaType: 'application/pdf', maximumByteSize: MAX_PDF_BYTES, overwrite: false });
    expect(fake.from).toHaveBeenCalledWith(BUCKET);
    expect(fake.api.createSignedUploadUrl).toHaveBeenCalledWith(PATH, { upsert: false });
    expect(result.expiresAt).toBe('2026-08-23T12:00:00.000Z');
  });
  it.each(['../escape.pdf', `${PATH}/../other.pdf`, 'opportunities/prefix'])
  ('rejects arbitrary or prefix path %s for every exact operation', async path => {
    const fake = storageApi(); const store = new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET });
    await expect(store.inspectExactObject(path)).rejects.toMatchObject({ kind: 'invalid_upload_request' });
    await expect(store.openExactObject(path)).rejects.toMatchObject({ kind: 'invalid_upload_request' });
    await expect(store.deleteExactUntrustedObject(path)).rejects.toMatchObject({ kind: 'invalid_upload_request' });
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('inspects exact metadata without treating Content-Type as authoritative', async () => {
    const fake = storageApi(); const store = new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET });
    await expect(store.inspectExactObject(PATH)).resolves.toEqual({ byteSize: 123,
      mediaType: 'browser/claim', lastModifiedAt: 'now' });
  });
  it('distinguishes a missing object from Storage failure', async () => {
    const missing = storageApi({ info: vi.fn(async () => ({ data: null, error: { status: 404 } })) });
    await expect(new SupabasePrivatePdfObjectStore(missing.value, { bucket: BUCKET }).inspectExactObject(PATH)).resolves.toBeNull();
    const broken = storageApi({ info: vi.fn(async () => ({ data: null, error: { status: 500, message: 'secret' } })) });
    await expect(new SupabasePrivatePdfObjectStore(broken.value, { bucket: BUCKET }).inspectExactObject(PATH))
      .rejects.toMatchObject({ kind: 'storage_unavailable', message: 'Private PDF Storage is unavailable.' });
  });
  it('exposes exact downloaded Blob bytes as chunks', async () => {
    const fake = storageApi(); const reader = await new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET }).openExactObject(PATH);
    const bytes: number[] = []; for await (const chunk of reader?.bytes ?? []) bytes.push(...chunk);
    expect(bytes).toEqual([1, 2, 3]); expect(fake.api.download).toHaveBeenCalledWith(PATH, {}, { cache: 'no-store' });
  });
  it('deletes exactly one validated object and never a prefix', async () => {
    const fake = storageApi(); await new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET }).deleteExactUntrustedObject(PATH);
    expect(fake.api.remove).toHaveBeenCalledWith([PATH]);
  });
  it('does not leak upload credentials through sanitized failures', async () => {
    const fake = storageApi({ createSignedUploadUrl: vi.fn(async () => ({ data: null,
      error: { status: 500, message: 'token=credential' } })) });
    const store = new SupabasePrivatePdfObjectStore(fake.value, { bucket: BUCKET });
    await expect(store.createExactUploadAuthorization({ objectPath: PATH, mediaType: 'application/pdf',
      maximumByteSize: MAX_PDF_BYTES, overwrite: false })).rejects.toMatchObject({
        kind: 'storage_unavailable', message: 'Private PDF Storage is unavailable.',
      });
  });
});
