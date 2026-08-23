import 'server-only';

import { createHash } from 'node:crypto';
import {
  getDocument, InvalidPDFException, PasswordException, VerbosityLevel,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { OpportunityActor } from '../application/actor-core';
import { OpportunityApplicationError, opportunityError } from '../application/errors';
import type {
  ByteDigestPort, PdfAcquisitionFailureCode, PdfAcquisitionTelemetryPort,
  PdfIngestionRecord, PdfIngestionRepositoryPort, PdfInspectionResult, PdfInspectorPort,
  PrivateArtifactObjectStorePort, VerifiedPdfFinalization,
} from './pdf-acquisition';
import {
  buildPdfObjectIdentity, EXPECTED_PDF_MEDIA_TYPE, MAX_PDF_BYTES, MAX_PDF_PAGES,
  type OpportunityAuthorizer,
} from './pdf-acquisition';

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

export type AuthoritativePdfBytes = {
  bytes: Uint8Array;
  byteSize: number;
  sha256Digest: string;
};

export type VerifyPdfIngestionResult = {
  disposition: 'finalized' | 'already_ready';
  opportunityId: string;
  ingestionId: string;
  artifactId: string;
  objectPath: string;
  status: 'ready';
  verified?: {
    sha256Digest: string; byteSize: number;
    detectedMediaType: typeof EXPECTED_PDF_MEDIA_TYPE; pageCount: number;
  };
};

export type RejectedObjectCleanupDisposition =
  | 'eligible_exact_cleanup' | 'retain_transient_failure'
  | 'retain_conflict' | 'prohibited_finalized_artifact';

export class NodeSha256ByteDigest implements ByteDigestPort {
  async sha256(input: AsyncIterable<Uint8Array>): Promise<{
    sha256Digest: string; byteCount: number;
  }> {
    const hash = createHash('sha256');
    let byteCount = 0;
    try {
      for await (const chunk of input) {
        if (!(chunk instanceof Uint8Array)) throw new TypeError('Byte stream emitted an invalid chunk.');
        byteCount += chunk.byteLength;
        hash.update(chunk);
      }
    } catch (cause) {
      throw opportunityError('verification_failure', 'Stored PDF bytes could not be read.', cause);
    }
    return { sha256Digest: hash.digest('hex'), byteCount };
  }
}

export async function consumeStoredPdfBytes(
  input: AsyncIterable<Uint8Array>,
): Promise<AuthoritativePdfBytes> {
  const allocated = Buffer.allocUnsafe(MAX_PDF_BYTES);
  const hash = createHash('sha256');
  let byteSize = 0;
  try {
    for await (const chunk of input) {
      if (!(chunk instanceof Uint8Array)) throw new TypeError('Byte stream emitted an invalid chunk.');
      if (chunk.byteLength > MAX_PDF_BYTES - byteSize) {
        throw opportunityError('upload_too_large', 'The stored PDF exceeds the 25 MiB limit.');
      }
      allocated.set(chunk, byteSize);
      byteSize += chunk.byteLength;
      hash.update(chunk);
    }
  } catch (cause) {
    if (cause instanceof OpportunityApplicationError) throw cause;
    throw opportunityError('verification_failure', 'Stored PDF bytes could not be read.', cause);
  }
  if (byteSize === 0) throw opportunityError('invalid_pdf', 'The stored object is not a valid PDF.');
  return { bytes: allocated.subarray(0, byteSize), byteSize, sha256Digest: hash.digest('hex') };
}

export function requireStrictPdfMagic(bytes: Uint8Array): void {
  if (bytes.byteLength < PDF_MAGIC.byteLength || PDF_MAGIC.some((value, index) => bytes[index] !== value)) {
    throw opportunityError('invalid_pdf', 'The stored object is not a valid PDF.');
  }
}

export class PdfJsStructuralInspector implements PdfInspectorPort {
  async inspectPdf(input: Uint8Array): Promise<PdfInspectionResult> {
    requireStrictPdfMagic(input);
    let loading: ReturnType<typeof getDocument> | null = null;
    let document: Awaited<ReturnType<typeof getDocument>['promise']> | null = null;
    try {
      loading = getDocument({
        data: input,
        stopAtErrors: true,
        disableFontFace: true,
        useSystemFonts: false,
        verbosity: VerbosityLevel.ERRORS,
      });
      document = await loading.promise;
      const pageCount = document.numPages;
      if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
        return rejected('malformed_pdf');
      }
      if (pageCount > MAX_PDF_PAGES) return rejected('pdf_page_limit');
      // Resolve every page dictionary without rendering, executing actions, or extracting text.
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        await document.getPage(pageNumber);
      }
      return { readable: true, detectedMediaType: EXPECTED_PDF_MEDIA_TYPE,
        pageCount, encrypted: false, diagnostics: [] };
    } catch (cause) {
      if (cause instanceof PasswordException || exceptionName(cause) === 'PasswordException') {
        return rejected('encrypted_pdf');
      }
      if (cause instanceof InvalidPDFException || exceptionName(cause) === 'InvalidPDFException') {
        return rejected('malformed_pdf');
      }
      return rejected('malformed_pdf');
    } finally {
      if (document) await document.cleanup().catch(() => undefined);
      if (loading) await loading.destroy().catch(() => undefined);
    }
  }
}

