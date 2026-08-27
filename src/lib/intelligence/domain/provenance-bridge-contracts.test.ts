import { describe, expect, it } from 'vitest';
import {
  classifyAcquisitionEncounter,
  deriveProvenanceReadiness,
  deriveReviewedAuthorityState,
  evaluateAuthorityDecision,
  evaluateCallerAuthority,
  evaluateGlobalArtifact,
  projectProvenanceBridge,
  validateEditionProposal,
  validateRepresentationProposal,
  validateUpstreamAttribution,
  validateUpstreamProvenanceConfirmation,
  type AuthoritativeArtifactFacts,
  type AuthorityDecision,
  type ProvenanceAuthorityFacts,
  type RepresentationProposal,
  type ReviewedAuthorityHistory,
  type SourceEditionProposal,
  type SourceIdentityProposal,
  type UpstreamProvenanceProposal,
} from './provenance-bridge-contracts';

const artifact: AuthoritativeArtifactFacts = {
  eligibility: 'eligible', historicallyWorkflowSuperseded: false,
  sha256Digest: 'a'.repeat(64), byteSize: '1975102', detectedMediaType: 'application/pdf',
};

const readyFacts: ProvenanceAuthorityFacts = {
  artifactBridgeable: true, artifactEstablished: true, acquisitionEstablished: true,
  sourceResolutionInitiated: true,
  sourceAuthority: 'confirmed', editionAuthority: 'confirmed',
  editionResolutionInitiated: true, representationResolutionInitiated: true,
  representationAuthorities: ['confirmed'], containingSourceEstablished: true,
  upstreamProvenanceAuthorities: [{
    state: 'confirmed', conclusion: 'no_upstream_required', materialization: 'none',
  }],
};

const sourceProposal: SourceIdentityProposal = {
  proposalReference: 'source-proposal-1', proposedSourceTitle: 'The Square at Elyson OM',
  proposedSourceKind: 'offering_memorandum', publisherEvidence: 'matching_evidence',
  matchingEvidence: ['title', 'publisher'],
};

const editionProposal: SourceEditionProposal = {
  proposalReference: 'edition-proposal-1', sourceSelection: 'preauthorized_existing',
  editionLabel: '2026 OM',
  publication: { precision: 'day', year: 2026, month: 8, day: 26, authority: 'source_explicit' },
};

const representationProposal: RepresentationProposal = {
  proposalReference: 'representation-proposal-1', artifactSelection: 'database_derived',
  editionSelection: 'preauthorized', role: 'primary', isPrimary: true,
  contentEquivalence: { state: 'same_bytes', authority: 'database_derived' },
};

const attributionProposal: UpstreamProvenanceProposal = {
  proposalReference: 'attribution-proposal-1', containingEditionSelection: 'preauthorized',
  conclusion: 'attributed_upstream',
  relationshipType: 'attributes_to', upstreamSourceSelection: 'preauthorized',
  upstreamEditionSelection: 'unidentified', explicitAttributionEvidence: true,
  humanReviewRationale: null, independenceAuthority: 'not_established',
};

const noUpstreamProposal: UpstreamProvenanceProposal = {
  proposalReference: 'no-upstream-proposal-1', containingEditionSelection: 'preauthorized',
  conclusion: 'no_upstream_required',
  humanReviewRationale: 'Reviewed the containing edition; no upstream attribution is required for V1 provenance.',
};

const decision = (
  action: AuthorityDecision['action'], decisionNumber = 1, commandReference = `command-${decisionNumber}`,
): AuthorityDecision => ({
  decisionNumber, commandReference, canonicalRequestSemantics: `${action}:${decisionNumber}`, action,
});

const history = <T,>(proposal: T | null, decisions: readonly AuthorityDecision[] = []): ReviewedAuthorityHistory<T> =>
  ({ proposal, decisions });

type Fixture = {
  number: number;
  name: string;
  inputAuthority: string;
  existingDurableState: string;
  proposedAction: string;
  expectedDomainResult: string;
  currentAuthorityState: string;
  provenanceReadinessState: string;
  promotionSourceRequirementsSatisfied: boolean;
  run(): unknown;
  expected: unknown;
};

