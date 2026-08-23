import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { OpportunityActor } from '../application/actor-core';
import {
  buildPdfObjectIdentity, type OpportunityAuthorizer,
  type PdfAcquisitionTelemetryPort, type PdfIngestionRecord,
  type PdfIngestionRepositoryPort, type PdfInspectorPort,
  type PrivateArtifactObjectStorePort, type VerifiedPdfFinalization,
} from './pdf-acquisition';
import {
  classifyPdfJsInspectionFailure, classifyRejectedObjectCleanup, consumeStoredPdfBytes,
  createServerPdfVerificationDiagnostics, NodeSha256ByteDigest, normalizePdfJsBytes, PdfJsStructuralInspector,
  requireStrictPdfMagic, verifyPdfIngestion,
} from './pdf-verification';

const OPPORTUNITY_ID = '11111111-1111-4111-8111-111111111111';
const INGESTION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR: OpportunityActor = { email: 'user@upperlineco.com', name: 'User' };
const PATH = buildPdfObjectIdentity({ opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }).objectPath;

async function* chunks(...values: Uint8Array[]) { for (const value of values) yield value; }
const bytes = (value: string) => new TextEncoder().encode(value);

function makePdf(pageCount: number, encrypted = false): Uint8Array {
  const objects: string[] = [];
  const pageRefs = Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`);
  for (let index = 0; index < pageCount; index += 1) {
    const pageId = 3 + index * 2; const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R >>`);
    objects.push('<< /Length 0 >>\nstream\n\nendstream');
  }
  let encryptRef = '';
  if (encrypted) {
    objects.push(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${'00'.repeat(32)}> /U <${'00'.repeat(32)}> /P -4 >>`);
    encryptRef = ` /Encrypt ${objects.length} 0 R /ID [<${'01'.repeat(16)}><${'01'.repeat(16)}>]`;
  }
  let output = '%PDF-1.4\n%Upperline fixture\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encryptRef} >>\nstartxref\n${xref}\n%%EOF\n`;
  return bytes(output);
}

function ingestion(overrides: Partial<PdfIngestionRecord> = {}): PdfIngestionRecord {
  return { ingestionId: INGESTION_ID, opportunityId: OPPORTUNITY_ID, entryType: 'pdf',
    requestedByEmail: ACTOR.email, idempotencyKey: 'request-1', status: 'awaiting_source',
    revision: 1, failureCode: null, failureMessage: null, ...overrides };
}

function repository(row: PdfIngestionRecord | null = ingestion()) {
  const finalizeVerifiedPdf = vi.fn(async (input: VerifiedPdfFinalization) => ({
    ingestionId: input.ingestionId, artifactId: input.artifactId, ingestionStatus: 'ready' as const,
  }));
  return { value: { getPdfIngestion: vi.fn().mockResolvedValue(row),
    createOrRecoverPdfIngestion: vi.fn(), finalizeVerifiedPdf } satisfies PdfIngestionRepositoryPort,
  finalizeVerifiedPdf };
}

function store(content = makePdf(1), present = true): PrivateArtifactObjectStorePort {
  return { inspectExactObject: vi.fn().mockResolvedValue(present
    ? { byteSize: 999_999, mediaType: 'text/plain', lastModifiedAt: null } : null),
  openExactObject: vi.fn().mockResolvedValue(present ? { metadata: {
    byteSize: 1, mediaType: 'not-authoritative', lastModifiedAt: null }, bytes: chunks(content) } : null),
  createExactUploadAuthorization: vi.fn(), createExactReadAccess: vi.fn(), deleteExactUntrustedObject: vi.fn() };
}

const authorizer: OpportunityAuthorizer = { authorize: vi.fn().mockResolvedValue(undefined) };
const inspector = (result: Awaited<ReturnType<PdfInspectorPort['inspectPdf']>> = {
  readable: true, detectedMediaType: 'application/pdf',
  pageCount: 1, encrypted: false, diagnostics: [] }): PdfInspectorPort => ({
  inspectPdf: vi.fn().mockResolvedValue(result),
});

describe('authoritative SHA-256 and byte consumption', () => {
  it('matches a known SHA-256 vector', async () => {
    await expect(new NodeSha256ByteDigest().sha256(chunks(bytes('abc')))).resolves.toEqual({
      sha256Digest: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', byteCount: 3,
    });
  });
  it('is independent of chunk boundaries and changes for one altered byte', async () => {
    const digest = new NodeSha256ByteDigest();
    const whole = await digest.sha256(chunks(bytes('abcdef')));
    const split = await digest.sha256(chunks(bytes('a'), bytes('bc'), bytes('def')));
    const altered = await digest.sha256(chunks(bytes('abcdeg')));
    expect(split.sha256Digest).toBe(whole.sha256Digest);
    expect(altered.sha256Digest).not.toBe(whole.sha256Digest);
  });
  it('counts actual chunks, ignoring metadata, and retains one bounded representation', async () => {
    const result = await consumeStoredPdfBytes(chunks(bytes('%PDF-'), bytes('exact bytes')));
    expect(result.byteSize).toBe(16);
    expect(result.sha256Digest).toBe(createHash('sha256').update('%PDF-exact bytes').digest('hex'));
    expect(new TextDecoder().decode(result.bytes)).toBe('%PDF-exact bytes');
  });
  it('rejects zero bytes and actual bytes over 25 MiB', async () => {
    await expect(consumeStoredPdfBytes(chunks())).rejects.toMatchObject({ kind: 'invalid_pdf' });
    const oneMiB = new Uint8Array(1024 * 1024);
    async function* oversized() { for (let index = 0; index < 26; index += 1) yield oneMiB; }
    await expect(consumeStoredPdfBytes(oversized())).rejects.toMatchObject({ kind: 'upload_too_large' });
  });
  it('sanitizes a byte-stream failure midway', async () => {
    async function* broken() { yield bytes('%PDF-'); throw new Error('C:\\secret\\object token'); }
    await expect(consumeStoredPdfBytes(broken())).rejects.toMatchObject({
      kind: 'verification_failure', message: 'Stored PDF bytes could not be read.',
    });
  });
});

describe('strict PDF identity and structural inspection', () => {
  it('requires PDF magic at byte zero and rejects leading junk', () => {
    expect(() => requireStrictPdfMagic(bytes('%PDF-1.7'))).not.toThrow();
    expect(() => requireStrictPdfMagic(bytes('junk%PDF-1.7'))).toThrow(expect.objectContaining({ kind: 'invalid_pdf' }));
  });
  it('accepts valid one-page, multipage, and exact 250-page PDFs', async () => {
    const parser = new PdfJsStructuralInspector();
    await expect(parser.inspectPdf(makePdf(1))).resolves.toMatchObject({ readable: true, pageCount: 1 });
    await expect(parser.inspectPdf(makePdf(3))).resolves.toMatchObject({ readable: true, pageCount: 3 });
    await expect(parser.inspectPdf(makePdf(250))).resolves.toMatchObject({ readable: true, pageCount: 250 });
  });
  it('normalizes Buffer-backed authoritative bytes without changing byte identity', async () => {
    const fixture = makePdf(2);
    const buffer = Buffer.from(fixture);
    const normalized = normalizePdfJsBytes(buffer.subarray(0));
    expect(Buffer.isBuffer(normalized)).toBe(false);
    expect(normalized).toBeInstanceOf(Uint8Array);
    expect(normalized).toEqual(fixture);
    await expect(new PdfJsStructuralInspector().inspectPdf(buffer))
      .resolves.toMatchObject({ readable: true, pageCount: 2 });
  });
  it('rejects more than 250 pages', async () => {
    await expect(new PdfJsStructuralInspector().inspectPdf(makePdf(251)))
      .resolves.toMatchObject({ readable: false, rejectionReason: 'pdf_page_limit' });
  });
  it('rejects magic-only malformed and truncated PDFs', async () => {
    const parser = new PdfJsStructuralInspector();
    await expect(parser.inspectPdf(bytes('%PDF-1.4\nnot a PDF body')))
      .resolves.toMatchObject({ readable: false, rejectionReason: 'malformed_pdf' });
    const valid = makePdf(1);
    await expect(parser.inspectPdf(valid.subarray(0, valid.byteLength - 40)))
      .resolves.toMatchObject({ readable: false, rejectionReason: 'malformed_pdf' });
  });
  it('deterministically rejects encrypted/password-protected PDFs', async () => {
    await expect(new PdfJsStructuralInspector().inspectPdf(makePdf(1, true)))
      .resolves.toMatchObject({ readable: false, encrypted: true, rejectionReason: 'encrypted_pdf' });
  });
  it('fails closed on unexpected parser/runtime errors without classifying user content as malformed', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const raw = new Error('native dependency detail');
    expect(() => classifyPdfJsInspectionFailure(raw, pdfjs)).toThrow(expect.objectContaining({
      kind: 'verification_failure', message: 'PDF verification could not be completed.', cause: raw,
    }));
  });
  it('emits one allowlisted success event and sanitized failure telemetry without leaking details', () => {
    const events: Array<Readonly<Record<string, unknown>>> = [];
    const failureEvents: Array<Readonly<Record<string, unknown>>> = [];
    const cause = Object.assign(new Error('secret.pdf opportunities/id private/path token'), {
      code: 'ERR_DLOPEN_FAILED', stack: 'private stack', opportunityId: OPPORTUNITY_ID,
    });
    const diagnostics = createServerPdfVerificationDiagnostics(
      event => events.push(event), event => failureEvents.push(event), () => 100,
    );
    diagnostics.succeeded();
    diagnostics.failed('canvas_initialization', 'verification_failure', cause);
    expect(Object.keys(events[0]).sort()).toEqual([
      'canvasVersion', 'elapsedMilliseconds', 'event', 'pdfjsVersion',
    ]);
    expect(events[0]).toMatchObject({ event: 'opportunity_pdf_verification_succeeded',
      pdfjsVersion: '6.2.108', canvasVersion: '1.0.7', elapsedMilliseconds: 0 });
    expect(Object.keys(failureEvents[0]).sort()).toEqual([
      'canvasVersion', 'classification', 'elapsedMilliseconds', 'errorCode',
      'event', 'exceptionName', 'pdfjsVersion', 'stage',
    ]);
    expect(failureEvents[0]).toMatchObject({
      event: 'opportunity_pdf_verification_failure', stage: 'canvas_initialization',
      classification: 'verification_failure', exceptionName: 'Error', errorCode: 'ERR_DLOPEN_FAILED',
      pdfjsVersion: '6.2.108', canvasVersion: '1.0.7', elapsedMilliseconds: 0,
    });
    expect(JSON.stringify([...events, ...failureEvents])).not.toMatch(/secret|private|token|opportunit(y|ies)\/id|11111111/);
  });
  it('tracks stages internally and attributes malformed input to the document promise', async () => {
    const failed: Array<[string, string]> = [];
    const diagnostics = { succeeded: vi.fn(),
      failed: vi.fn((stage, classification) => failed.push([stage, classification])) };
    const result = await new PdfJsStructuralInspector(diagnostics).inspectPdf(bytes('%PDF-1.4\nnot a PDF body'));
    expect(result).toMatchObject({ readable: false, rejectionReason: 'malformed_pdf' });
    expect(diagnostics.succeeded).not.toHaveBeenCalled();
    expect(failed).toEqual([['document_promise', 'malformed_pdf']]);
  });
  it('does not let diagnostic sink failures alter verification behavior', async () => {
    const diagnostics = { succeeded: vi.fn(() => { throw new Error('sink failed'); }),
      failed: vi.fn(() => { throw new Error('sink failed'); }) };
    await expect(new PdfJsStructuralInspector(diagnostics).inspectPdf(makePdf(1)))
      .resolves.toMatchObject({ readable: true, pageCount: 1 });
    await expect(new PdfJsStructuralInspector(diagnostics).inspectPdf(bytes('%PDF-1.4\ninvalid')))
      .resolves.toMatchObject({ readable: false, rejectionReason: 'malformed_pdf' });
  });
});

