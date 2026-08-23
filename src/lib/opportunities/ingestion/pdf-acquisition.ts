import type { OpportunityActor } from '../application/actor-core';
import { opportunityError } from '../application/errors';
import type { IngestionStatus } from './contracts';

export const PDF_ACQUISITION_POLICY = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 250,
  expectedMediaType: 'application/pdf' as const,
  expectedExtension: 'pdf' as const,
  maxOriginalFilenameCharacters: 255,
  maxIdempotencyKeyCharacters: 200,
});

export const MAX_PDF_BYTES = PDF_ACQUISITION_POLICY.maxBytes;
export const MAX_PDF_PAGES = PDF_ACQUISITION_POLICY.maxPages;
export const EXPECTED_PDF_MEDIA_TYPE = PDF_ACQUISITION_POLICY.expectedMediaType;
export const EXPECTED_PDF_EXTENSION = PDF_ACQUISITION_POLICY.expectedExtension;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const UPPERLINE_EMAIL = /^[^@\s]+@upperlineco\.com$/;

export type PdfRejectionReason =
  | 'unsupported_document' | 'upload_too_large' | 'invalid_pdf' | 'encrypted_pdf'
  | 'malformed_pdf' | 'pdf_page_limit' | 'verification_failure';

export type PdfAcquisitionFailureCode = PdfRejectionReason
  | 'invalid_upload_request' | 'unauthorized' | 'opportunity_not_found'
  | 'ingestion_not_found' | 'idempotency_conflict' | 'upload_conflict'
  | 'upload_missing' | 'artifact_conflict' | 'storage_unavailable' | 'unexpected';

export type SafeOriginalFileMetadata = {
  originalFilename: string | null;
  declaredMediaType: string | null;
  declaredByteSize: number | null;
};

export type PdfIngestionRequest = {
  opportunityId: string;
  idempotencyKey: string;
  originalFilename?: unknown;
  declaredMediaType?: unknown;
  declaredByteSize?: unknown;
};

export type PdfIngestionIdentity = {
  ingestionId: string;
  opportunityId: string;
  entryType: 'pdf';
  requestedByEmail: string;
  idempotencyKey: string;
};

export type PdfArtifactIdentity = { artifactId: string; ingestionId: string };

export type PdfObjectIdentity = {
  opportunityId: string;
  ingestionId: string;
  artifactId: string;
  objectPath: string;
};

export type PdfUploadState = 'awaiting_upload' | 'uploaded_pending_verification' | 'verifying';
export type PdfVerificationState = 'not_started' | 'pending' | 'in_progress' | 'verified' | 'rejected';
export type PdfAcquisitionStatus = PdfUploadState | 'ready' | 'failed' | 'cancelled';

export type PdfAcquisitionStatusProjection = {
  status: PdfAcquisitionStatus;
  uploadState: PdfUploadState | null;
  verificationState: PdfVerificationState;
  persistedStatus: IngestionStatus;
};

export type PdfIngestionRecord = PdfIngestionIdentity & {
  status: IngestionStatus;
  revision: number;
  failureCode: string | null;
  failureMessage: string | null;
};

export type CreateOrRecoverPdfIngestionInput = {
  opportunityId: string;
  requestedByEmail: string;
  idempotencyKey: string;
  entryType: 'pdf';
};

export type CreateOrRecoverPdfIngestionResult = {
  ingestion: PdfIngestionRecord;
  disposition: 'created' | 'recovered';
};

export interface PdfIngestionRepositoryPort {
  createOrRecoverPdfIngestion(
    input: CreateOrRecoverPdfIngestionInput,
  ): Promise<CreateOrRecoverPdfIngestionResult>;
  getPdfIngestion(ingestionId: string): Promise<PdfIngestionRecord | null>;
  finalizeVerifiedPdf(input: VerifiedPdfFinalization): Promise<{
    ingestionId: string; artifactId: string; ingestionStatus: 'ready';
  }>;
}

export interface PdfIngestionLookupPort {
  findLatestPdfIngestion(opportunityId: string, requestedByEmail: string): Promise<PdfIngestionRecord | null>;
}

export type OpportunityAccessAction = 'begin_pdf_ingestion' | 'view_pdf_ingestion'
  | 'authorize_pdf_upload' | 'verify_pdf_upload' | 'download_pdf_artifact';

