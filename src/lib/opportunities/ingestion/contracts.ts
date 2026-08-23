export type IngestionEntryType = 'pdf';
export type IngestionStatus = 'awaiting_source' | 'ready' | 'extracting' | 'review_ready' |
  'partially_reviewed' | 'applied' | 'failed' | 'cancelled';
export type ArtifactKind = 'pdf';
export type ArtifactValidationStatus = 'pending' | 'valid' | 'rejected' | 'quarantined';
export type ExtractionRunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type AssertionBasis = 'source_stated' | 'deterministically_derived' | 'system_proposed' |
  'visual_inference' | 'model_inference';
export type EconomicRole = 'descriptive_fact' | 'contractual_fact' | 'source_assumption' | 'upperline_assumption';
export type CandidateValueType = 'decimal' | 'integer' | 'date' | 'text' | 'boolean' | 'enum' | 'json';
export type CandidateUnit = 'USD' | 'USD_PER_SF' | 'USD_PER_SF_YEAR' | 'SF' |
  'PERCENT_DECIMAL' | 'MONTHS' | 'DAYS' | 'COUNT' | 'NONE' | 'ACRES' |
  'USD_PER_LAND_SF' | 'FEET' | 'VEHICLES_PER_DAY';
export type CandidateValidationState = 'valid' | 'invalid' | 'warning';
export type CandidateDecision = 'accepted' | 'rejected' | 'edited_and_accepted';
export type ConflictDisposition = 'no_conflict' | 'kept_existing' | 'replaced_existing' | 'deferred';

export type CandidateDestination =
  | { domain: 'opportunity'; fieldPath: string }
  | { domain: 'underwriting'; fieldPath: string }
  | { domain: 'source'; fieldPath: string }
  | { domain: 'tenant'; candidateTenantKey: string; fieldPath: string };

export type CandidateValue =
  | { type: 'decimal' | 'integer' | 'date' | 'text' | 'enum'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'json'; value: unknown };

export type CandidateEvidence = {
  artifactId: string; pageNumber?: number; snippet?: string;
  boundingBox?: { x: string; y: string; width: string; height: string };
  sectionLabel?: string; extractionMethod: string; extractionVersion?: string;
};

export type CandidateFact = {
  extractionRunId: string; destination: CandidateDestination; assertionBasis: AssertionBasis;
  economicRole: EconomicRole; rawValue: unknown; normalizedValue: CandidateValue | null;
  unit: CandidateUnit | null; confidence: string | null;
  validationState: CandidateValidationState; validationIssues: string[];
  groupKey?: string; ordinal: number; fingerprint: string;
};

export type CandidateFactDecision = {
  candidateFactId: string; decisionNumber: number; decision: CandidateDecision; reviewerEmail: string;
  acceptedValue: CandidateValue | null; acceptedUnit: CandidateUnit | null;
  selectedDestination: CandidateDestination; conflictDisposition: ConflictDisposition;
  metadata: Record<string, unknown>;
};
