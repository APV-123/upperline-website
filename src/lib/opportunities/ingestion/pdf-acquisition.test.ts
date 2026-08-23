import { describe, expect, it, vi } from 'vitest';
import { OpportunityApplicationError } from '../application/errors';
import {
  authorizePdfUpload, beginPdfIngestion, buildPdfObjectIdentity, deriveFirstPdfArtifactIdentity,
  EXPECTED_PDF_MEDIA_TYPE, MAX_PDF_BYTES, MAX_PDF_PAGES,
  OrganizationWideOpportunityAuthorizer, projectPdfAcquisitionStatus,
  sanitizeOriginalFilename, validatePdfDeclaration, validateVerifiedPdfFinalization,
  type PdfIngestionRecord, type PdfIngestionRepositoryPort, type PrivateArtifactObjectStorePort,
  type VerifiedPdfFinalization,
} from './pdf-acquisition';

const OPPORTUNITY_ID = '11111111-1111-4111-8111-111111111111';
const INGESTION_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const ACTOR = { email: 'user@upperlineco.com', name: 'User' };
const expectKind = (operation: () => unknown | Promise<unknown>, kind: string) =>
  expect(operation).rejects.toMatchObject({ name: 'OpportunityApplicationError', kind });

function record(overrides: Partial<PdfIngestionRecord> = {}): PdfIngestionRecord {
  return { ingestionId: INGESTION_ID, opportunityId: OPPORTUNITY_ID, entryType: 'pdf',
    requestedByEmail: ACTOR.email, idempotencyKey: 'request-1', status: 'awaiting_source',
    revision: 1, failureCode: null, failureMessage: null, ...overrides };
}

function repository(result = record(), disposition: 'created' | 'recovered' = 'created'):
PdfIngestionRepositoryPort & { createOrRecoverPdfIngestion: ReturnType<typeof vi.fn> } {
  return { createOrRecoverPdfIngestion: vi.fn().mockResolvedValue({ ingestion: result, disposition }),
    getPdfIngestion: vi.fn().mockResolvedValue(result), finalizeVerifiedPdf: vi.fn() };
}

const authorizer = (exists = true) => new OrganizationWideOpportunityAuthorizer({
  opportunityExists: vi.fn().mockResolvedValue(exists),
});

describe('PDF acquisition filename metadata', () => {
  it.each([
    ['C:\\Users\\Alex\\flyer.pdf', 'flyer.pdf'], ['/tmp/flyer.pdf', 'flyer.pdf'],
    ['../../secret/flyer.pdf', 'flyer.pdf'], ['  flyer.pdf  ', 'flyer.pdf'],
    ['fly\u0000er\u0007.pdf', 'flyer.pdf'], ['土地資料.pdf', '土地資料.pdf'],
    ['offer.pdf.pdf', 'offer.pdf.pdf'],
  ])('sanitizes %s deterministically', (input, expected) => {
    expect(sanitizeOriginalFilename(input)).toBe(expected);
  });
  it('bounds long Unicode filenames by characters', () => {
    const sanitized = sanitizeOriginalFilename(`${'😀'.repeat(300)}.pdf`) ?? '';
    expect(Array.from(sanitized)).toHaveLength(255);
    expect(sanitized.endsWith('.pdf')).toBe(true);
    expect(validatePdfDeclaration({ originalFilename: `${'😀'.repeat(300)}.pdf` }).originalFilename).toBe(sanitized);
  });
  it.each([undefined, null, '', '   ', '\u0000\u0007'])('treats missing or empty names as absent', input => {
    expect(sanitizeOriginalFilename(input)).toBeNull();
  });
  it('does not infer trust from a PDF-looking name', () => {
    expect(validatePdfDeclaration({ originalFilename: 'payload.exe.pdf' }).originalFilename).toBe('payload.exe.pdf');
  });
  it('rejects a deceptive final extension', async () => {
    await expectKind(async () => validatePdfDeclaration({ originalFilename: 'payload.pdf.exe' }), 'unsupported_document');
  });
});