export interface OpportunityAccessPort {
  opportunityExists(opportunityId: string): Promise<boolean>;
}

export interface OpportunityAuthorizer {
  authorize(input: {
    actor: OpportunityActor; opportunityId: string; action: OpportunityAccessAction;
  }): Promise<void>;
}

export class OrganizationWideOpportunityAuthorizer implements OpportunityAuthorizer {
  constructor(private readonly access: OpportunityAccessPort) {}

  async authorize(input: {
    actor: OpportunityActor; opportunityId: string; action: OpportunityAccessAction;
  }): Promise<void> {
    const email = normalizeActorEmail(input.actor);
    requireUuid(input.opportunityId, 'Opportunity ID');
    if (!UPPERLINE_EMAIL.test(email)) {
      throw opportunityError('forbidden', 'Upperline access is required.');
    }
    if (!await this.access.opportunityExists(input.opportunityId.toLowerCase())) {
      throw opportunityError('not_found', 'Opportunity was not found.');
    }
  }
}

export type UploadAuthorizationRequest = {
  actor: OpportunityActor;
  opportunityId: string;
  ingestionId: string;
};

export type UploadAuthorizationResult = {
  ingestionId: string;
  artifactId: string;
  objectPath: string;
  expiresAt: string;
  authorization: string;
  maximumByteSize: number;
};

export type PdfUploadAuthorizationOutcome =
  | { disposition: 'authorized'; ingestionId: string; artifactId: string;
      objectPath: string; authorization: string; expiresAt: string; maximumByteSize: number }
  | { disposition: 'uploaded_pending_verification'; ingestionId: string;
      artifactId: string; objectPath: string }
  | { disposition: 'ready'; ingestionId: string; artifactId: string; objectPath: string };

export type StoredObjectMetadata = {
  byteSize: number | null;
  mediaType: string | null;
  lastModifiedAt: string | null;
};

export type StoredObjectReader = {
  metadata: StoredObjectMetadata;
  bytes: AsyncIterable<Uint8Array>;
};

export interface PrivateArtifactObjectStorePort {
  createExactUploadAuthorization(input: {
    objectPath: string; mediaType: typeof EXPECTED_PDF_MEDIA_TYPE;
    maximumByteSize: number; overwrite: false;
  }): Promise<{ authorization: string; expiresAt: string }>;
  inspectExactObject(objectPath: string): Promise<StoredObjectMetadata | null>;
  openExactObject(objectPath: string): Promise<StoredObjectReader | null>;
  createExactReadAccess(objectPath: string, expiresInSeconds: number): Promise<{ url: string }>;
  deleteExactUntrustedObject(objectPath: string): Promise<void>;
}

export type PdfInspectionResult =
  | { readable: true; detectedMediaType: typeof EXPECTED_PDF_MEDIA_TYPE; pageCount: number;
      encrypted: false; diagnostics: string[] }
  | { readable: false; detectedMediaType: string | null; pageCount: null;
      encrypted: boolean; rejectionReason: PdfRejectionReason; diagnostics: string[] };

export interface PdfInspectorPort {
  inspectPdf(input: Uint8Array): Promise<PdfInspectionResult>;
}

export interface ByteDigestPort {
  sha256(input: AsyncIterable<Uint8Array>): Promise<{
    sha256Digest: string; byteCount: number;
  }>;
}

export type VerifiedPdfMetadata = {
  sha256Digest: string;
  byteSize: number;
  detectedMediaType: typeof EXPECTED_PDF_MEDIA_TYPE;
  pageCount: number;
  documentMetadata: Record<string, unknown>;
};

export type VerifiedPdfFinalization = {
  opportunityId: string;
  ingestionId: string;
  artifactId: string;
  storageBucket: string;
  storagePath: string;
  originalFilename: string | null;
  declaredMediaType: string | null;
  verified: VerifiedPdfMetadata;
  actorEmail: string;
};

export type PdfAcquisitionTelemetryEvent = {
  correlationId: string;
  opportunityId: string;
  ingestionId?: string;
  artifactId?: string;
  actorEmail: string;
  stage: 'begin' | 'upload_authorization' | 'verification' | 'finalization' | 'cleanup';
  outcome: 'started' | 'succeeded' | 'failed';
  byteSize?: number;
  pageCount?: number;
  digestPrefix?: string;
  failureCode?: PdfAcquisitionFailureCode;
  elapsedMilliseconds?: number;
};

