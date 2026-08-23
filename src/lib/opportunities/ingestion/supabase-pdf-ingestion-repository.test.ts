import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabasePdfIngestionRepository, translatePdfDatabaseError,
} from './supabase-pdf-ingestion-repository';
import { buildPdfObjectIdentity, type VerifiedPdfFinalization } from './pdf-acquisition';

const OPPORTUNITY_ID = '11111111-1111-4111-8111-111111111111';
const INGESTION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR = 'user@upperlineco.com';
const row = (overrides: Record<string, unknown> = {}) => ({ id: INGESTION_ID,
  opportunity_id: OPPORTUNITY_ID, entry_type: 'pdf', status: 'awaiting_source',
  idempotency_key: 'request-1', requested_by_email: ACTOR, revision: 1,
  failure_code: null, failure_message: null, ...overrides });

function client(input: {
  selects?: Array<{ data: unknown; error: unknown }>;
  insert?: { data: unknown; error: unknown };
  rpc?: { data: unknown; error: unknown };
}) {
  const selects = [...(input.selects ?? [])];
  const query = (result: { data: unknown; error: unknown }) => {
    const chain = {
      eq: vi.fn(() => chain), select: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => result), single: vi.fn(async () => result),
    }; return chain;
  };
  const from = vi.fn(() => ({
    select: vi.fn(() => query(selects.shift() ?? { data: null, error: null })),
    insert: vi.fn(() => query(input.insert ?? { data: null, error: null })),
  }));
  const rpcSingle = vi.fn(async () => input.rpc ?? { data: null, error: null });
  const rpc = vi.fn(() => ({ single: rpcSingle }));
  return { value: { from, rpc } as unknown as SupabaseClient, from, rpc, rpcSingle };
}

const createInput = { opportunityId: OPPORTUNITY_ID, requestedByEmail: ACTOR,
  idempotencyKey: 'request-1', entryType: 'pdf' as const };

describe('Supabase PDF ingestion repository', () => {
  it('resolves Opportunity existence without exposing database errors', async () => {
    const found = client({ selects: [{ data: { id: OPPORTUNITY_ID }, error: null }] });
    await expect(new SupabasePdfIngestionRepository(found.value).opportunityExists(OPPORTUNITY_ID)).resolves.toBe(true);
    const missing = client({ selects: [{ data: null, error: null }] });
    await expect(new SupabasePdfIngestionRepository(missing.value).opportunityExists(OPPORTUNITY_ID)).resolves.toBe(false);
  });
  it('creates a new ingestion with the existing database shape', async () => {
    const fake = client({ selects: [{ data: null, error: null }], insert: { data: row(), error: null } });
    const result = await new SupabasePdfIngestionRepository(fake.value).createOrRecoverPdfIngestion(createInput);
    expect(result.disposition).toBe('created'); expect(result.ingestion.opportunityId).toBe(OPPORTUNITY_ID);
    expect(fake.from).toHaveBeenCalledWith('opportunity_ingestions');
  });
  it('recovers an exact replay without inserting', async () => {
    const fake = client({ selects: [{ data: row(), error: null }] });
    const result = await new SupabasePdfIngestionRepository(fake.value).createOrRecoverPdfIngestion(createInput);
    expect(result.disposition).toBe('recovered');
  });
  it('recovers a unique-index race after the insert loses', async () => {
    const fake = client({ selects: [{ data: null, error: null }, { data: row(), error: null }],
      insert: { data: null, error: { code: '23505', message: 'secret constraint' } } });
    await expect(new SupabasePdfIngestionRepository(fake.value).createOrRecoverPdfIngestion(createInput))
      .resolves.toMatchObject({ disposition: 'recovered' });
  });
  it.each([
    { opportunity_id: null }, { opportunity_id: '33333333-3333-4333-8333-333333333333' },
    { entry_type: 'url' }, { requested_by_email: 'other@upperlineco.com' },
  ])('rejects null or conflicting replay identity %#', async overrides => {
    const fake = client({ selects: [{ data: row(overrides), error: null }] });
    await expect(new SupabasePdfIngestionRepository(fake.value).createOrRecoverPdfIngestion(createInput))
      .rejects.toMatchObject({ kind: overrides.opportunity_id === null || overrides.entry_type === 'url'
        ? 'integrity_conflict' : 'idempotency_conflict' });
  });
  it('returns null for a missing ingestion', async () => {
    const fake = client({ selects: [{ data: null, error: null }] });
    await expect(new SupabasePdfIngestionRepository(fake.value).getPdfIngestion(INGESTION_ID)).resolves.toBeNull();
  });
  it('maps trusted finalization exactly to the existing RPC', async () => {
    const finalized: VerifiedPdfFinalization = { opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID,
      artifactId: INGESTION_ID, storageBucket: 'private-pdf-bucket',
      storagePath: buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }).objectPath,
      originalFilename: 'flyer.pdf', declaredMediaType: 'application/pdf', actorEmail: ACTOR,
      verified: { sha256Digest: 'a'.repeat(64), byteSize: 123, detectedMediaType: 'application/pdf',
        pageCount: 4, documentMetadata: { inspected: true } } };
    const fake = client({ selects: [{ data: row(), error: null }], rpc: { data: {
      ingestion_id: INGESTION_ID, artifact_id: INGESTION_ID, ingestion_status: 'ready' }, error: null } });
    await expect(new SupabasePdfIngestionRepository(fake.value).finalizeVerifiedPdf(finalized))
      .resolves.toEqual({ ingestionId: INGESTION_ID, artifactId: INGESTION_ID, ingestionStatus: 'ready' });
    expect(fake.rpc).toHaveBeenCalledWith('finalize_opportunity_verified_artifact', expect.objectContaining({
      p_ingestion_id: INGESTION_ID, p_artifact_id: INGESTION_ID,
      p_storage_path: finalized.storagePath, p_sha256_digest: 'a'.repeat(64),
      p_byte_size: 123, p_detected_mime_type: 'application/pdf', p_page_count: 4,
    }));
  });
  it('rejects finalization when actor or Opportunity binding differs before RPC invocation', async () => {
    const path = buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }).objectPath;
    const input: VerifiedPdfFinalization = { opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID,
      artifactId: INGESTION_ID, storageBucket: 'private-pdf-bucket', storagePath: path,
      originalFilename: null, declaredMediaType: null, actorEmail: ACTOR,
      verified: { sha256Digest: 'b'.repeat(64), byteSize: 1, detectedMediaType: 'application/pdf',
        pageCount: 1, documentMetadata: {} } };
    const fake = client({ selects: [{ data: row({ requested_by_email: 'other@upperlineco.com' }), error: null }] });
    await expect(new SupabasePdfIngestionRepository(fake.value).finalizeVerifiedPdf(input))
      .rejects.toMatchObject({ kind: 'artifact_conflict' });
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('sanitizes RPC and unexpected database failures', () => {
    const conflict = translatePdfDatabaseError({ code: '22023', message: 'artifact_finalize_conflicting_replay secret' });
    expect(conflict).toMatchObject({ kind: 'artifact_conflict', message: 'Verified artifact conflicts with existing data.' });
    const unexpected = translatePdfDatabaseError(new Error('postgresql://secret'));
    expect(unexpected).toMatchObject({ kind: 'persistence', message: 'PDF ingestion persistence failed.' });
    expect(unexpected.message).not.toContain('secret');
  });
});
