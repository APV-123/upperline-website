import type {
  LeaseStructure,
  ObservationOrigin,
  PartialDate,
  RentAmountBasis,
  RentAreaBasis,
  RentCommitment,
  RentComponent,
  RentLifecycle,
  RentMeaning,
  RentTimeBasis,
} from './observation-contracts';

/** Phase 4C.3.1 is a pure semantic contract. None of these types are persistence DTOs. */
export const PROPERTY_INTELLIGENCE_PROMOTION_CONTRACT_VERSION =
  'property-intelligence-promotion-domain-v1' as const;

export const PROMOTION_FAMILIES = ['area', 'rent', 'lease_term'] as const;
export type PromotionFamily = (typeof PROMOTION_FAMILIES)[number];

export const CANDIDATE_SEMANTIC_INPUT_ROLES = [
  'area_amount', 'rent_amount', 'lease_term_value', 'currency_code',
  'rent_meaning', 'rent_commitment', 'rent_component', 'rent_amount_basis',
  'rent_time_basis', 'rent_area_basis', 'lease_structure', 'rent_lifecycle',
  'temporal_value', 'property_reference', 'space_reference', 'tenant_reference',
  'lease_reference', 'lease_instrument_reference',
] as const;
export type CandidateSemanticInputRole = (typeof CANDIDATE_SEMANTIC_INPUT_ROLES)[number];

export type CandidateInputReference = {
  /** Workflow lineage only. Excluded from proposition identity. */
  candidateReference: string;
  role: CandidateSemanticInputRole;
};

export type EvidenceInputReference = {
  /** Workflow lineage only. It does not itself establish durable evidence authority. */
  evidenceReference: string;
  candidateReference: string;
  reviewSufficiency: 'review_only' | 'durable_locator_ready';
  locator:
    | { type: 'pdf'; page: number; boundingBox?: { x: string; y: string; width: string; height: string }; validatedTextAnchor?: string }
    | { type: 'spreadsheet'; sheet: string; position: { kind: 'cell' | 'range'; reference: string } | { kind: 'row'; row: number } }
    | { type: 'structured_record'; recordIdentifier: string; fieldPath?: string }
    | { type: 'document'; section?: string; clause?: string; paragraph?: number }
    | { type: 'human_attestation'; noteReference: string }
    | null;
};

export const SUBJECT_AUTHORITY_STATES = ['confirmed', 'unresolved', 'ambiguous', 'not_required'] as const;
export type SubjectAuthorityState = (typeof SUBJECT_AUTHORITY_STATES)[number];

export const PROMOTION_SUBJECT_ROLES = [
  'property', 'building', 'premises', 'reported_space', 'tenant_organization',
  'brand', 'tenancy', 'lease', 'lease_instrument', 'landlord_organization',
] as const;
export type PromotionSubjectRole = (typeof PROMOTION_SUBJECT_ROLES)[number];

export type SubjectSelection = {
  role: PromotionSubjectRole;
  authority: SubjectAuthorityState;
  /** Pre-authorized durable reference, not a caller-created identity. */
  subjectReference?: string;
  premisesContainment?: 'unique_confirmed_for_property' | 'not_qualified' | 'ambiguous';
};

export type SourceEditionArtifactSelection = {
  globalArtifact: 'established' | 'missing';
  acquisitionLineage: 'established' | 'missing';
  representation: 'unique' | 'missing' | 'ambiguous';
  containingSource: 'established' | 'missing';
  upstreamAttribution: 'not_applicable' | 'established' | 'missing';
};

export type TemporalValue =
  | { state: 'absent' }
  | { state: 'open' }
  | { state: 'unknown' }
  | { state: 'known'; value: Exclude<PartialDate, { precision: 'unknown' }> };

export const PROMOTION_TEMPORAL_ROLES = [
  'as_of', 'measurement', 'vintage', 'effective_start', 'effective_end',
  'reporting_period_start', 'reporting_period_end', 'lease_commencement',
  'rent_commencement', 'lease_expiration',
] as const;
export type PromotionTemporalRole = (typeof PROMOTION_TEMPORAL_ROLES)[number];
export type TemporalMapping = { role: PromotionTemporalRole; value: TemporalValue };

