import type {
  ArtifactRepresentationRole,
  IntelligenceSourceKind,
  PublicationPrecision,
  SourceRelationshipType,
} from './contracts';

/** Phase 4C.3.2A is a pure semantic contract, not a persistence or transport model. */
export const PROPERTY_INTELLIGENCE_PROVENANCE_BRIDGE_CONTRACT_VERSION =
  'property-intelligence-provenance-bridge-v1' as const;

export const OPPORTUNITY_ARTIFACT_ELIGIBILITY = [
  'eligible', 'invalid', 'quarantined', 'pending_validation', 'unsupported_family',
] as const;
export type OpportunityArtifactEligibility = (typeof OPPORTUNITY_ARTIFACT_ELIGIBILITY)[number];

export const GLOBAL_ARTIFACT_DISPOSITIONS = [
  'created_global_artifact', 'reused_global_artifact', 'artifact_not_bridgeable',
  'artifact_identity_mismatch', 'authoritative_mime_mismatch',
  'unsupported_artifact_family', 'caller_authority_forbidden',
] as const;
export type GlobalArtifactDisposition = (typeof GLOBAL_ARTIFACT_DISPOSITIONS)[number];

export type AuthoritativeArtifactFacts = {
  eligibility: OpportunityArtifactEligibility;
  historicallyWorkflowSuperseded: boolean;
  sha256Digest: string;
  byteSize: string;
  detectedMediaType: string;
};

export type ExistingGlobalArtifactFacts = {
  sha256Digest: string;
  byteSize: string;
  detectedMediaType: string;
} | null;

export type ArtifactBridgeAuthority = {
  callerSuppliedDigest?: boolean;
  callerSuppliedByteSize?: boolean;
  callerSuppliedOwnership?: boolean;
  callerSuppliedAcquisitionIdentity?: boolean;
};

export type GlobalArtifactResult = {
  established: boolean;
  disposition: GlobalArtifactDisposition;
};

export function evaluateGlobalArtifact(
  opportunity: AuthoritativeArtifactFacts,
  existing: ExistingGlobalArtifactFacts,
  authority: ArtifactBridgeAuthority = {},
): GlobalArtifactResult {
  if (authority.callerSuppliedDigest || authority.callerSuppliedByteSize
    || authority.callerSuppliedOwnership || authority.callerSuppliedAcquisitionIdentity) {
    return { established: false, disposition: 'caller_authority_forbidden' };
  }
  if (opportunity.eligibility === 'unsupported_family') {
    return { established: false, disposition: 'unsupported_artifact_family' };
  }
  if (opportunity.eligibility !== 'eligible') {
    return { established: false, disposition: 'artifact_not_bridgeable' };
  }
  if (!existing) return { established: true, disposition: 'created_global_artifact' };
  if (existing.sha256Digest !== opportunity.sha256Digest || existing.byteSize !== opportunity.byteSize) {
    return { established: false, disposition: 'artifact_identity_mismatch' };
  }
  if (existing.detectedMediaType !== opportunity.detectedMediaType) {
    return { established: false, disposition: 'authoritative_mime_mismatch' };
  }
  return { established: true, disposition: 'reused_global_artifact' };
}

export const ACQUISITION_ENCOUNTERS = [
  'same_opportunity_artifact_replay', 'different_opportunity', 'different_ingestion',
  'different_url', 'email_and_download', 'revised_bytes',
] as const;
export type AcquisitionEncounter = (typeof ACQUISITION_ENCOUNTERS)[number];
export type AcquisitionDisposition = 'recovered_existing_acquisition' | 'created_new_acquisition';

export type AcquisitionResult = {
  artifactIdentity: 'same' | 'new';
  disposition: AcquisitionDisposition;
};

/** One acquisition is one durable encounter/custody path for immutable bytes. */
export function classifyAcquisitionEncounter(encounter: AcquisitionEncounter): AcquisitionResult {
  if (encounter === 'same_opportunity_artifact_replay') {
    return { artifactIdentity: 'same', disposition: 'recovered_existing_acquisition' };
  }
  if (encounter === 'revised_bytes') {
    return { artifactIdentity: 'new', disposition: 'created_new_acquisition' };
  }
  return { artifactIdentity: 'same', disposition: 'created_new_acquisition' };
}

export const REVIEWED_AUTHORITY_STATES = [
  'unresolved', 'proposed', 'ambiguous', 'confirmed', 'rejected', 'reversed',
] as const;
export type ReviewedAuthorityState = (typeof REVIEWED_AUTHORITY_STATES)[number];

export type SourceIdentityProposal = {
  proposalReference: string;
  proposedSourceTitle: string;
  proposedSourceKind: IntelligenceSourceKind;
  publisherEvidence: 'none' | 'matching_evidence' | 'preauthorized_identity';
  matchingEvidence: readonly ('title' | 'filename' | 'property' | 'publisher' | 'uploader')[];
};