describe('PDF declaration policy', () => {
  it('defines exact integer policy limits', () => {
    expect(MAX_PDF_BYTES).toBe(26_214_400); expect(Number.isSafeInteger(MAX_PDF_BYTES)).toBe(true);
    expect(MAX_PDF_PAGES).toBe(250);
  });
  it('accepts an exact maximum and PDF declaration', () => {
    expect(validatePdfDeclaration({ originalFilename: 'flyer.PDF', declaredMediaType: 'Application/PDF', declaredByteSize: MAX_PDF_BYTES }))
      .toEqual({ originalFilename: 'flyer.PDF', declaredMediaType: EXPECTED_PDF_MEDIA_TYPE, declaredByteSize: MAX_PDF_BYTES });
  });
  it.each([0, -1, 1.5, MAX_PDF_BYTES + 1])('rejects invalid declared size %s', async size => {
    await expectKind(async () => validatePdfDeclaration({ declaredByteSize: size }),
      size > MAX_PDF_BYTES ? 'upload_too_large' : 'invalid_upload_request');
  });
  it('rejects a wrong declared MIME type', async () => {
    await expectKind(async () => validatePdfDeclaration({ declaredMediaType: 'image/png' }), 'unsupported_document');
  });
  it('keeps client claims explicitly declared and non-authoritative', () => {
    expect(Object.keys(validatePdfDeclaration({ declaredByteSize: 10, declaredMediaType: 'application/pdf' })))
      .toEqual(['originalFilename', 'declaredMediaType', 'declaredByteSize']);
  });
});

describe('PDF artifact identity and path', () => {
  it('derives the first artifact deterministically from ingestion identity', () => {
    expect(deriveFirstPdfArtifactIdentity(INGESTION_ID)).toEqual({ artifactId: INGESTION_ID, ingestionId: INGESTION_ID });
    expect(deriveFirstPdfArtifactIdentity(INGESTION_ID)).toEqual(deriveFirstPdfArtifactIdentity(INGESTION_ID));
  });
  it('uses different identities and paths for different ingestions', () => {
    expect(deriveFirstPdfArtifactIdentity(INGESTION_ID)).not.toEqual(deriveFirstPdfArtifactIdentity(OTHER_ID));
    expect(buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }).objectPath)
      .not.toBe(buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: OTHER_ID }).objectPath);
  });
  it('builds the exact canonical path without a filename', () => {
    const identity = buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID.toUpperCase(), ingestionId: INGESTION_ID });
    expect(identity.objectPath).toBe(`opportunities/${OPPORTUNITY_ID}/ingestions/${INGESTION_ID}/artifacts/${INGESTION_ID}/source.pdf`);
    expect(identity.objectPath).not.toContain('..'); expect(identity.objectPath.startsWith('/')).toBe(false);
  });
  it.each(['../bad', 'not-a-uuid', `${INGESTION_ID}/../../secret`])('rejects arbitrary identity %s', async id => {
    await expectKind(async () => deriveFirstPdfArtifactIdentity(id), 'validation');
  });
  it('cannot be influenced by filename or browser metadata', () => {
    const first = buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID });
    validatePdfDeclaration({ originalFilename: '../../different.pdf', declaredMediaType: 'application/pdf', declaredByteSize: 42 });
    expect(buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID })).toEqual(first);
  });
});

describe('Opportunity authorization seam', () => {
  it('allows an authenticated Upperline actor under the current organization policy', async () => {
    await expect(authorizer().authorize({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, action: 'begin_pdf_ingestion' })).resolves.toBeUndefined();
  });
  it('rejects a missing or untrusted actor', async () => {
    await expectKind(() => authorizer().authorize({ actor: { email: '', name: null }, opportunityId: OPPORTUNITY_ID, action: 'begin_pdf_ingestion' }), 'unauthorized');
    await expectKind(() => authorizer().authorize({ actor: { email: 'attacker@example.com', name: null }, opportunityId: OPPORTUNITY_ID, action: 'begin_pdf_ingestion' }), 'forbidden');
  });
  it('maps an absent Opportunity to a safe not-found error', async () => {
    await expectKind(() => authorizer(false).authorize({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, action: 'begin_pdf_ingestion' }), 'not_found');
  });
});

