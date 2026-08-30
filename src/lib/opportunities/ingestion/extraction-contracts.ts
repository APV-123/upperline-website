import type { CandidateUnit, CandidateValue, ExtractionRunStatus } from './contracts';
import type { TrafficCountPropositionV1 } from './rich-candidate';

export const EXTRACTION_POLICY = Object.freeze({
  maxPdfBytes: 10 * 1024 * 1024,
  maxPages: 25,
  maxCandidates: 100,
  maxEvidencePerCandidate: 5,
  maxSnippetCharacters: 500,
  minimumTimeoutMilliseconds: 60_000,
  maximumTimeoutMilliseconds: 120_000,
});

export const EXTRACTION_SCHEMA_VERSION = 'land-flyer-v2' as const;
export const LEGACY_EXTRACTION_SCHEMA_VERSION = 'land-flyer-v1' as const;
export type ProviderAssertionBasis = 'source_stated' | 'visual_inference' | 'model_inference';

export type ExtractionBoundingBox = { x: string; y: string; width: string; height: string };
export type ValidatedExtractionEvidence = {
  pageNumber: number;
  snippet?: string;
  boundingBox?: ExtractionBoundingBox;
  sectionLabel?: string;
};
export type ValidatedExtractionAssertion = {
  destination: string;
  value: CandidateValue;
  unit: CandidateUnit;
  assertionBasis: ProviderAssertionBasis;
  confidence: string | null;
  evidence: ValidatedExtractionEvidence[];
};
export type ValidatedTrafficProposition = { proposition: TrafficCountPropositionV1; assertionBasis: ProviderAssertionBasis; confidence: string | null; evidence: ValidatedExtractionEvidence[] };
export type ValidatedProviderOutput = {
  schemaVersion: typeof EXTRACTION_SCHEMA_VERSION | typeof LEGACY_EXTRACTION_SCHEMA_VERSION;
  assertions: ValidatedExtractionAssertion[];
  propositions?: ValidatedTrafficProposition[];
};

export type ExtractionConfiguration = {
  provider: string;
  model: string;
  extractionStrategy: string;
  extractionVersion: string;
  parserVersion: string;
  promptVersion: string;
  schemaVersion: typeof EXTRACTION_SCHEMA_VERSION | typeof LEGACY_EXTRACTION_SCHEMA_VERSION;
  timeoutMilliseconds: number;
};

export type VerifiedExtractionArtifact = {
  opportunityId: string;
  ingestionId: string;
  artifactId: string;
  storagePath: string;
  sha256Digest: string;
  byteSize: number;
  pageCount: number;
  detectedMediaType: 'application/pdf';
};

export type ExtractionProviderRequest = {
  pdfBytes: Uint8Array;
  verifiedPageCount: number;
  configuration: Readonly<Pick<ExtractionConfiguration,
    'model' | 'extractionVersion' | 'promptVersion' | 'schemaVersion'>>;
  signal: AbortSignal;
};

export interface ExtractionProviderPort {
  readonly identifier: string;
  extract(request: ExtractionProviderRequest): Promise<unknown>;
}

export type ExtractionRunRecord = {
  runId: string;
  attemptNumber: number;
  status: ExtractionRunStatus;
  candidateCount?: number;
  evidenceCount?: number;
};

export type ExtractionCompletionCandidate = {
  id: string;
  destinationDomain: 'source';
  fieldPath: string;
  candidateTenantKey: null;
  assertionBasis: ProviderAssertionBasis;
  economicRole: 'descriptive_fact';
  rawValue: unknown;
  normalizedValueType: CandidateValue['type'];
  normalizedValue: unknown;
  unit: CandidateUnit;
  confidence: string | null;
  validationState: 'valid' | 'warning';
  validationIssues: string[];
  groupKey: string | null;
  ordinal: number;
  fingerprint: string;
  evidence: Array<{
    id: string; pageNumber: number; snippet: string | null;
    boundingBox?: ExtractionBoundingBox; sectionLabel: string | null;
    extractionMethod: string; extractionVersion: string; ordinal: number;
  }>;
};

export interface ExtractionRepositoryPort {
  resolveEligibleArtifact(opportunityId: string): Promise<VerifiedExtractionArtifact | null>;
  allocateRun(input: {
    artifact: VerifiedExtractionArtifact; runId: string; idempotencyKey: string;
    configuration: ExtractionConfiguration; actorEmail: string;
  }): Promise<{ run: ExtractionRunRecord; disposition: 'allocated' | 'recovered' }>;
  allocateRetryRun(input: {
    artifact: VerifiedExtractionArtifact; runId: string; logicalExtractionKey: string;
    retryCommandId: string; configuration: ExtractionConfiguration; actorEmail: string;
  }): Promise<{ run: ExtractionRunRecord; disposition: 'allocated' | 'recovered' }>;
  completeRun(input: {
    artifact: VerifiedExtractionArtifact; runId: string;
    candidates: ExtractionCompletionCandidate[]; diagnostics: unknown[];
  }): Promise<ExtractionRunRecord>;
  failRun(input: {
    artifact: VerifiedExtractionArtifact; runId: string;
    failureCode: string; failureMessage: string; diagnostics: unknown[];
  }): Promise<void>;
  recoverSucceededRun(runId: string): Promise<ExtractionRunRecord>;
}

export type ExtractionTelemetryEvent = Readonly<{
  stage: 'resolve_artifact' | 'allocate_run' | 'retrieve_bytes' | 'provider' |
    'validate_output' | 'map_candidates' | 'complete_run' | 'recover';
  outcome: 'started' | 'succeeded' | 'failed';
  provider: string;
  model: string;
  schemaVersion: string;
  promptVersion: string;
  extractionVersion: string;
  durationMilliseconds?: number;
  pageCount?: number;
  candidateCount?: number;
  rejectedOutputCount?: number;
  failureClassification?: string;
  attemptNumber?: number;
  tokenCount?: number;
  costUsd?: string;
}>;
export interface ExtractionTelemetryPort { record(event: ExtractionTelemetryEvent): void | Promise<void> }

export class ExtractionProviderTimeoutError extends Error { constructor() { super('Provider timed out.'); this.name = 'ExtractionProviderTimeoutError'; } }
export class ExtractionProviderFailureError extends Error { constructor() { super('Provider failed.'); this.name = 'ExtractionProviderFailureError'; } }