export type EditionPublication =
  | { precision: 'unknown'; year: null; month: null; day: null; authority: 'unknown' }
  | { precision: 'year'; year: number; month: null; day: null; authority: 'source_explicit' | 'human_confirmed' }
  | { precision: 'month'; year: number; month: number; day: null; authority: 'source_explicit' | 'human_confirmed' }
  | { precision: 'day'; year: number; month: number; day: number; authority: 'source_explicit' | 'human_confirmed' }
  | { precision: Exclude<PublicationPrecision, 'unknown'>; year: number; month: number | null; day: number | null; authority: 'filename_inferred' | 'acquisition_inferred' };

export type SourceEditionProposal = {
  proposalReference: string;
  sourceSelection: 'preauthorized_existing' | 'confirmed_new_source';
  editionLabel: string | null;
  publication: EditionPublication;
};

export type ContentEquivalenceAuthority =
  | { state: 'same_bytes'; authority: 'database_derived' }
  | { state: 'reviewed_equivalent'; authority: 'human_decision' }
  | { state: 'unreviewed_different_bytes'; authority: 'database_derived' };

export type RepresentationProposal = {
  proposalReference: string;
  artifactSelection: 'database_derived';
  editionSelection: 'preauthorized';
  role: ArtifactRepresentationRole;
  isPrimary: boolean;
  contentEquivalence: ContentEquivalenceAuthority;
};

export const SOURCE_RELATIONSHIP_AUTHORITY_TYPES = [
  'cites', 'attributes_to', 'embeds_summary_of', 'derived_from', 'revises', 'supersedes',
] as const satisfies readonly SourceRelationshipType[];

export type UpstreamAttributionProposal = {
  proposalReference: string;
  containingEditionSelection: 'preauthorized';
  relationshipType: SourceRelationshipType;
  upstreamSourceSelection: 'preauthorized';
  upstreamEditionSelection: 'preauthorized' | 'unidentified';
  explicitAttributionEvidence: boolean;
  /** Attribution never supplies independence authority. */
  independenceAuthority: 'not_established';
};

export const AUTHORITY_DECISION_ACTIONS = ['confirm', 'reject', 'mark_ambiguous', 'reverse'] as const;
export type AuthorityDecisionAction = (typeof AUTHORITY_DECISION_ACTIONS)[number];

export type AuthorityDecision = {
  decisionNumber: number;
  commandReference: string;
  canonicalRequestSemantics: string;
  action: AuthorityDecisionAction;
};

export type ReviewedAuthorityHistory<TProposal> = {
  proposal: TProposal | null;
  decisions: readonly AuthorityDecision[];
};

export type AuthorityDecisionCommand = {
  commandReference: string;
  canonicalRequestSemantics: string;
  expectedDecisionNumber: number;
  action: AuthorityDecisionAction;
};

export type AuthorityDecisionResult =
  | { disposition: 'applied'; state: ReviewedAuthorityState; decisionNumber: number }
  | { disposition: 'replayed'; state: ReviewedAuthorityState; decisionNumber: number }
  | { disposition: 'command_semantics_conflict'; state: ReviewedAuthorityState; decisionNumber: number }
  | { disposition: 'revision_conflict'; state: ReviewedAuthorityState; decisionNumber: number }
  | { disposition: 'invalid_transition'; state: ReviewedAuthorityState; decisionNumber: number };

export function deriveReviewedAuthorityState<T>(history: ReviewedAuthorityHistory<T>): ReviewedAuthorityState {
  if (!history.proposal) return 'unresolved';
  const last = history.decisions.at(-1);
  if (!last) return 'proposed';
  if (last.action === 'confirm') return 'confirmed';
  if (last.action === 'reject') return 'rejected';
  if (last.action === 'mark_ambiguous') return 'ambiguous';
  return 'reversed';
}

export function evaluateAuthorityDecision<T>(
  history: ReviewedAuthorityHistory<T>,
  command: AuthorityDecisionCommand,
): AuthorityDecisionResult {
  const state = deriveReviewedAuthorityState(history);
  const currentNumber = history.decisions.at(-1)?.decisionNumber ?? 0;
  const priorCommand = history.decisions.find(item => item.commandReference === command.commandReference);
  if (priorCommand) {
    return priorCommand.canonicalRequestSemantics === command.canonicalRequestSemantics
      && priorCommand.action === command.action
      ? { disposition: 'replayed', state, decisionNumber: currentNumber }
      : { disposition: 'command_semantics_conflict', state, decisionNumber: currentNumber };
  }
  if (command.expectedDecisionNumber !== currentNumber) {
    return { disposition: 'revision_conflict', state, decisionNumber: currentNumber };
  }
  const validInitial = state === 'proposed' && ['confirm', 'reject', 'mark_ambiguous'].includes(command.action);
  const validReversal = state === 'confirmed' && command.action === 'reverse';
  if (!validInitial && !validReversal) {
    return { disposition: 'invalid_transition', state, decisionNumber: currentNumber };
  }
  const nextState: ReviewedAuthorityState = command.action === 'confirm' ? 'confirmed'
    : command.action === 'reject' ? 'rejected'
      : command.action === 'mark_ambiguous' ? 'ambiguous' : 'reversed';
  return { disposition: 'applied', state: nextState, decisionNumber: currentNumber + 1 };
}