export interface PdfAcquisitionTelemetryPort {
  record(event: PdfAcquisitionTelemetryEvent): void | Promise<void>;
}

export type BeginPdfIngestionResult = {
  disposition: 'created' | 'recovered';
  ingestion: PdfIngestionIdentity;
  artifact: PdfArtifactIdentity;
  object: PdfObjectIdentity;
  originalFile: SafeOriginalFileMetadata;
  status: PdfAcquisitionStatusProjection;
  policy: Pick<typeof PDF_ACQUISITION_POLICY, 'maxBytes' | 'maxPages' | 'expectedMediaType'>;
};

export function sanitizeOriginalFilename(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw opportunityError('invalid_upload_request', 'Original filename must be text.');
  }
  const leaf = value.replace(/\\/g, '/').split('/').at(-1) ?? '';
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().normalize('NFC');
  if (!cleaned) return null;
  const characters = Array.from(cleaned);
  if (characters.length <= PDF_ACQUISITION_POLICY.maxOriginalFilenameCharacters) return cleaned;
  const lastDot = cleaned.lastIndexOf('.');
  const suffix = lastDot > 0 && cleaned.length - lastDot <= 16 ? Array.from(cleaned.slice(lastDot)) : [];
  return [...characters.slice(0, PDF_ACQUISITION_POLICY.maxOriginalFilenameCharacters - suffix.length), ...suffix].join('');
}

export function validatePdfDeclaration(input: {
  originalFilename?: unknown; declaredMediaType?: unknown; declaredByteSize?: unknown;
}): SafeOriginalFileMetadata {
  const originalFilename = sanitizeOriginalFilename(input.originalFilename);
  const declaredMediaType = normalizeOptionalText(input.declaredMediaType, 'Declared media type')?.toLowerCase() ?? null;
  if (declaredMediaType !== null && declaredMediaType !== EXPECTED_PDF_MEDIA_TYPE) {
    throw opportunityError('unsupported_document', 'Only PDF documents are supported.');
  }
  if (originalFilename !== null) {
    const extension = originalFilename.includes('.') ? originalFilename.split('.').at(-1)?.toLowerCase() : null;
    if (extension !== EXPECTED_PDF_EXTENSION) {
      throw opportunityError('unsupported_document', 'The selected file must use a .pdf extension.');
    }
  }
  let declaredByteSize: number | null = null;
  if (input.declaredByteSize !== undefined && input.declaredByteSize !== null) {
    if (typeof input.declaredByteSize !== 'number' || !Number.isSafeInteger(input.declaredByteSize) || input.declaredByteSize <= 0) {
      throw opportunityError('invalid_upload_request', 'The selected PDF must have a positive whole-number byte size.');
    }
    if (input.declaredByteSize > MAX_PDF_BYTES) {
      throw opportunityError('upload_too_large', 'The selected PDF exceeds the 25 MiB limit.');
    }
    declaredByteSize = input.declaredByteSize;
  }
  return { originalFilename, declaredMediaType, declaredByteSize };
}

export function deriveFirstPdfArtifactIdentity(ingestionId: string): PdfArtifactIdentity {
  const normalized = requireUuid(ingestionId, 'Ingestion ID');
  return { artifactId: normalized, ingestionId: normalized };
}

export function buildPdfObjectIdentity(input: {
  opportunityId: string; ingestionId: string;
}): PdfObjectIdentity {
  const opportunityId = requireUuid(input.opportunityId, 'Opportunity ID');
  const ingestionId = requireUuid(input.ingestionId, 'Ingestion ID');
  const artifactId = deriveFirstPdfArtifactIdentity(ingestionId).artifactId;
  return {
    opportunityId, ingestionId, artifactId,
    objectPath: `opportunities/${opportunityId}/ingestions/${ingestionId}/artifacts/${artifactId}/source.pdf`,
  };
}