export async function verifyPdfIngestion(
  input: { actor: OpportunityActor; opportunityId: string; ingestionId: string },
  dependencies: {
    authorizer: OpportunityAuthorizer;
    repository: PdfIngestionRepositoryPort;
    objectStore: PrivateArtifactObjectStorePort;
    inspector: PdfInspectorPort;
    storageBucket: string;
    telemetry?: PdfAcquisitionTelemetryPort;
    correlationId?: string;
    now?: () => number;
  },
): Promise<VerifyPdfIngestionResult> {
  const started = dependencies.now?.() ?? Date.now();
  const object = buildPdfObjectIdentity(input);
  await dependencies.authorizer.authorize({ actor: input.actor,
    opportunityId: object.opportunityId, action: 'verify_pdf_upload' });
  const actorEmail = input.actor.email.trim().toLowerCase();
  const ingestion = await dependencies.repository.getPdfIngestion(object.ingestionId);
  if (!ingestion) throw opportunityError('ingestion_not_found', 'PDF ingestion was not found.');
  assertVerificationIdentity(ingestion, object.opportunityId, actorEmail);
  if (ingestion.status !== 'awaiting_source') {
    if (isAcquired(ingestion.status)) {
      return { disposition: 'already_ready', opportunityId: object.opportunityId,
        ingestionId: object.ingestionId, artifactId: object.artifactId,
        objectPath: object.objectPath, status: 'ready' };
    }
    throw opportunityError('upload_conflict', 'This ingestion cannot be verified in its current state.');
  }
  const correlationId = dependencies.correlationId ?? 'not-provided';
  await telemetry(dependencies.telemetry, { correlationId, opportunityId: object.opportunityId,
    ingestionId: object.ingestionId, artifactId: object.artifactId, actorEmail,
    stage: 'verification', outcome: 'started' });
  try {
    const inspectedObject = await dependencies.objectStore.inspectExactObject(object.objectPath);
    if (!inspectedObject) throw opportunityError('upload_missing', 'The uploaded PDF was not found.');
    const reader = await dependencies.objectStore.openExactObject(object.objectPath);
    if (!reader) throw opportunityError('upload_missing', 'The uploaded PDF was not found.');
    const authoritative = await consumeStoredPdfBytes(reader.bytes);
    requireStrictPdfMagic(authoritative.bytes);
    const inspection = await dependencies.inspector.inspectPdf(authoritative.bytes);
    if (!inspection.readable) throw inspectionError(inspection);
    if (inspection.encrypted) throw opportunityError('encrypted_pdf', 'Encrypted PDFs are not supported.');
    if (inspection.detectedMediaType !== EXPECTED_PDF_MEDIA_TYPE) {
      throw opportunityError('invalid_pdf', 'The stored object is not a valid PDF.');
    }
    if (!Number.isSafeInteger(inspection.pageCount) || inspection.pageCount < 1 || inspection.pageCount > MAX_PDF_PAGES) {
      throw opportunityError('invalid_pdf', 'The PDF page count is outside the supported range.');
    }
    const finalization: VerifiedPdfFinalization = {
      opportunityId: object.opportunityId, ingestionId: object.ingestionId,
      artifactId: object.artifactId, storageBucket: trustedBucket(dependencies.storageBucket),
      storagePath: object.objectPath,
      // The current schema has no pre-finalization filename claim. A route cannot safely
      // reintroduce one during verification, so V1 finalizes these optional fields as null.
      originalFilename: null, declaredMediaType: null, actorEmail,
      verified: { sha256Digest: authoritative.sha256Digest, byteSize: authoritative.byteSize,
        detectedMediaType: EXPECTED_PDF_MEDIA_TYPE, pageCount: inspection.pageCount,
        documentMetadata: { structuralInspector: 'pdfjs-dist', structuralInspectorVersion: '6.2.108' } },
    };
    const finalized = await dependencies.repository.finalizeVerifiedPdf(finalization);
    await telemetry(dependencies.telemetry, { correlationId, opportunityId: object.opportunityId,
      ingestionId: object.ingestionId, artifactId: object.artifactId, actorEmail,
      stage: 'verification', outcome: 'succeeded', byteSize: authoritative.byteSize,
      pageCount: inspection.pageCount, digestPrefix: authoritative.sha256Digest.slice(0, 12),
      elapsedMilliseconds: (dependencies.now?.() ?? Date.now()) - started });
    return { disposition: 'finalized', opportunityId: object.opportunityId,
      ingestionId: finalized.ingestionId, artifactId: finalized.artifactId,
      objectPath: object.objectPath, status: finalized.ingestionStatus,
      verified: { sha256Digest: authoritative.sha256Digest, byteSize: authoritative.byteSize,
        detectedMediaType: EXPECTED_PDF_MEDIA_TYPE, pageCount: inspection.pageCount } };
  } catch (cause) {
    const safe = cause instanceof OpportunityApplicationError
      ? cause : opportunityError('verification_failure', 'PDF verification could not be completed.', cause);
    await telemetry(dependencies.telemetry, { correlationId, opportunityId: object.opportunityId,
      ingestionId: object.ingestionId, artifactId: object.artifactId, actorEmail,
      stage: 'verification', outcome: 'failed', failureCode: telemetryFailureCode(safe.kind),
      elapsedMilliseconds: (dependencies.now?.() ?? Date.now()) - started });
    throw safe;
  }
}