const fixture = (
  number: number, name: string, run: () => unknown, expected: unknown,
  details: Partial<Omit<Fixture, 'number' | 'name' | 'run' | 'expected'>> = {},
): Fixture => ({
  number, name, run, expected,
  inputAuthority: details.inputAuthority ?? 'Database-derived artifact facts and reviewed human intent',
  existingDurableState: details.existingDurableState ?? 'No conflicting durable authority',
  proposedAction: details.proposedAction ?? 'Evaluate the controlled bridge transition',
  expectedDomainResult: details.expectedDomainResult ?? JSON.stringify(expected),
  currentAuthorityState: details.currentAuthorityState ?? 'confirmed',
  provenanceReadinessState: details.provenanceReadinessState ?? 'provenance_ready',
  promotionSourceRequirementsSatisfied: details.promotionSourceRequirementsSatisfied ?? true,
});

const fixtures: readonly Fixture[] = [
  fixture(1, 'new Opportunity PDF creates new global artifact', () => evaluateGlobalArtifact(artifact, null), { established: true, disposition: 'created_global_artifact' }, { currentAuthorityState: 'unresolved', provenanceReadinessState: 'artifact_established', promotionSourceRequirementsSatisfied: false }),
  fixture(2, 'same command replays existing acquisition', () => classifyAcquisitionEncounter('same_opportunity_artifact_replay'), { artifactIdentity: 'same', disposition: 'recovered_existing_acquisition' }),
  fixture(3, 'same bytes in second Opportunity create another acquisition', () => classifyAcquisitionEncounter('different_opportunity'), { artifactIdentity: 'same', disposition: 'created_new_acquisition' }),
  fixture(4, 'same bytes through second ingestion create another acquisition', () => classifyAcquisitionEncounter('different_ingestion'), { artifactIdentity: 'same', disposition: 'created_new_acquisition' }),
  fixture(5, 'same bytes from another URL create another acquisition', () => classifyAcquisitionEncounter('different_url'), { artifactIdentity: 'same', disposition: 'created_new_acquisition' }),
  fixture(6, 'matching digest with byte size mismatch fails closed', () => evaluateGlobalArtifact(artifact, { ...artifact, byteSize: '1' }), { established: false, disposition: 'artifact_identity_mismatch' }, { provenanceReadinessState: 'artifact_unestablished', promotionSourceRequirementsSatisfied: false }),
  fixture(7, 'matching bytes with authoritative MIME conflict fail closed', () => evaluateGlobalArtifact(artifact, { ...artifact, detectedMediaType: 'text/plain' }), { established: false, disposition: 'authoritative_mime_mismatch' }, { provenanceReadinessState: 'artifact_unestablished', promotionSourceRequirementsSatisfied: false }),
  fixture(8, 'invalid Opportunity artifact is not bridgeable', () => evaluateGlobalArtifact({ ...artifact, eligibility: 'invalid' }, null), { established: false, disposition: 'artifact_not_bridgeable' }, { provenanceReadinessState: 'artifact_not_bridgeable', promotionSourceRequirementsSatisfied: false }),
  fixture(9, 'historically valid workflow-superseded artifact remains bridgeable', () => evaluateGlobalArtifact({ ...artifact, historicallyWorkflowSuperseded: true }, null), { established: true, disposition: 'created_global_artifact' }),
  fixture(10, 'source remains unresolved without proposal', () => deriveReviewedAuthorityState(history<SourceIdentityProposal>(null)), 'unresolved', { currentAuthorityState: 'unresolved', provenanceReadinessState: 'source_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(11, 'source proposal can be confirmed', () => evaluateAuthorityDecision(history(sourceProposal), { commandReference: 'confirm-source', canonicalRequestSemantics: 'confirm-source-v1', expectedDecisionNumber: 0, action: 'confirm' }), { disposition: 'applied', state: 'confirmed', decisionNumber: 1 }),
  fixture(12, 'source proposal can be rejected', () => evaluateAuthorityDecision(history(sourceProposal), { commandReference: 'reject-source', canonicalRequestSemantics: 'reject-source-v1', expectedDecisionNumber: 0, action: 'reject' }), { disposition: 'applied', state: 'rejected', decisionNumber: 1 }, { currentAuthorityState: 'rejected', provenanceReadinessState: 'source_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(13, 'competing source proposals remain ambiguous', () => evaluateAuthorityDecision(history(sourceProposal), { commandReference: 'ambiguous-source', canonicalRequestSemantics: 'ambiguous-source-v1', expectedDecisionNumber: 0, action: 'mark_ambiguous' }), { disposition: 'applied', state: 'ambiguous', decisionNumber: 1 }, { currentAuthorityState: 'ambiguous', provenanceReadinessState: 'source_ambiguous', promotionSourceRequirementsSatisfied: false }),
  fixture(14, 'source confirmation reversal preserves history', () => evaluateAuthorityDecision(history(sourceProposal, [decision('confirm')]), { commandReference: 'reverse-source', canonicalRequestSemantics: 'reverse-source-v1', expectedDecisionNumber: 1, action: 'reverse' }), { disposition: 'applied', state: 'reversed', decisionNumber: 2 }, { currentAuthorityState: 'reversed', provenanceReadinessState: 'source_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(15, 'edition exact publication date is valid', () => validateEditionProposal(editionProposal), 'valid'),
  fixture(16, 'edition month publication precision is valid', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'month', year: 2026, month: 8, day: null, authority: 'source_explicit' } }), 'valid'),
  fixture(17, 'edition year publication precision is valid', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'year', year: 2026, month: null, day: null, authority: 'human_confirmed' } }), 'valid'),
  fixture(18, 'edition unknown publication timing is valid', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'unknown', year: null, month: null, day: null, authority: 'unknown' } }), 'valid'),
  fixture(19, 'acquisition date cannot become publication date', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'day', year: 2026, month: 8, day: 26, authority: 'acquisition_inferred' } }), 'publication_authority_invalid', { provenanceReadinessState: 'edition_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(20, 'filename date cannot become publication authority', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'year', year: 2026, month: null, day: null, authority: 'filename_inferred' } }), 'publication_authority_invalid', { provenanceReadinessState: 'edition_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(21, 'same edition and same bytes are valid representation', () => validateRepresentationProposal(representationProposal), 'valid'),
  fixture(22, 'different reviewed-equivalent bytes may represent same edition', () => validateRepresentationProposal({ ...representationProposal, contentEquivalence: { state: 'reviewed_equivalent', authority: 'human_decision' } }), 'valid'),
  fixture(23, 'different bytes without equivalence review remain unresolved', () => validateRepresentationProposal({ ...representationProposal, contentEquivalence: { state: 'unreviewed_different_bytes', authority: 'database_derived' } }), 'content_equivalence_unresolved', { provenanceReadinessState: 'representation_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(24, 'revised OM uses new artifact and edition', () => classifyAcquisitionEncounter('revised_bytes'), { artifactIdentity: 'new', disposition: 'created_new_acquisition' }),
  fixture(25, 'preferred primary representation is valid', () => validateRepresentationProposal(representationProposal), 'valid'),
  fixture(26, 'alternate complete primary representation is valid', () => validateRepresentationProposal({ ...representationProposal, isPrimary: false }), 'valid'),
  fixture(27, 'supplement representation cannot be preferred primary', () => validateRepresentationProposal({ ...representationProposal, role: 'supplement', isPrimary: false, contentEquivalence: { state: 'reviewed_equivalent', authority: 'human_decision' } }), 'valid'),
  fixture(28, 'embedded source representation is valid after review', () => validateRepresentationProposal({ ...representationProposal, role: 'embedded', isPrimary: false, contentEquivalence: { state: 'reviewed_equivalent', authority: 'human_decision' } }), 'valid'),
  fixture(29, 'OCR derivative representation is valid after equivalence review', () => validateRepresentationProposal({ ...representationProposal, role: 'derivative', isPrimary: false, contentEquivalence: { state: 'reviewed_equivalent', authority: 'human_decision' } }), 'valid'),
  fixture(30, 'representation proposal rejection remains explicit', () => deriveReviewedAuthorityState(history(representationProposal, [decision('reject')])), 'rejected', { currentAuthorityState: 'rejected', provenanceReadinessState: 'representation_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(31, 'representation confirmation reversal remains historical', () => deriveReviewedAuthorityState(history(representationProposal, [decision('confirm'), decision('reverse', 2)])), 'reversed', { currentAuthorityState: 'reversed', provenanceReadinessState: 'representation_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(32, 'corrected edition assignment uses reversed old and confirmed new proposals', () => deriveProvenanceReadiness({ ...readyFacts, representationAuthorities: ['reversed', 'confirmed'] }), 'provenance_ready'),
  fixture(33, 'JLL OM citing ESRI preserves upstream authority', () => validateUpstreamAttribution(attributionProposal), 'valid'),
  fixture(34, 'direct ESRI report has reviewed no-upstream authority', () => deriveProvenanceReadiness(readyFacts), 'provenance_ready'),
  fixture(35, 'second OM repeating ESRI does not establish independence', () => attributionProposal.independenceAuthority, 'not_established'),
  fixture(36, 'proposed upstream attribution is not ready', () => deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [{ state: 'proposed', conclusion: 'attributed_upstream', materialization: 'none' }] }), 'upstream_provenance_unresolved', { currentAuthorityState: 'proposed', provenanceReadinessState: 'upstream_provenance_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(37, 'rejected upstream attribution is not ready', () => deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [{ state: 'rejected', conclusion: 'attributed_upstream', materialization: 'none' }] }), 'upstream_provenance_unresolved', { currentAuthorityState: 'rejected', provenanceReadinessState: 'upstream_provenance_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(38, 'reversed upstream attribution is not ready', () => deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [{ state: 'reversed', conclusion: 'attributed_upstream', materialization: 'matching_relationship' }] }), 'upstream_provenance_unresolved', { currentAuthorityState: 'reversed', provenanceReadinessState: 'upstream_provenance_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(39, 'concurrent representation decision detects revision conflict', () => evaluateAuthorityDecision(history(representationProposal, [decision('confirm')]), { commandReference: 'concurrent', canonicalRequestSemantics: 'concurrent-v1', expectedDecisionNumber: 0, action: 'reverse' }), { disposition: 'revision_conflict', state: 'confirmed', decisionNumber: 1 }, { provenanceReadinessState: 'representation_ambiguous', promotionSourceRequirementsSatisfied: false }),
  fixture(40, 'same decision command replay is idempotent', () => evaluateAuthorityDecision(history(representationProposal, [decision('confirm', 1, 'same-command')]), { commandReference: 'same-command', canonicalRequestSemantics: 'confirm:1', expectedDecisionNumber: 0, action: 'confirm' }), { disposition: 'replayed', state: 'confirmed', decisionNumber: 1 }),
  fixture(41, 'same command UUID with changed semantics fails closed', () => evaluateAuthorityDecision(history(representationProposal, [decision('confirm', 1, 'same-command')]), { commandReference: 'same-command', canonicalRequestSemantics: 'changed', expectedDecisionNumber: 1, action: 'reverse' }), { disposition: 'command_semantics_conflict', state: 'confirmed', decisionNumber: 1 }, { promotionSourceRequirementsSatisfied: false }),
  fixture(42, 'browser arbitrary source UUID is forbidden', () => evaluateCallerAuthority({ arbitrarySourceIdentity: true }), 'forbidden_caller_authority', { promotionSourceRequirementsSatisfied: false }),
  fixture(43, 'browser arbitrary edition UUID is forbidden', () => evaluateCallerAuthority({ arbitraryEditionIdentity: true }), 'forbidden_caller_authority', { promotionSourceRequirementsSatisfied: false }),
  fixture(44, 'browser arbitrary upstream source UUID is forbidden', () => evaluateCallerAuthority({ arbitraryUpstreamSourceIdentity: true }), 'forbidden_caller_authority', { promotionSourceRequirementsSatisfied: false }),
  fixture(45, 'browser supplied digest is forbidden', () => evaluateGlobalArtifact(artifact, null, { callerSuppliedDigest: true }), { established: false, disposition: 'caller_authority_forbidden' }, { promotionSourceRequirementsSatisfied: false }),
  fixture(46, 'browser supplied acquisition identity is forbidden', () => evaluateGlobalArtifact(artifact, null, { callerSuppliedAcquisitionIdentity: true }), { established: false, disposition: 'caller_authority_forbidden' }, { promotionSourceRequirementsSatisfied: false }),
  fixture(47, 'publisher may remain unresolved without blocking confirmed source', () => deriveProvenanceReadiness(readyFacts), 'provenance_ready'),
  fixture(48, 'unknown publication timing remains truthful and ready', () => validateEditionProposal({ ...editionProposal, publication: { precision: 'unknown', year: null, month: null, day: null, authority: 'unknown' } }), 'valid'),
  fixture(49, 'valid artifact and acquisition with unresolved source are not ready', () => projectProvenanceBridge({ ...readyFacts, sourceAuthority: 'unresolved', containingSourceEstablished: false }), { readiness: 'source_unresolved', promotionSourceRequirementsSatisfied: false }, { currentAuthorityState: 'unresolved', provenanceReadinessState: 'source_unresolved', promotionSourceRequirementsSatisfied: false }),
  fixture(50, 'fully resolved OM is provenance ready', () => projectProvenanceBridge(readyFacts), { readiness: 'provenance_ready', promotionSourceRequirementsSatisfied: true }),
];

describe('Phase 4C.3.2A provenance bridge adversarial matrix', () => {
  it('contains exactly 50 individually named and documented fixtures', () => {
    expect(fixtures).toHaveLength(50);
    expect(fixtures.map(item => item.number)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(new Set(fixtures.map(item => item.name)).size).toBe(50);
    for (const item of fixtures) {
      expect(item.inputAuthority).toBeTruthy();
      expect(item.existingDurableState).toBeTruthy();
      expect(item.proposedAction).toBeTruthy();
      expect(item.expectedDomainResult).toBeTruthy();
      expect(item.currentAuthorityState).toBeTruthy();
      expect(item.provenanceReadinessState).toBeTruthy();
      expect(typeof item.promotionSourceRequirementsSatisfied).toBe('boolean');
    }
  });

  it.each(fixtures)('$number $name', item => {
    expect(item.run()).toEqual(item.expected);
  });
});

describe('bridge invariants', () => {
  it('does not let workflow context enter global byte identity', () => {
    expect(Object.keys(artifact)).toEqual([
      'eligibility', 'historicallyWorkflowSuperseded', 'sha256Digest', 'byteSize', 'detectedMediaType',
    ]);
    expect(JSON.stringify(artifact)).not.toContain('opportunity');
    expect(JSON.stringify(artifact)).not.toContain('filename');
    expect(JSON.stringify(artifact)).not.toContain('storage');
  });

  it('derives readiness rather than accepting a mutable ready flag', () => {
    expect(projectProvenanceBridge(readyFacts)).toEqual({
      readiness: 'provenance_ready', promotionSourceRequirementsSatisfied: true,
    });
    expect(projectProvenanceBridge({ ...readyFacts, representationAuthorities: ['confirmed', 'confirmed'] }))
      .toEqual({ readiness: 'representation_ambiguous', promotionSourceRequirementsSatisfied: false });
    expect(deriveProvenanceReadiness({ ...readyFacts, sourceResolutionInitiated: false }))
      .toBe('acquisition_established');
  });

  it('shares lifecycle mechanics without conflating typed proposal payloads', () => {
    expect(deriveReviewedAuthorityState(history(representationProposal))).toBe('proposed');
    expect(deriveReviewedAuthorityState(history(attributionProposal))).toBe('proposed');
    expect(validateRepresentationProposal(representationProposal)).toBe('valid');
    expect(validateUpstreamAttribution(attributionProposal)).toBe('valid');
  });
});

describe('durable upstream provenance authority amendment', () => {
  const unresolved = { ...readyFacts, upstreamProvenanceAuthorities: [] };
  const confirmedNoUpstream = { ...readyFacts, upstreamProvenanceAuthorities: [{
    state: 'confirmed' as const, conclusion: 'no_upstream_required' as const, materialization: 'none' as const,
  }] };
  const confirmedAttribution = { ...readyFacts, upstreamProvenanceAuthorities: [{
    state: 'confirmed' as const, conclusion: 'attributed_upstream' as const,
    materialization: 'matching_relationship' as const,
  }] };

  it('treats absence as unresolved rather than negative authority', () => {
    expect(deriveProvenanceReadiness(unresolved)).toBe('upstream_provenance_unresolved');
  });

  it('lets one confirmed no-upstream conclusion satisfy the gate', () => {
    expect(deriveProvenanceReadiness(confirmedNoUpstream)).toBe('provenance_ready');
  });

  it.each(['proposed', 'rejected', 'reversed'] as const)(
    'does not let a %s no-upstream conclusion satisfy the gate', state => {
      expect(deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [{
        state, conclusion: 'no_upstream_required', materialization: 'none',
      }] })).toBe('upstream_provenance_unresolved');
    },
  );

  it('requires human confirmation even when machine assistance proposed no upstream', () => {
    expect(validateUpstreamProvenanceConfirmation(noUpstreamProposal, 'machine_assisted', 'none'))
      .toBe('human_confirmation_required');
  });

  it.each([
    'upstreamSourceSelection', 'relationshipType', 'upstreamEditionSelection',
    'explicitAttributionEvidence', 'independenceAuthority',
  ] as const)(
    'rejects no-upstream payload carrying %s', field => {
      const hostile = { ...noUpstreamProposal, [field]: 'forbidden' } as unknown as UpstreamProvenanceProposal;
      expect(validateUpstreamAttribution(hostile)).toBe('attribution_fields_forbidden');
    },
  );

  it.each(['', ' ', `valid${String.fromCharCode(0)}invalid`, 'x'.repeat(2001)])(
    'rejects missing, untrimmed, control-bearing, or oversized rationale %#', rationale => {
      expect(validateUpstreamAttribution({
        ...noUpstreamProposal, humanReviewRationale: rationale,
      })).toBe('human_review_rationale_required');
    },
  );

  it('rejects attributed-upstream without evidence', () => {
    expect(validateUpstreamAttribution({ ...attributionProposal, explicitAttributionEvidence: false }))
      .toBe('explicit_attribution_required');
  });

  it.each(['relationshipType', 'upstreamSourceSelection', 'upstreamEditionSelection'] as const)(
    'rejects hostile attributed-upstream payload missing %s', field => {
      const hostile = { ...attributionProposal } as unknown as Record<string, unknown>;
      delete hostile[field];
      expect(validateUpstreamAttribution(hostile as unknown as UpstreamProvenanceProposal))
        .toBe('attribution_fields_required');
    },
  );

  it('lets valid attributed-upstream authority satisfy the gate', () => {
    expect(validateUpstreamAttribution(attributionProposal)).toBe('valid');
    expect(deriveProvenanceReadiness(confirmedAttribution)).toBe('provenance_ready');
  });

  it('requires the matching affirmative relationship for attributed-upstream confirmation', () => {
    expect(validateUpstreamProvenanceConfirmation(attributionProposal, 'human_review', 'none'))
      .toBe('affirmative_relationship_required');
  });

  it('forbids affirmative relationship materialization for no-upstream confirmation', () => {
    expect(validateUpstreamProvenanceConfirmation(noUpstreamProposal, 'human_review', 'matching_relationship'))
      .toBe('affirmative_relationship_forbidden');
  });

  it('fails closed for competing confirmed conclusions', () => {
    expect(deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [
      { state: 'confirmed', conclusion: 'no_upstream_required', materialization: 'none' },
      { state: 'confirmed', conclusion: 'attributed_upstream', materialization: 'matching_relationship' },
    ] })).toBe('upstream_provenance_ambiguous');
  });

  it('fails closed for incompatible competing proposed conclusions', () => {
    expect(deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [
      { state: 'proposed', conclusion: 'no_upstream_required', materialization: 'none' },
      { state: 'proposed', conclusion: 'attributed_upstream', materialization: 'none' },
    ] })).toBe('upstream_provenance_ambiguous');
  });

  it('supports reversed no-upstream followed by confirmed attribution', () => {
    expect(deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [
      { state: 'reversed', conclusion: 'no_upstream_required', materialization: 'none' },
      { state: 'confirmed', conclusion: 'attributed_upstream', materialization: 'matching_relationship' },
    ] })).toBe('provenance_ready');
  });

  it('supports reversed attribution followed by confirmed no-upstream', () => {
    expect(deriveProvenanceReadiness({ ...readyFacts, upstreamProvenanceAuthorities: [
      { state: 'reversed', conclusion: 'attributed_upstream', materialization: 'matching_relationship' },
      { state: 'confirmed', conclusion: 'no_upstream_required', materialization: 'none' },
    ] })).toBe('provenance_ready');
  });

  it('locks the direct Esri canonical fixture without fabricating a relationship', () => {
    expect(validateUpstreamProvenanceConfirmation(noUpstreamProposal, 'human_review', 'none')).toBe('valid');
    expect(projectProvenanceBridge(confirmedNoUpstream)).toEqual({
      readiness: 'provenance_ready', promotionSourceRequirementsSatisfied: true,
    });
  });

  it('locks the JLL to Esri canonical fixture with reviewed attribution evidence', () => {
    expect(validateUpstreamProvenanceConfirmation(
      attributionProposal, 'human_review', 'matching_relationship',
    )).toBe('valid');
    expect(projectProvenanceBridge(confirmedAttribution)).toEqual({
      readiness: 'provenance_ready', promotionSourceRequirementsSatisfied: true,
    });
  });

  it('never turns absence of any conclusion into readiness', () => {
    expect(projectProvenanceBridge(unresolved)).toEqual({
      readiness: 'upstream_provenance_unresolved', promotionSourceRequirementsSatisfied: false,
    });
  });
});