export type AreaClassificationMapping = {
  family: 'area';
  meaning: 'site_area' | 'building_area' | 'premises_area' | 'reported_space_area';
  unit: 'square_feet' | 'acres';
  origin: Exclude<ObservationOrigin, 'deterministic_derived'>;
};

export type RentClassificationMapping = {
  family: 'rent';
  meaning: RentMeaning;
  commitment: RentCommitment;
  component: RentComponent;
  amountBasis: RentAmountBasis;
  timeBasis: RentTimeBasis;
  areaBasis: RentAreaBasis;
  leaseStructure: LeaseStructure;
  lifecycle: RentLifecycle;
  currencyCode: string | null;
  origin: Exclude<ObservationOrigin, 'deterministic_derived'>;
};

export type LeaseTermClassificationMapping = {
  family: 'lease_term';
  termType: 'lease_commencement' | 'rent_commencement' | 'lease_expiration';
  origin: Exclude<ObservationOrigin, 'deterministic_derived'>;
};

export type ClassificationMapping =
  | AreaClassificationMapping
  | RentClassificationMapping
  | LeaseTermClassificationMapping;

export type PromotionBundle = {
  family: PromotionFamily;
  candidates: readonly CandidateInputReference[];
  evidence: readonly EvidenceInputReference[];
  subjects: readonly SubjectSelection[];
  source: SourceEditionArtifactSelection;
  temporal: readonly TemporalMapping[];
  classification: ClassificationMapping;
};

/** Facts that a future authoritative database operation must derive and lock. */
export type PromotionAuthorityFacts = {
  currentSuccessfulRun: boolean;
  allCandidatesAccepted: boolean;
  candidatesShareArtifact: boolean;
  candidatesShareRun: boolean;
  candidateValuesCanonical: boolean;
  browserAttemptedValueOverride?: boolean;
  browserAttemptedSourceOverride?: boolean;
  browserAttemptedSubjectOverride?: boolean;
  attemptedImplicitIdentityCreation?: 'premises' | 'reported_space' | null;
};

export const PROMOTION_INELIGIBILITY_CLASSIFICATIONS = [
  'unsupported_family', 'stale_extraction_run', 'candidate_not_accepted',
  'ambiguous_candidate_bundle', 'cross_artifact_bundle', 'cross_run_bundle',
  'unresolved_property', 'ambiguous_property', 'unresolved_subject', 'ambiguous_subject',
  'premises_containment_not_qualified', 'implicit_identity_creation_forbidden',
  'missing_durable_source_edition', 'ambiguous_source_edition', 'missing_acquisition_lineage',
  'missing_containing_source', 'missing_upstream_attribution', 'insufficient_durable_evidence',
  'incomplete_classification', 'invalid_temporal_interpretation',
  'deterministic_derivation_forbidden', 'authority_escalation_attempt',
  'existing_observation_reconciliation_required',
] as const;
export type PromotionIneligibilityClassification =
  (typeof PROMOTION_INELIGIBILITY_CLASSIFICATIONS)[number];

export const PROMOTION_FAILURE_CLASSIFICATIONS = [
  'invalid_command', 'authority_state_changed', 'canonicalization_failure',
  'transaction_conflict', 'unexpected_failure',
] as const;
export type PromotionFailureClassification = (typeof PROMOTION_FAILURE_CLASSIFICATIONS)[number];

export type PromotionEligibility =
  | { eligible: true; disposition: 'eligible_for_pending_construction' }
  | { eligible: false; disposition: 'ineligible'; classification: PromotionIneligibilityClassification };

export const RECONCILIATION_DISPOSITIONS = [
  'no_existing_match', 'idempotent_match', 'create_independent_observation',
  'create_dependent_restatement', 'create_contradicting_observation',
  'create_materially_distinct_observation', 'human_reconciliation_required',
] as const;
export type ReconciliationDisposition = (typeof RECONCILIATION_DISPOSITIONS)[number];

export type IndependenceClassification =
  'independent' | 'derivative' | 'same_logical_source' | 'same_artifact' | 'unknown';

export type ExistingObservationComparison = {
  proposition: 'same' | 'different_value' | 'different_context' | 'ambiguous';
  sourceContext: 'same' | 'independent' | 'dependent' | 'unknown';
};