describe('begin PDF ingestion', () => {
  it('creates a deterministic, safe begin result', async () => {
    const repo = repository();
    const result = await beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: ' request-1 ',
      originalFilename: 'C:\\fakepath\\flyer.pdf', declaredMediaType: 'application/pdf', declaredByteSize: 100 }, ACTOR,
    { authorizer: authorizer(), repository: repo });
    expect(result.disposition).toBe('created'); expect(result.artifact.artifactId).toBe(INGESTION_ID);
    expect(result.object.objectPath).not.toContain('flyer'); expect(result.status.status).toBe('awaiting_upload');
    expect(repo.createOrRecoverPdfIngestion).toHaveBeenCalledWith({ opportunityId: OPPORTUNITY_ID,
      requestedByEmail: ACTOR.email, idempotencyKey: 'request-1', entryType: 'pdf' });
  });
  it('recovers exact and lost-response retries even when display filename changes', async () => {
    const repo = repository(record(), 'recovered');
    const one = await beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: 'request-1', originalFilename: 'first.pdf' }, ACTOR, { authorizer: authorizer(), repository: repo });
    const two = await beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: 'request-1', originalFilename: 'renamed.pdf' }, ACTOR, { authorizer: authorizer(), repository: repo });
    expect(one.object).toEqual(two.object); expect(two.disposition).toBe('recovered');
    expect(two.originalFile.originalFilename).toBe('renamed.pdf');
  });
  it.each([{ opportunityId: OTHER_ID }, { requestedByEmail: 'other@upperlineco.com' }, { idempotencyKey: 'other-key' }])
  ('rejects conflicting persisted replay identity %#', async override => {
    await expectKind(() => beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: 'request-1' }, ACTOR,
      { authorizer: authorizer(), repository: repository(record(override)) }), 'idempotency_conflict');
  });
  it('keeps the same filename separate across different ingestions', async () => {
    const a = await beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: 'request-1', originalFilename: 'same.pdf' }, ACTOR,
      { authorizer: authorizer(), repository: repository(record()) });
    const b = await beginPdfIngestion({ opportunityId: OPPORTUNITY_ID, idempotencyKey: 'request-2', originalFilename: 'same.pdf' }, ACTOR,
      { authorizer: authorizer(), repository: repository(record({ ingestionId: OTHER_ID, idempotencyKey: 'request-2' })) });
    expect(a.object.objectPath).not.toBe(b.object.objectPath);
  });
});

describe('acquisition status projection', () => {
  it('derives upload-only presentation states without inventing persisted statuses', () => {
    expect(projectPdfAcquisitionStatus({ persistedStatus: 'awaiting_source', objectPresence: 'missing' }).status).toBe('awaiting_upload');
    expect(projectPdfAcquisitionStatus({ persistedStatus: 'awaiting_source', objectPresence: 'present' }).status).toBe('uploaded_pending_verification');
    expect(projectPdfAcquisitionStatus({ persistedStatus: 'awaiting_source', objectPresence: 'present', verificationInProgress: true }).status).toBe('verifying');
  });
  it.each(['ready', 'extracting', 'review_ready', 'partially_reviewed', 'applied'] as const)
  ('projects persisted %s as acquired and verified', status => {
    expect(projectPdfAcquisitionStatus({ persistedStatus: status })).toMatchObject({ status: 'ready', verificationState: 'verified', persistedStatus: status });
  });
  it('preserves failure and cancellation', () => {
    expect(projectPdfAcquisitionStatus({ persistedStatus: 'failed' }).status).toBe('failed');
    expect(projectPdfAcquisitionStatus({ persistedStatus: 'cancelled' }).status).toBe('cancelled');
  });
});