describe('verification orchestration', () => {
  const run = (overrides: Partial<Parameters<typeof verifyPdfIngestion>[1]> = {}) => {
    const repo = repository(); const objectStore = store(); const telemetry: PdfAcquisitionTelemetryPort = { record: vi.fn() };
    const promise = verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }, {
      authorizer, repository: repo.value, objectStore, inspector: inspector(), storageBucket: 'private-pdf-bucket',
      telemetry, correlationId: 'request-correlation', ...overrides,
    });
    return { promise, repo, objectStore, telemetry };
  };
  it('finalizes once using only exact stored bytes and parser metadata', async () => {
    const fixture = makePdf(2); const repo = repository();
    const result = await verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }, {
      authorizer, repository: repo.value, objectStore: store(fixture), inspector: inspector({ readable: true,
        detectedMediaType: 'application/pdf', pageCount: 2, encrypted: false, diagnostics: [] }),
      storageBucket: 'private-pdf-bucket',
    });
    expect(result).toMatchObject({ disposition: 'finalized', status: 'ready', artifactId: INGESTION_ID,
      objectPath: PATH, verified: { byteSize: fixture.byteLength, pageCount: 2,
        sha256Digest: createHash('sha256').update(fixture).digest('hex') } });
    expect(repo.finalizeVerifiedPdf).toHaveBeenCalledOnce();
    expect(repo.finalizeVerifiedPdf).toHaveBeenCalledWith(expect.objectContaining({
      opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID, artifactId: INGESTION_ID,
      storageBucket: 'private-pdf-bucket', storagePath: PATH,
      originalFilename: null, declaredMediaType: null,
      verified: expect.objectContaining({ byteSize: fixture.byteLength, pageCount: 2,
        detectedMediaType: 'application/pdf', sha256Digest: createHash('sha256').update(fixture).digest('hex') }),
    }));
  });
  it('cannot accept caller digest, page, MIME, filename, size, artifact, path, or bucket', async () => {
    const invocation = { actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID,
      ...({ artifactId: 'attacker', objectPath: '../attacker', storageBucket: 'public',
        sha256Digest: 'f'.repeat(64), pageCount: 999, byteSize: 1,
        detectedMediaType: 'image/png', originalFilename: '../../attack.pdf' } as object) };
    const repo = repository(); const fixture = makePdf(1);
    await verifyPdfIngestion(invocation, { authorizer, repository: repo.value,
      objectStore: store(fixture), inspector: inspector(), storageBucket: 'private-pdf-bucket' });
    const finalized = repo.finalizeVerifiedPdf.mock.calls[0][0];
    expect(finalized).toMatchObject({ artifactId: INGESTION_ID, storagePath: PATH,
      storageBucket: 'private-pdf-bucket', originalFilename: null, declaredMediaType: null });
    expect(finalized.verified.sha256Digest).not.toBe('f'.repeat(64));
    expect(finalized.verified.pageCount).toBe(1);
    expect(finalized.verified.byteSize).toBe(fixture.byteLength);
    expect(finalized.verified.detectedMediaType).toBe('application/pdf');
  });
  it('returns already-ready replay without reading or finalizing again', async () => {
    const repo = repository(ingestion({ status: 'ready' })); const objectStore = store();
    await expect(verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID },
      { authorizer, repository: repo.value, objectStore, inspector: inspector(), storageBucket: 'private-pdf-bucket' }))
      .resolves.toMatchObject({ disposition: 'already_ready', status: 'ready' });
    expect(objectStore.inspectExactObject).not.toHaveBeenCalled();
    expect(repo.finalizeVerifiedPdf).not.toHaveBeenCalled();
  });
  it('rejects missing objects and terminal failed/cancelled states without finalization', async () => {
    const missingRepo = repository();
    await expect(verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID },
      { authorizer, repository: missingRepo.value, objectStore: store(makePdf(1), false), inspector: inspector(), storageBucket: 'private' }))
      .rejects.toMatchObject({ kind: 'upload_missing' });
    expect(missingRepo.finalizeVerifiedPdf).not.toHaveBeenCalled();
    for (const status of ['failed', 'cancelled'] as const) {
      const repo = repository(ingestion({ status }));
      await expect(verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID },
        { authorizer, repository: repo.value, objectStore: store(), inspector: inspector(), storageBucket: 'private' }))
        .rejects.toMatchObject({ kind: 'upload_conflict' });
      expect(repo.finalizeVerifiedPdf).not.toHaveBeenCalled();
    }
  });
  it('rejects non-PDF stored bytes despite PDF filename, MIME, and size claims', async () => {
    const repo = repository();
    await expect(verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID,
      ingestionId: INGESTION_ID, ...({ originalFilename: 'trusted-looking.pdf',
        declaredMediaType: 'application/pdf', declaredByteSize: 100 } as object) }, {
      authorizer, repository: repo.value, objectStore: store(bytes('definitely not PDF')),
      inspector: inspector(), storageBucket: 'private',
    })).rejects.toMatchObject({ kind: 'invalid_pdf' });
    expect(repo.finalizeVerifiedPdf).not.toHaveBeenCalled();
  });
  it.each([
    { readable: false as const, detectedMediaType: null, pageCount: null, encrypted: false,
      rejectionReason: 'malformed_pdf' as const, diagnostics: ['raw parser secret'] },
    { readable: false as const, detectedMediaType: null, pageCount: null, encrypted: true,
      rejectionReason: 'encrypted_pdf' as const, diagnostics: ['password details'] },
  ])('never finalizes rejected inspection %# or exposes diagnostics', async inspection => {
    const repo = repository();
    const promise = verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID },
      { authorizer, repository: repo.value, objectStore: store(), inspector: inspector(inspection), storageBucket: 'private' });
    await expect(promise).rejects.toSatisfy((error: Error) => !error.message.includes('secret') && !error.message.includes('password details'));
    expect(repo.finalizeVerifiedPdf).not.toHaveBeenCalled();
  });
  it('records only safe telemetry with digest prefix', async () => {
    const { promise, telemetry } = run(); await promise;
    const events = (telemetry.record as ReturnType<typeof vi.fn>).mock.calls.map(call => call[0]);
    expect(events).toHaveLength(2); expect(events[1].digestPrefix).toHaveLength(12);
    expect(JSON.stringify(events)).not.toContain('private-pdf-bucket');
    expect(JSON.stringify(events)).not.toContain('source.pdf');
  });
  it('attributes finalization failure without changing fail-closed behavior', async () => {
    const repo = repository(); const raw = Object.assign(new Error('database secret'), { code: 'UNSAFE_CODE' });
    repo.finalizeVerifiedPdf.mockRejectedValueOnce(raw);
    const failed: Array<[string, string]> = [];
    const diagnostics = { succeeded: vi.fn(),
      failed: vi.fn((stage, classification) => failed.push([stage, classification])) };
    await expect(verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }, {
      authorizer, repository: repo.value, objectStore: store(), inspector: inspector(),
      storageBucket: 'private', diagnostics,
    })).rejects.toMatchObject({ kind: 'verification_failure', message: 'PDF verification could not be completed.' });
    expect(diagnostics.succeeded).not.toHaveBeenCalled();
    expect(failed).toEqual([['artifact_finalization', 'verification_failure']]);
  });
  it('emits exactly one success event only after artifact finalization succeeds', async () => {
    const repo = repository(); const diagnostics = { succeeded: vi.fn(), failed: vi.fn() };
    await verifyPdfIngestion({ actor: ACTOR, opportunityId: OPPORTUNITY_ID, ingestionId: INGESTION_ID }, {
      authorizer, repository: repo.value, objectStore: store(), inspector: inspector(),
      storageBucket: 'private', diagnostics,
    });
    expect(repo.finalizeVerifiedPdf).toHaveBeenCalledOnce();
    expect(diagnostics.succeeded).toHaveBeenCalledOnce();
    expect(diagnostics.failed).not.toHaveBeenCalled();
  });
});

describe('rejected object cleanup classification', () => {
  it.each(['invalid_pdf', 'encrypted_pdf', 'malformed_pdf', 'pdf_page_limit', 'upload_too_large'] as const)
  ('allows later exact cleanup only for definitive rejection %s', failureKind => {
    expect(classifyRejectedObjectCleanup({ ingestionStatus: 'awaiting_source', failureKind })).toBe('eligible_exact_cleanup');
  });
  it('retains ambiguous infrastructure failures and conflicts', () => {
    expect(classifyRejectedObjectCleanup({ ingestionStatus: 'awaiting_source', failureKind: 'storage_unavailable' })).toBe('retain_transient_failure');
    expect(classifyRejectedObjectCleanup({ ingestionStatus: 'awaiting_source', failureKind: 'artifact_conflict' })).toBe('retain_conflict');
  });
  it('prohibits deletion after artifact acquisition regardless of failure', () => {
    expect(classifyRejectedObjectCleanup({ ingestionStatus: 'ready', failureKind: 'invalid_pdf' })).toBe('prohibited_finalized_artifact');
  });
});