export type ReconciliationResult = {
  disposition: ReconciliationDisposition;
  relationship: 'restates' | 'contradicts' | null;
  independenceAssessment: IndependenceClassification | 'required' | null;
};

export const PROMOTION_DISPOSITIONS = [
  'eligible_for_pending_construction', 'matched_existing', 'ineligible',
] as const;
export type PromotionDisposition = (typeof PROMOTION_DISPOSITIONS)[number];

function subject(bundle: PromotionBundle, role: PromotionSubjectRole): SubjectSelection[] {
  return bundle.subjects.filter((item) => item.role === role);
}

function invalidTemporal(mapping: TemporalMapping): boolean {
  const intervalRoles: readonly PromotionTemporalRole[] = [
    'effective_start', 'effective_end', 'reporting_period_start', 'reporting_period_end',
  ];
  if (mapping.value.state === 'open' && !intervalRoles.includes(mapping.role)) return true;
  if (mapping.value.state !== 'known') return false;
  const value = mapping.value.value;
  if (value.precision === 'year') return !Number.isInteger(value.year) || value.month !== null || value.day !== null;
  if (value.precision === 'month') return !Number.isInteger(value.year) || !Number.isInteger(value.month)
    || value.month < 1 || value.month > 12 || value.day !== null;
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day));
  return date.getUTCFullYear() !== value.year || date.getUTCMonth() !== value.month - 1 || date.getUTCDate() !== value.day;
}

function durableEvidenceValid(evidence: EvidenceInputReference): boolean {
  if (evidence.reviewSufficiency !== 'durable_locator_ready' || evidence.locator === null) return false;
  const locator = evidence.locator;
  if (locator.type === 'pdf') {
    if (!Number.isInteger(locator.page) || locator.page < 1) return false;
    if (!locator.boundingBox) return true;
    const values = [locator.boundingBox.x, locator.boundingBox.y, locator.boundingBox.width, locator.boundingBox.height];
    if (!values.every(value => /^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value))) return false;
    return Number(locator.boundingBox.width) > 0 && Number(locator.boundingBox.height) > 0;
  }
  if (locator.type === 'spreadsheet') {
    if (!locator.sheet.trim()) return false;
    if (locator.position.kind === 'row') return Number.isInteger(locator.position.row) && locator.position.row > 0;
    return locator.position.kind === 'cell'
      ? /^[A-Z]+[1-9][0-9]*$/.test(locator.position.reference)
      : /^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/.test(locator.position.reference);
  }
  if (locator.type === 'structured_record') return locator.recordIdentifier.trim().length > 0;
  if (locator.type === 'document') return Boolean(locator.section || locator.clause || locator.paragraph);
  return locator.noteReference.trim().length > 0;
}

function classificationComplete(bundle: PromotionBundle): boolean {
  if (bundle.classification.family !== bundle.family) return false;
  if (bundle.classification.origin === 'model_inferred') return false;
  if (bundle.family !== 'rent') return true;
  const value = bundle.classification as RentClassificationMapping;
  if (value.amountBasis === 'monetary_per_area' && value.areaBasis === 'not_applicable') return false;
  if (value.amountBasis !== 'monetary_per_area' && value.areaBasis !== 'not_applicable') return false;
  if (value.amountBasis === 'percentage' && (value.component !== 'percentage' || value.timeBasis !== 'not_applicable')) return false;
  if (value.meaning === 'asking' && value.commitment !== 'marketed_uncommitted') return false;
  if (value.meaning === 'contractual' && !['executed', 'reported_contractual', 'option'].includes(value.commitment)) return false;
  if (value.meaning === 'market_opinion' && value.commitment !== 'not_applicable') return false;
  if (value.commitment === 'option' && value.lifecycle !== 'prospective') return false;
  if (value.lifecycle === 'future_scheduled' && !['executed', 'reported_contractual'].includes(value.commitment)) return false;
  return value.amountBasis === 'percentage' ? value.currencyCode === null : Boolean(value.currencyCode?.match(/^[A-Z]{3}$/));
}