describe('upload authorization lifecycle', () => {
  const objectStore = (present = false): PrivateArtifactObjectStorePort => ({
    createExactUploadAuthorization: vi.fn().mockResolvedValue({
      authorization: 'opaque-signed-credential', expiresAt: '2026-08-23T12:00:00.000Z',
    }),
    inspectExactObject: vi.fn().mockResolvedValue(present
      ? { byteSize: 100, mediaType: 'application/pdf', lastModifiedAt: null } : null),
    openExactObject: vi.fn(), createExactReadAccess: vi.fn(), deleteExactUntrustedObject: vi.fn(),
  });
  const request = { actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID };

  it('authorizes only the deterministic missing object with no overwrite', async () => {
    const store = objectStore();
    const result = await authorizePdfUpload(request,
      { authorizer: authorizer(), repository: repository(), objectStore: store });
    expect(result).toMatchObject({ disposition: 'authorized', ingestionId: INGESTION_ID,
      artifactId: INGESTION_ID, maximumByteSize: MAX_PDF_BYTES });
    expect(store.createExactUploadAuthorization).toHaveBeenCalledWith({
      objectPath: buildPdfObjectIdentity(request).objectPath,
      mediaType: 'application/pdf', maximumByteSize: MAX_PDF_BYTES, overwrite: false,
    });
  });
  it('recovers toward verification when the exact object already exists', async () => {
    const store = objectStore(true);
    await expect(authorizePdfUpload(request,
      { authorizer: authorizer(), repository: repository(), objectStore: store }))
      .resolves.toMatchObject({ disposition: 'uploaded_pending_verification' });
    expect(store.createExactUploadAuthorization).not.toHaveBeenCalled();
  });
  it('does not reauthorize an already acquired ingestion', async () => {
    const store = objectStore();
    await expect(authorizePdfUpload(request, { authorizer: authorizer(),
      repository: repository(record({ status: 'ready' })), objectStore: store }))
      .resolves.toMatchObject({ disposition: 'ready' });
    expect(store.inspectExactObject).not.toHaveBeenCalled();
    expect(store.createExactUploadAuthorization).not.toHaveBeenCalled();
  });
  it.each(['failed', 'cancelled'] as const)('rejects persisted %s lifecycle', async status => {
    await expectKind(() => authorizePdfUpload(request, { authorizer: authorizer(),
      repository: repository(record({ status })), objectStore: objectStore() }), 'upload_conflict');
  });
  it('rejects missing, mismatched Opportunity, and mismatched actor ingestion', async () => {
    await expectKind(() => authorizePdfUpload(request, { authorizer: authorizer(),
      repository: repository(null as unknown as PdfIngestionRecord), objectStore: objectStore() }), 'ingestion_not_found');
    await expectKind(() => authorizePdfUpload(request, { authorizer: authorizer(),
      repository: repository(record({ opportunityId: OTHER_ID })), objectStore: objectStore() }), 'upload_conflict');
    await expectKind(() => authorizePdfUpload(request, { authorizer: authorizer(),
      repository: repository(record({ requestedByEmail: 'other@upperlineco.com' })), objectStore: objectStore() }), 'forbidden');
  });
  it('cannot use filename or browser path to alter authorization identity', async () => {
    const store = objectStore();
    await authorizePdfUpload({ ...request, ...({ originalFilename: '../../other.pdf', objectPath: '../other' } as object) },
      { authorizer: authorizer(), repository: repository(), objectStore: store });
    expect(store.createExactUploadAuthorization).toHaveBeenCalledWith(expect.objectContaining({
      objectPath: buildPdfObjectIdentity(request).objectPath,
    }));
  });
});

describe('verified finalization contract', () => {
  const valid = (): VerifiedPdfFinalization => ({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID,
    artifactId: INGESTION_ID, storageBucket: 'private-configured-bucket',
    storagePath: buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }).objectPath,
    originalFilename: 'flyer.pdf', declaredMediaType: 'application/pdf', actorEmail: ACTOR.email,
    verified: { sha256Digest: 'a'.repeat(64), byteSize: 100, detectedMediaType: 'application/pdf',
      pageCount: 2, documentMetadata: {} } });
  it('accepts only authoritative bounded metadata matching the deterministic object', () => {
    expect(validateVerifiedPdfFinalization(valid())).toEqual(valid());
  });
  it.each([
    ['malformed digest', (x: VerifiedPdfFinalization) => { x.verified.sha256Digest = 'browser-value'; }],
    ['zero bytes', (x: VerifiedPdfFinalization) => { x.verified.byteSize = 0; }],
    ['too many pages', (x: VerifiedPdfFinalization) => { x.verified.pageCount = MAX_PDF_PAGES + 1; }],
    ['wrong detected MIME', (x: VerifiedPdfFinalization) => { (x.verified.detectedMediaType as string) = 'text/plain'; }],
    ['wrong artifact', (x: VerifiedPdfFinalization) => { x.artifactId = OTHER_ID; }],
    ['wrong path', (x: VerifiedPdfFinalization) => { x.storagePath = 'browser/path.pdf'; }],
  ])('rejects %s', async (name, mutate) => {
    const input = valid(); mutate(input);
    await expectKind(async () => validateVerifiedPdfFinalization(input), name.startsWith('wrong artifact') || name === 'wrong path' ? 'artifact_conflict' : 'validation');
  });
  it('does not substitute browser declaration for verified metadata', async () => {
    const input = valid(); (input.verified.detectedMediaType as string) = 'application/octet-stream';
    await expectKind(async () => validateVerifiedPdfFinalization(input), 'validation');
  });
});

describe('safe errors', () => {
  it('keeps internal causes out of safe serialization', () => {
    const error = new OpportunityApplicationError('persistence', 'Opportunity persistence failed.', new Error('postgresql://secret storage token'));
    expect(error.message).not.toContain('secret');
    expect({ kind: error.kind, message: error.message }).toEqual({ kind: 'persistence', message: 'Opportunity persistence failed.' });
  });
});
