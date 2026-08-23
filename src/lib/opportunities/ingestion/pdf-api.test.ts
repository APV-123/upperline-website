import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { OpportunityActor } from '../application/actor-core';
import type {
  PdfApiDependencies,
} from './pdf-api';
import { beginPdfAcquisitionApi, getPdfAcquisitionStateApi, verifyPdfAcquisitionApi } from './pdf-api';
import type {
  PdfIngestionRecord, PdfInspectionResult, VerifiedPdfFinalization,
} from './pdf-acquisition';

const OPPORTUNITY_ID = '11111111-1111-4111-8111-111111111111';
const INGESTION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR: OpportunityActor = { email: 'analyst@upperlineco.com', name: 'Analyst' };
const record: PdfIngestionRecord = { ingestionId: INGESTION_ID, opportunityId: OPPORTUNITY_ID,
  entryType: 'pdf', requestedByEmail: ACTOR.email, idempotencyKey: 'manual-1',
  status: 'awaiting_source', revision: 0, failureCode: null, failureMessage: null };

function dependencies(input: { objectPresent?: boolean; status?: PdfIngestionRecord['status'];
  inspection?: PdfInspectionResult } = {}) {
  const finalized: VerifiedPdfFinalization[] = [];
  const authorize = vi.fn().mockResolvedValue(undefined);
  const createAuthorization = vi.fn().mockResolvedValue({ authorization: 'signed-secret',
    expiresAt: '2026-08-23T12:00:00.000Z' });
  const inspected = input.inspection ?? { readable: true as const, detectedMediaType: 'application/pdf' as const,
    pageCount: 3, encrypted: false as const, diagnostics: [] };
  const value: PdfApiDependencies = {
    authorizer: { authorize }, storageBucket: 'private-pdf', inspector: { inspectPdf: vi.fn().mockResolvedValue(inspected) },
    repository: {
      createOrRecoverPdfIngestion: vi.fn().mockResolvedValue({ disposition: 'created', ingestion: { ...record, status: input.status ?? record.status } }),
      getPdfIngestion: vi.fn().mockResolvedValue({ ...record, status: input.status ?? record.status }),
      finalizeVerifiedPdf: vi.fn(async finalization => { finalized.push(finalization); return {
        ingestionId: INGESTION_ID, artifactId: INGESTION_ID, ingestionStatus: 'ready' as const }; }),
    },
    objectStore: {
      createExactUploadAuthorization: createAuthorization,
      inspectExactObject: vi.fn().mockResolvedValue(input.objectPresent ? { byteSize: 100, mediaType: 'text/plain', lastModifiedAt: null } : null),
      openExactObject: vi.fn().mockResolvedValue({ metadata: { byteSize: 14, mediaType: 'text/plain', lastModifiedAt: null },
        bytes: (async function* () { yield new TextEncoder().encode('%PDF-trusted'); })() }),
      createExactReadAccess: vi.fn(), deleteExactUntrustedObject: vi.fn(),
    },
  };
  return { value, authorize, createAuthorization, finalized };
}