export function projectPdfAcquisitionStatus(input: {
  persistedStatus: IngestionStatus;
  objectPresence?: 'unknown' | 'missing' | 'present';
  verificationInProgress?: boolean;
}): PdfAcquisitionStatusProjection {
  const { persistedStatus } = input;
  if (persistedStatus === 'failed') return { status: 'failed', uploadState: null, verificationState: 'rejected', persistedStatus };
  if (persistedStatus === 'cancelled') return { status: 'cancelled', uploadState: null, verificationState: 'not_started', persistedStatus };
  if (persistedStatus !== 'awaiting_source') {
    return { status: 'ready', uploadState: null, verificationState: 'verified', persistedStatus };
  }
  if (input.verificationInProgress) {
    return { status: 'verifying', uploadState: 'verifying', verificationState: 'in_progress', persistedStatus };
  }
  if (input.objectPresence === 'present') {
    return { status: 'uploaded_pending_verification', uploadState: 'uploaded_pending_verification', verificationState: 'pending', persistedStatus };
  }
  return { status: 'awaiting_upload', uploadState: 'awaiting_upload', verificationState: 'not_started', persistedStatus };
}

export function validateVerifiedPdfFinalization(input: VerifiedPdfFinalization): VerifiedPdfFinalization {
  const expectedObject = buildPdfObjectIdentity(input);
  if (input.artifactId.toLowerCase() !== expectedObject.artifactId || input.storagePath !== expectedObject.objectPath) {
    throw opportunityError('artifact_conflict', 'Verified artifact identity conflicts with the ingestion.');
  }
  if (!input.storageBucket.trim()) throw opportunityError('validation', 'Verified Storage configuration is invalid.');
  if (!SHA256.test(input.verified.sha256Digest)) throw opportunityError('validation', 'Verified PDF digest is invalid.');
  if (!Number.isSafeInteger(input.verified.byteSize) || input.verified.byteSize <= 0 || input.verified.byteSize > MAX_PDF_BYTES) {
    throw opportunityError('validation', 'Verified PDF byte size is invalid.');
  }
  if (!Number.isSafeInteger(input.verified.pageCount) || input.verified.pageCount <= 0 || input.verified.pageCount > MAX_PDF_PAGES) {
    throw opportunityError('validation', 'Verified PDF page count is invalid.');
  }
  if (input.verified.detectedMediaType !== EXPECTED_PDF_MEDIA_TYPE) {
    throw opportunityError('validation', 'Verified document is not a PDF.');
  }
  if (!isPlainRecord(input.verified.documentMetadata)) throw opportunityError('validation', 'Verified document metadata is invalid.');
  normalizeActorEmail({ email: input.actorEmail, name: null });
  return input;
}

export async function beginPdfIngestion(
  request: PdfIngestionRequest,
  actor: OpportunityActor,
  dependencies: { authorizer: OpportunityAuthorizer; repository: PdfIngestionRepositoryPort },
): Promise<BeginPdfIngestionResult> {
  const opportunityId = requireUuid(request.opportunityId, 'Opportunity ID');
  const actorEmail = normalizeActorEmail(actor);
  const idempotencyKey = requireIdempotencyKey(request.idempotencyKey);
  const originalFile = validatePdfDeclaration(request);
  await dependencies.authorizer.authorize({ actor: { ...actor, email: actorEmail }, opportunityId, action: 'begin_pdf_ingestion' });
  const recovered = await dependencies.repository.createOrRecoverPdfIngestion({
    opportunityId, requestedByEmail: actorEmail, idempotencyKey, entryType: 'pdf',
  });
  assertReplayIdentity(recovered.ingestion, { opportunityId, requestedByEmail: actorEmail, idempotencyKey, entryType: 'pdf' });
  const artifact = deriveFirstPdfArtifactIdentity(recovered.ingestion.ingestionId);
  const object = buildPdfObjectIdentity({ opportunityId, ingestionId: recovered.ingestion.ingestionId });
  return {
    disposition: recovered.disposition,
    ingestion: {
      ingestionId: recovered.ingestion.ingestionId, opportunityId,
      entryType: 'pdf', requestedByEmail: actorEmail, idempotencyKey,
    },
    artifact, object, originalFile,
    status: projectPdfAcquisitionStatus({ persistedStatus: recovered.ingestion.status, objectPresence: 'unknown' }),
    policy: {
      maxBytes: MAX_PDF_BYTES, maxPages: MAX_PDF_PAGES,
      expectedMediaType: EXPECTED_PDF_MEDIA_TYPE,
    },
  };
}