export function validateEditionProposal(proposal: SourceEditionProposal):
  'valid' | 'publication_authority_invalid' | 'publication_value_invalid' {
  const publication = proposal.publication;
  if (publication.authority === 'filename_inferred' || publication.authority === 'acquisition_inferred') {
    return 'publication_authority_invalid';
  }
  if (publication.precision === 'unknown') return 'valid';
  if (!Number.isInteger(publication.year) || publication.year < 1800 || publication.year > 2200) {
    return 'publication_value_invalid';
  }
  if (publication.precision === 'year') return publication.month === null && publication.day === null ? 'valid' : 'publication_value_invalid';
  if (publication.month === null || !Number.isInteger(publication.month)
    || publication.month < 1 || publication.month > 12) return 'publication_value_invalid';
  if (publication.precision === 'month') return publication.day === null ? 'valid' : 'publication_value_invalid';
  if (publication.day === null || !Number.isInteger(publication.day)) return 'publication_value_invalid';
  const date = new Date(Date.UTC(publication.year, publication.month - 1, publication.day));
  return date.getUTCFullYear() === publication.year && date.getUTCMonth() === publication.month - 1
    && date.getUTCDate() === publication.day ? 'valid' : 'publication_value_invalid';
}

export function validateRepresentationProposal(proposal: RepresentationProposal):
  'valid' | 'primary_flag_invalid' | 'content_equivalence_unresolved' {
  if (proposal.isPrimary && proposal.role !== 'primary') return 'primary_flag_invalid';
  if (proposal.contentEquivalence.state === 'unreviewed_different_bytes') return 'content_equivalence_unresolved';
  return 'valid';
}

export function validateUpstreamAttribution(proposal: UpstreamAttributionProposal):
  'valid' | 'explicit_attribution_required' | 'independence_authority_forbidden' {
  if (proposal.independenceAuthority !== 'not_established') return 'independence_authority_forbidden';
  return proposal.explicitAttributionEvidence ? 'valid' : 'explicit_attribution_required';
}

export const PROVENANCE_READINESS_STATES = [
  'artifact_not_bridgeable', 'artifact_unestablished', 'artifact_established',
  'acquisition_established', 'source_unresolved', 'source_ambiguous', 'edition_unresolved',
  'edition_ambiguous', 'representation_unresolved', 'representation_ambiguous',
  'upstream_attribution_unresolved', 'upstream_attribution_ambiguous', 'provenance_ready',
] as const;
export type ProvenanceReadinessState = (typeof PROVENANCE_READINESS_STATES)[number];

export type ProvenanceAuthorityFacts = {
  artifactBridgeable: boolean;
  artifactEstablished: boolean;
  acquisitionEstablished: boolean;
  sourceResolutionInitiated: boolean;
  sourceAuthority: ReviewedAuthorityState;
  editionResolutionInitiated: boolean;
  editionAuthority: ReviewedAuthorityState;
  representationResolutionInitiated: boolean;
  representationAuthorities: readonly ReviewedAuthorityState[];
  containingSourceEstablished: boolean;
  upstreamAttributionRequired: boolean;
  upstreamAttributionResolutionInitiated: boolean;
  upstreamAttributionAuthorities: readonly ReviewedAuthorityState[];
};

export function deriveProvenanceReadiness(facts: ProvenanceAuthorityFacts): ProvenanceReadinessState {
  if (!facts.artifactBridgeable) return 'artifact_not_bridgeable';
  if (!facts.artifactEstablished) return 'artifact_unestablished';
  if (!facts.acquisitionEstablished) return 'artifact_established';
  if (!facts.sourceResolutionInitiated) return 'acquisition_established';
  if (facts.sourceAuthority === 'ambiguous') return 'source_ambiguous';
  if (facts.sourceAuthority !== 'confirmed' || !facts.containingSourceEstablished) return 'source_unresolved';
  if (!facts.editionResolutionInitiated) return 'edition_unresolved';
  if (facts.editionAuthority === 'ambiguous') return 'edition_ambiguous';
  if (facts.editionAuthority !== 'confirmed') return 'edition_unresolved';
  if (!facts.representationResolutionInitiated) return 'representation_unresolved';
  const representations = facts.representationAuthorities.filter(value => value === 'confirmed');
  if (facts.representationAuthorities.includes('ambiguous') || representations.length > 1) return 'representation_ambiguous';
  if (representations.length !== 1) return 'representation_unresolved';
  if (facts.upstreamAttributionRequired) {
    if (!facts.upstreamAttributionResolutionInitiated) return 'upstream_attribution_unresolved';
    const attributions = facts.upstreamAttributionAuthorities.filter(value => value === 'confirmed');
    if (facts.upstreamAttributionAuthorities.includes('ambiguous') || attributions.length > 1) return 'upstream_attribution_ambiguous';
    if (attributions.length !== 1) return 'upstream_attribution_unresolved';
  }
  return 'provenance_ready';
}