describe('PDF acquisition API composition', () => {
  beforeEach(() => vi.clearAllMocks());
  it('begins and authorizes an exact upload with server-resolved actor', async () => {
    const deps = dependencies();
    const result = await beginPdfAcquisitionApi(OPPORTUNITY_ID, ACTOR, { idempotencyKey: 'manual-1',
      originalFilename: 'flyer.pdf', declaredMediaType: 'application/pdf', declaredByteSize: 100 }, deps.value);
    expect(result).toEqual({ disposition: 'authorized', ingestionId: INGESTION_ID,
      upload: { authorization: 'signed-secret', expiresAt: '2026-08-23T12:00:00.000Z', maximumByteSize: 25 * 1024 * 1024 },
      readyForExtraction: false });
    expect(deps.authorize).toHaveBeenCalledWith(expect.objectContaining({ actor: ACTOR, opportunityId: OPPORTUNITY_ID }));
    expect(deps.createAuthorization).toHaveBeenCalledWith(expect.objectContaining({ overwrite: false }));
    expect(result).not.toHaveProperty('objectPath'); expect(result).not.toHaveProperty('artifactId');
  });

  it('recovers an existing object toward verification and replays ready safely', async () => {
    await expect(beginPdfAcquisitionApi(OPPORTUNITY_ID, ACTOR, { idempotencyKey: 'manual-1' }, dependencies({ objectPresent: true }).value))
      .resolves.toMatchObject({ disposition: 'uploaded_pending_verification', ingestionId: INGESTION_ID });
    await expect(beginPdfAcquisitionApi(OPPORTUNITY_ID, ACTOR, { idempotencyKey: 'manual-1' }, dependencies({ status: 'ready' }).value))
      .resolves.toMatchObject({ disposition: 'ready', readyForExtraction: true });
  });

  it('finds the latest actor-scoped ready ingestion without requiring Storage configuration', async () => {
    const authorize = vi.fn().mockResolvedValue(undefined);
    const findLatestPdfIngestion = vi.fn().mockResolvedValue({ ...record, status: 'ready' });
    await expect(getPdfAcquisitionStateApi(OPPORTUNITY_ID, ACTOR, {
      authorizer: { authorize }, repository: { findLatestPdfIngestion },
    })).resolves.toEqual({ ingestionId: INGESTION_ID, status: 'ready', readyForExtraction: true });
    expect(findLatestPdfIngestion).toHaveBeenCalledWith(OPPORTUNITY_ID, ACTOR.email);
    expect(authorize).toHaveBeenCalledWith({ actor: ACTOR, opportunityId: OPPORTUNITY_ID,
      action: 'view_pdf_ingestion' });
  });

  it.each(['actor', 'artifactId', 'bucket', 'objectPath', 'sha256Digest', 'detectedMediaType', 'byteSize', 'pageCount'])
  ('rejects browser-controlled %s before persistence or Storage', async field => {
    const deps = dependencies();
    await expect(beginPdfAcquisitionApi(OPPORTUNITY_ID, ACTOR,
      { idempotencyKey: 'manual-1', [field]: 'attacker' }, deps.value)).rejects.toMatchObject({ kind: 'invalid_upload_request' });
    expect(deps.authorize).not.toHaveBeenCalled(); expect(deps.createAuthorization).not.toHaveBeenCalled();
  });

  it('verifies authoritative stored bytes and returns only safe metadata', async () => {
    const deps = dependencies({ objectPresent: true });
    const result = await verifyPdfAcquisitionApi(OPPORTUNITY_ID, INGESTION_ID, ACTOR, {}, deps.value);
    expect(result).toEqual({ disposition: 'finalized', ingestionId: INGESTION_ID, status: 'ready',
      readyForExtraction: true, verified: { byteSize: 12, pageCount: 3, mediaType: 'application/pdf' } });
    expect(result).not.toHaveProperty('sha256Digest');
    expect(deps.finalized[0]).toMatchObject({ storageBucket: 'private-pdf', originalFilename: null,
      declaredMediaType: null, verified: { byteSize: 12, pageCount: 3, detectedMediaType: 'application/pdf' } });
  });

  it.each(['actor', 'artifactId', 'bucket', 'objectPath', 'digest', 'mime', 'byteCount', 'pageCount'])
  ('rejects verify injection of %s', async field => {
    await expect(verifyPdfAcquisitionApi(OPPORTUNITY_ID, INGESTION_ID, ACTOR,
      { [field]: 'attacker' }, dependencies().value)).rejects.toMatchObject({ kind: 'invalid_upload_request' });
  });

  it.each([
    [{ readable: false, detectedMediaType: null, pageCount: null, encrypted: true, rejectionReason: 'encrypted_pdf', diagnostics: [] }, 'encrypted_pdf'],
    [{ readable: false, detectedMediaType: null, pageCount: null, encrypted: false, rejectionReason: 'malformed_pdf', diagnostics: [] }, 'malformed_pdf'],
    [{ readable: false, detectedMediaType: null, pageCount: null, encrypted: false, rejectionReason: 'pdf_page_limit', diagnostics: [] }, 'pdf_page_limit'],
  ] as const)('maps trusted rejection %s safely', async (inspection, kind) => {
    await expect(verifyPdfAcquisitionApi(OPPORTUNITY_ID, INGESTION_ID, ACTOR, {}, dependencies({
      objectPresent: true, inspection: inspection as unknown as PdfInspectionResult,
    }).value))
      .rejects.toMatchObject({ kind });
  });
});