export function evaluatePromotionEligibility(
  bundle: PromotionBundle,
  authority: PromotionAuthorityFacts,
): PromotionEligibility {
  if (!PROMOTION_FAMILIES.includes(bundle.family)) return { eligible: false, disposition: 'ineligible', classification: 'unsupported_family' };
  if (authority.browserAttemptedValueOverride || authority.browserAttemptedSourceOverride || authority.browserAttemptedSubjectOverride) {
    return { eligible: false, disposition: 'ineligible', classification: 'authority_escalation_attempt' };
  }
  if (!authority.currentSuccessfulRun) return { eligible: false, disposition: 'ineligible', classification: 'stale_extraction_run' };
  if (!authority.allCandidatesAccepted) return { eligible: false, disposition: 'ineligible', classification: 'candidate_not_accepted' };
  if (!authority.candidatesShareArtifact) return { eligible: false, disposition: 'ineligible', classification: 'cross_artifact_bundle' };
  if (!authority.candidatesShareRun) return { eligible: false, disposition: 'ineligible', classification: 'cross_run_bundle' };
  if (!authority.candidateValuesCanonical || bundle.candidates.length === 0) return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_candidate_bundle' };
  if (new Set(bundle.candidates.map((item) => item.candidateReference)).size !== bundle.candidates.length) {
    return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_candidate_bundle' };
  }
  if (bundle.family === 'rent' && bundle.candidates.some((item) => item.role === 'area_amount')) {
    return { eligible: false, disposition: 'ineligible', classification: 'deterministic_derivation_forbidden' };
  }
  const expectedRole: CandidateSemanticInputRole = bundle.family === 'area'
    ? 'area_amount' : bundle.family === 'rent' ? 'rent_amount' : 'lease_term_value';
  const allowedRoles: Readonly<Record<PromotionFamily, readonly CandidateSemanticInputRole[]>> = {
    area: ['area_amount', 'temporal_value', 'property_reference', 'space_reference'],
    rent: [
      'rent_amount', 'currency_code', 'rent_meaning', 'rent_commitment', 'rent_component',
      'rent_amount_basis', 'rent_time_basis', 'rent_area_basis', 'lease_structure',
      'rent_lifecycle', 'temporal_value', 'property_reference', 'space_reference',
      'tenant_reference', 'lease_reference', 'lease_instrument_reference',
    ],
    lease_term: [
      'lease_term_value', 'temporal_value', 'property_reference', 'space_reference',
      'tenant_reference', 'lease_reference', 'lease_instrument_reference',
    ],
  };
  if (bundle.candidates.filter(item => item.role === expectedRole).length !== 1
    || bundle.candidates.some(item => !allowedRoles[bundle.family].includes(item.role))) {
    return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_candidate_bundle' };
  }
  if (authority.attemptedImplicitIdentityCreation) return { eligible: false, disposition: 'ineligible', classification: 'implicit_identity_creation_forbidden' };
  const properties = subject(bundle, 'property');
  if (properties.some((item) => item.authority === 'ambiguous') || properties.length > 1) return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_property' };
  if (properties.length !== 1 || properties[0].authority !== 'confirmed') return { eligible: false, disposition: 'ineligible', classification: 'unresolved_property' };
  if (bundle.subjects.some((item) => item.authority === 'ambiguous')) return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_subject' };
  if (bundle.subjects.some((item) => item.authority === 'unresolved')) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
  if (subject(bundle, 'premises').some((item) => item.premisesContainment !== 'unique_confirmed_for_property')) {
    return { eligible: false, disposition: 'ineligible', classification: 'premises_containment_not_qualified' };
  }
  const physicalRole = bundle.classification.family === 'area' ? bundle.classification.meaning : null;
  if (physicalRole === 'building_area' && subject(bundle, 'building').length !== 1) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
  if (physicalRole === 'premises_area' && subject(bundle, 'premises').length !== 1) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
  if (physicalRole === 'reported_space_area' && subject(bundle, 'reported_space').length !== 1) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
  if (bundle.family === 'lease_term' && subject(bundle, 'lease').length !== 1) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
  if (bundle.family === 'rent') {
    const rent = bundle.classification as RentClassificationMapping;
    if (rent.meaning === 'contractual' && subject(bundle, 'lease').length !== 1) return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
    if (rent.amountBasis === 'monetary_per_area' && subject(bundle, 'premises').length + subject(bundle, 'reported_space').length !== 1) {
      return { eligible: false, disposition: 'ineligible', classification: 'unresolved_subject' };
    }
  }
  if (bundle.source.globalArtifact === 'missing' || bundle.source.representation === 'missing') return { eligible: false, disposition: 'ineligible', classification: 'missing_durable_source_edition' };
  if (bundle.source.representation === 'ambiguous') return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_source_edition' };
  if (bundle.source.acquisitionLineage === 'missing') return { eligible: false, disposition: 'ineligible', classification: 'missing_acquisition_lineage' };
  if (bundle.source.containingSource === 'missing') return { eligible: false, disposition: 'ineligible', classification: 'missing_containing_source' };
  if (bundle.source.upstreamAttribution === 'missing') return { eligible: false, disposition: 'ineligible', classification: 'missing_upstream_attribution' };
  const candidateReferences = new Set(bundle.candidates.map(item => item.candidateReference));
  if (bundle.evidence.some(item => !candidateReferences.has(item.candidateReference))) {
    return { eligible: false, disposition: 'ineligible', classification: 'ambiguous_candidate_bundle' };
  }
  if (!bundle.evidence.some(durableEvidenceValid)) return { eligible: false, disposition: 'ineligible', classification: 'insufficient_durable_evidence' };
  if (!classificationComplete(bundle)) return { eligible: false, disposition: 'ineligible', classification: 'incomplete_classification' };
  if (bundle.temporal.some(invalidTemporal) || new Set(bundle.temporal.map((item) => item.role)).size !== bundle.temporal.length) {
    return { eligible: false, disposition: 'ineligible', classification: 'invalid_temporal_interpretation' };
  }
  if (bundle.family === 'lease_term') {
    const classification = bundle.classification as LeaseTermClassificationMapping;
    if (!bundle.temporal.some(item => item.role === classification.termType)) {
      return { eligible: false, disposition: 'ineligible', classification: 'invalid_temporal_interpretation' };
    }
  }
  return { eligible: true, disposition: 'eligible_for_pending_construction' };
}