export async function authorizePdfUpload(
  request: UploadAuthorizationRequest,
  dependencies: {
    authorizer: OpportunityAuthorizer;
    repository: PdfIngestionRepositoryPort;
    objectStore: PrivateArtifactObjectStorePort;
  },
): Promise<PdfUploadAuthorizationOutcome> {
  const opportunityId = requireUuid(request.opportunityId, 'Opportunity ID');
  const ingestionId = requireUuid(request.ingestionId, 'Ingestion ID');
  const actorEmail = normalizeActorEmail(request.actor);
  await dependencies.authorizer.authorize({
    actor: { ...request.actor, email: actorEmail }, opportunityId, action: 'authorize_pdf_upload',
  });
  const ingestion = await dependencies.repository.getPdfIngestion(ingestionId);
  if (!ingestion) throw opportunityError('ingestion_not_found', 'PDF ingestion was not found.');
  assertUploadIdentity(ingestion, { opportunityId, ingestionId, actorEmail });
  const object = buildPdfObjectIdentity({ opportunityId, ingestionId });
  if (ingestion.status !== 'awaiting_source') {
    if (['ready', 'extracting', 'review_ready', 'partially_reviewed', 'applied'].includes(ingestion.status)) {
      return { disposition: 'ready', ingestionId, artifactId: object.artifactId, objectPath: object.objectPath };
    }
    throw opportunityError('upload_conflict', 'This ingestion cannot accept an upload in its current state.');
  }
  const existing = await dependencies.objectStore.inspectExactObject(object.objectPath);
  if (existing) {
    return { disposition: 'uploaded_pending_verification', ingestionId,
      artifactId: object.artifactId, objectPath: object.objectPath };
  }
  const issued = await dependencies.objectStore.createExactUploadAuthorization({
    objectPath: object.objectPath, mediaType: EXPECTED_PDF_MEDIA_TYPE,
    maximumByteSize: MAX_PDF_BYTES, overwrite: false,
  });
  return { disposition: 'authorized', ingestionId, artifactId: object.artifactId,
    objectPath: object.objectPath, authorization: issued.authorization,
    expiresAt: issued.expiresAt, maximumByteSize: MAX_PDF_BYTES };
}

function assertReplayIdentity(
  actual: PdfIngestionRecord,
  expected: CreateOrRecoverPdfIngestionInput,
): void {
  const matches = actual.opportunityId === expected.opportunityId &&
    actual.requestedByEmail.toLowerCase() === expected.requestedByEmail &&
    actual.idempotencyKey === expected.idempotencyKey && actual.entryType === expected.entryType;
  if (!matches) throw opportunityError('idempotency_conflict', 'The idempotency key conflicts with another ingestion request.');
}

function assertUploadIdentity(
  ingestion: PdfIngestionRecord,
  expected: { opportunityId: string; ingestionId: string; actorEmail: string },
): void {
  if (ingestion.ingestionId !== expected.ingestionId || ingestion.opportunityId !== expected.opportunityId ||
      ingestion.entryType !== 'pdf') {
    throw opportunityError('upload_conflict', 'The ingestion does not belong to this Opportunity.');
  }
  if (ingestion.requestedByEmail.toLowerCase() !== expected.actorEmail) {
    throw opportunityError('forbidden', 'This upload belongs to another authenticated actor.');
  }
}

function requireUuid(value: string, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw opportunityError('validation', `${label} must be a UUID.`);
  return value.toLowerCase();
}

function requireIdempotencyKey(value: string): string {
  if (typeof value !== 'string') throw opportunityError('invalid_upload_request', 'Idempotency key is required.');
  const normalized = value.trim();
  if (!normalized || normalized.length > PDF_ACQUISITION_POLICY.maxIdempotencyKeyCharacters || /[\u0000-\u001f\u007f-\u009f]/.test(normalized)) {
    throw opportunityError('invalid_upload_request', 'Idempotency key is invalid.');
  }
  return normalized;
}

function normalizeActorEmail(actor: OpportunityActor): string {
  if (!actor || typeof actor.email !== 'string' || !actor.email.trim()) {
    throw opportunityError('unauthorized', 'Authentication is required.');
  }
  return actor.email.trim().toLowerCase();
}

function normalizeOptionalText(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw opportunityError('invalid_upload_request', `${label} must be text.`);
  const normalized = value.trim();
  if (!normalized || /[\u0000-\u001f\u007f-\u009f]/.test(normalized)) {
    throw opportunityError('invalid_upload_request', `${label} is invalid.`);
  }
  return normalized;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