export function classifyRejectedObjectCleanup(input: {
  ingestionStatus: PdfIngestionRecord['status'];
  failureKind: OpportunityApplicationError['kind'];
}): RejectedObjectCleanupDisposition {
  if (isAcquired(input.ingestionStatus)) return 'prohibited_finalized_artifact';
  if (['invalid_pdf', 'encrypted_pdf', 'malformed_pdf', 'pdf_page_limit', 'upload_too_large'].includes(input.failureKind)) {
    return 'eligible_exact_cleanup';
  }
  if (['artifact_conflict', 'idempotency_conflict', 'upload_conflict', 'integrity_conflict'].includes(input.failureKind)) {
    return 'retain_conflict';
  }
  return 'retain_transient_failure';
}

function rejected(reason: 'invalid_pdf' | 'encrypted_pdf' | 'malformed_pdf' | 'pdf_page_limit'): PdfInspectionResult {
  return { readable: false, detectedMediaType: null, pageCount: null,
    encrypted: reason === 'encrypted_pdf', rejectionReason: reason, diagnostics: [] };
}

function exceptionName(cause: unknown): string | null {
  return typeof cause === 'object' && cause !== null && 'name' in cause &&
    typeof (cause as { name?: unknown }).name === 'string' ? (cause as { name: string }).name : null;
}

function inspectionError(result: Extract<PdfInspectionResult, { readable: false }>) {
  if (result.encrypted || result.rejectionReason === 'encrypted_pdf') {
    return opportunityError('encrypted_pdf', 'Encrypted PDFs are not supported.');
  }
  if (result.rejectionReason === 'malformed_pdf') {
    return opportunityError('malformed_pdf', 'The uploaded PDF is malformed or truncated.');
  }
  if (result.rejectionReason === 'pdf_page_limit') {
    return opportunityError('pdf_page_limit', 'The PDF exceeds the 250-page limit.');
  }
  return opportunityError('invalid_pdf', 'The stored object is not a valid PDF.');
}

function assertVerificationIdentity(ingestion: PdfIngestionRecord, opportunityId: string, actorEmail: string): void {
  if (ingestion.opportunityId !== opportunityId || ingestion.entryType !== 'pdf') {
    throw opportunityError('upload_conflict', 'The ingestion does not belong to this Opportunity.');
  }
  if (ingestion.requestedByEmail.toLowerCase() !== actorEmail) {
    throw opportunityError('forbidden', 'This upload belongs to another authenticated actor.');
  }
}

function isAcquired(status: PdfIngestionRecord['status']): boolean {
  return ['ready', 'extracting', 'review_ready', 'partially_reviewed', 'applied'].includes(status);
}

function trustedBucket(bucket: string): string {
  if (typeof bucket !== 'string' || !bucket.trim()) {
    throw opportunityError('storage_unavailable', 'Private PDF Storage is not configured.');
  }
  return bucket;
}

async function telemetry(port: PdfAcquisitionTelemetryPort | undefined,
  event: Parameters<PdfAcquisitionTelemetryPort['record']>[0]): Promise<void> {
  if (!port) return;
  try { await port.record(event); } catch { /* telemetry never changes verification outcome */ }
}

function telemetryFailureCode(kind: OpportunityApplicationError['kind']): PdfAcquisitionFailureCode {
  const supported = new Set<PdfAcquisitionFailureCode>(['unsupported_document', 'upload_too_large',
    'invalid_pdf', 'encrypted_pdf', 'malformed_pdf', 'pdf_page_limit', 'verification_failure',
    'invalid_upload_request', 'unauthorized', 'opportunity_not_found', 'ingestion_not_found',
    'idempotency_conflict', 'upload_conflict', 'upload_missing', 'artifact_conflict',
    'storage_unavailable', 'unexpected']);
  return supported.has(kind as PdfAcquisitionFailureCode) ? kind as PdfAcquisitionFailureCode : 'unexpected';
}