export function reconcileExistingObservation(comparison: ExistingObservationComparison): ReconciliationResult {
  if (comparison.proposition === 'ambiguous' || (comparison.proposition === 'same' && comparison.sourceContext === 'unknown')) {
    return { disposition: 'human_reconciliation_required', relationship: null, independenceAssessment: null };
  }
  if (comparison.proposition === 'different_context') {
    return { disposition: 'create_materially_distinct_observation', relationship: null, independenceAssessment: null };
  }
  if (comparison.proposition === 'different_value') {
    return { disposition: 'create_contradicting_observation', relationship: 'contradicts', independenceAssessment: 'required' };
  }
  if (comparison.sourceContext === 'same') {
    return { disposition: 'idempotent_match', relationship: null, independenceAssessment: null };
  }
  if (comparison.sourceContext === 'independent') {
    return { disposition: 'create_independent_observation', relationship: 'restates', independenceAssessment: 'independent' };
  }
  return { disposition: 'create_dependent_restatement', relationship: 'restates', independenceAssessment: 'derivative' };
}

/**
 * Future canonical digests include proposition content only: family, numeric value,
 * classifications, durable subjects, and temporal assertions. They exclude workflow
 * candidate/Opportunity IDs, reviewer, command ID, and textual decimal scale.
 * Provenance context is canonicalized separately.
 */
export type CanonicalPromotionSemantics = {
  proposition: {
    family: PromotionFamily;
    numericValue: string | null;
    classification: ClassificationMapping;
    subjectRoles: readonly PromotionSubjectRole[];
    temporal: readonly TemporalMapping[];
  };
  provenance: {
    artifactContentIdentity: string;
    sourceEditionIdentity: string;
    upstreamRelationshipIdentity: string | null;
  };
};

/** Canonicalizes an admitted decimal lexeme without IEEE-754 arithmetic. */
export function canonicalizePromotionDecimal(value: string): string | null {
  if (!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) return null;
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ''] = unsigned.split('.');
  const trimmedFraction = fraction.replace(/0+$/, '');
  const canonical = trimmedFraction ? `${integer}.${trimmedFraction}` : integer;
  return canonical === '0' ? '0' : negative ? `-${canonical}` : canonical;
}