export type ProvenanceBridgeReadModel = {
  readiness: ProvenanceReadinessState;
  promotionSourceRequirementsSatisfied: boolean;
};

export function projectProvenanceBridge(facts: ProvenanceAuthorityFacts): ProvenanceBridgeReadModel {
  const readiness = deriveProvenanceReadiness(facts);
  return { readiness, promotionSourceRequirementsSatisfied: readiness === 'provenance_ready' };
}

export const AUTHORITY_FIELD_CLASSIFICATIONS = [
  'database_derived', 'server_derived', 'preauthorized_selectable_identity',
  'human_proposal', 'human_decision', 'forbidden_caller_authority',
] as const;
export type AuthorityFieldClassification = (typeof AUTHORITY_FIELD_CLASSIFICATIONS)[number];

export const PROVENANCE_BRIDGE_FIELD_AUTHORITY = {
  opportunityArtifactEligibility: 'database_derived',
  opportunityOwnership: 'database_derived',
  artifactDigest: 'database_derived',
  artifactByteSize: 'database_derived',
  detectedMediaType: 'database_derived',
  acquisitionHistory: 'database_derived',
  authenticatedActor: 'server_derived',
  canonicalRequestSemantics: 'server_derived',
  authorizedPublisherSelection: 'preauthorized_selectable_identity',
  authorizedSourceSelection: 'preauthorized_selectable_identity',
  authorizedEditionSelection: 'preauthorized_selectable_identity',
  proposedSourceMetadata: 'human_proposal',
  proposedEditionMetadata: 'human_proposal',
  proposedRepresentationRole: 'human_proposal',
  proposedUpstreamAttribution: 'human_proposal',
  representationDecision: 'human_decision',
  upstreamAttributionDecision: 'human_decision',
  arbitraryPublisherIdentity: 'forbidden_caller_authority',
  arbitrarySourceIdentity: 'forbidden_caller_authority',
  arbitraryEditionIdentity: 'forbidden_caller_authority',
  arbitraryUpstreamIdentity: 'forbidden_caller_authority',
  publicationDateFromAcquisition: 'forbidden_caller_authority',
  independenceClassification: 'forbidden_caller_authority',
} as const satisfies Record<string, AuthorityFieldClassification>;

export type BridgeCallerAuthorityAttempt = {
  arbitrarySourceIdentity?: boolean;
  arbitraryEditionIdentity?: boolean;
  arbitraryUpstreamSourceIdentity?: boolean;
  suppliedDigest?: boolean;
  suppliedAcquisitionIdentity?: boolean;
};

export function evaluateCallerAuthority(attempt: BridgeCallerAuthorityAttempt):
  'allowed_intent_only' | 'forbidden_caller_authority' {
  return Object.values(attempt).some(Boolean) ? 'forbidden_caller_authority' : 'allowed_intent_only';
}

/** Semantic inputs for future canonical request digests; transport fields are excluded. */
export type CanonicalBridgeRequestSemantics =
  | { operation: 'establish_byte_bridge'; legacyArtifactReference: string; contractVersion: typeof PROPERTY_INTELLIGENCE_PROVENANCE_BRIDGE_CONTRACT_VERSION }
  | { operation: 'decide_representation'; proposalReference: string; expectedDecisionNumber: number; action: AuthorityDecisionAction; contractVersion: typeof PROPERTY_INTELLIGENCE_PROVENANCE_BRIDGE_CONTRACT_VERSION }
  | { operation: 'decide_upstream_attribution'; proposalReference: string; expectedDecisionNumber: number; action: AuthorityDecisionAction; contractVersion: typeof PROPERTY_INTELLIGENCE_PROVENANCE_BRIDGE_CONTRACT_VERSION };

/** Command UUID, actor, timestamps, HTTP details, and serialization formatting are not digest semantics. */
export const CANONICAL_BRIDGE_REQUEST_EXCLUSIONS = [
  'command_uuid', 'actor', 'request_timestamp', 'http_headers', 'transport_encoding',
  'client_filename', 'storage_path', 'signed_url',
] as const;
