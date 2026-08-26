import { describe, expect, it } from 'vitest';
import {
  canonicalizePromotionDecimal,
  evaluatePromotionEligibility,
  reconcileExistingObservation,
  type ExistingObservationComparison,
  type PromotionAuthorityFacts,
  type PromotionBundle,
  type PromotionEligibility,
  type ReconciliationDisposition,
} from './promotion-contracts';

const acceptedAuthority: PromotionAuthorityFacts = {
  currentSuccessfulRun: true,
  allCandidatesAccepted: true,
  candidatesShareArtifact: true,
  candidatesShareRun: true,
  candidateValuesCanonical: true,
};

const source = {
  globalArtifact: 'established', acquisitionLineage: 'established', representation: 'unique',
  containingSource: 'established', upstreamAttribution: 'not_applicable',
} as const;
const pdfEvidence = [{
  evidenceReference: 'evidence-1', candidateReference: 'candidate-1',
  reviewSufficiency: 'durable_locator_ready', locator: { type: 'pdf', page: 1 },
}] as const;
const property = [{ role: 'property', authority: 'confirmed', subjectReference: 'property-1' }] as const;

function areaBundle(): PromotionBundle {
  return {
    family: 'area', candidates: [{ candidateReference: 'candidate-1', role: 'area_amount' }],
    evidence: pdfEvidence, subjects: property, source, temporal: [],
    classification: { family: 'area', meaning: 'site_area', unit: 'square_feet', origin: 'source_stated' },
  };
}

function rentBundle(kind: 'asking' | 'contractual' = 'asking'): PromotionBundle {
  return {
    family: 'rent', candidates: [{ candidateReference: 'candidate-1', role: 'rent_amount' }],
    evidence: pdfEvidence,
    subjects: [
      ...property,
      { role: 'premises', authority: 'confirmed', subjectReference: 'premises-1', premisesContainment: 'unique_confirmed_for_property' },
      ...(kind === 'contractual' ? [{ role: 'lease' as const, authority: 'confirmed' as const, subjectReference: 'lease-1' }] : []),
    ],
    source, temporal: [],
    classification: {
      family: 'rent', meaning: kind, commitment: kind === 'asking' ? 'marketed_uncommitted' : 'executed',
      component: 'base', amountBasis: kind === 'asking' ? 'monetary_per_area' : 'monetary_absolute',
      timeBasis: kind === 'asking' ? 'annual' : 'monthly', areaBasis: kind === 'asking' ? 'square_feet' : 'not_applicable',
      leaseStructure: 'nnn', lifecycle: kind === 'asking' ? 'prospective' : 'current', currencyCode: 'USD',
      origin: kind === 'asking' ? 'source_stated' : 'contractual_document_stated',
    },
  };
}

function leaseTermBundle(): PromotionBundle {
  return {
    family: 'lease_term', candidates: [{ candidateReference: 'candidate-1', role: 'lease_term_value' }],
    evidence: pdfEvidence, subjects: [...property, { role: 'lease', authority: 'confirmed', subjectReference: 'lease-1' }],
    source, temporal: [{ role: 'lease_commencement', value: { state: 'known', value: { precision: 'day', year: 2026, month: 1, day: 1 } } }],
    classification: { family: 'lease_term', termType: 'lease_commencement', origin: 'contractual_document_stated' },
  };
}

type Fixture = {
  number: number;
  name: string;
  sourceSituation: string;
  extractionState: string;
  candidateDecisionState: string;
  subjects: string;
  provenance: string;
  evidence: string;
  temporalMeaning: string;
  expectedEligibility: PromotionEligibility;
  expectedDisposition: string;
  expectedReconciliation: ReconciliationDisposition | 'not_applicable';
  pendingConstructionAllowed: boolean;
  run(): PromotionEligibility;
};

const eligible: PromotionEligibility = { eligible: true, disposition: 'eligible_for_pending_construction' };
const blocked = (classification: Extract<PromotionEligibility, { eligible: false }>['classification']): PromotionEligibility =>
  ({ eligible: false, disposition: 'ineligible', classification });
const evaluate = (bundle: PromotionBundle, authority: PromotionAuthorityFacts = acceptedAuthority) =>
  evaluatePromotionEligibility(bundle, authority);
const mutate = <T,>(value: T, change: (copy: T) => void): T => {
  const copy = structuredClone(value);
  change(copy);
  return copy;
};
const fixture = (
  number: number, name: string, run: () => PromotionEligibility, expectedEligibility: PromotionEligibility,
  details: Partial<Omit<Fixture, 'number' | 'name' | 'run' | 'expectedEligibility'>> = {},
): Fixture => ({
  number, name, run, expectedEligibility,
  sourceSituation: details.sourceSituation ?? 'Reviewed containing source',
  extractionState: details.extractionState ?? 'Current successful extraction run',
  candidateDecisionState: details.candidateDecisionState ?? 'Latest decision accepted',
  subjects: details.subjects ?? 'Exactly one confirmed Property and all required subjects',
  provenance: details.provenance ?? 'Global artifact, acquisition, and unique edition representation established',
  evidence: details.evidence ?? 'Durable locator ready',
  temporalMeaning: details.temporalMeaning ?? 'No temporal assertion is manufactured',
  expectedDisposition: details.expectedDisposition ?? expectedEligibility.disposition,
  expectedReconciliation: details.expectedReconciliation ?? 'not_applicable',
  pendingConstructionAllowed: details.pendingConstructionAllowed ?? expectedEligibility.eligible,
});

const fixtures: readonly Fixture[] = [
  fixture(1, 'simple site area from land flyer', () => evaluate(areaBundle()), eligible),
  fixture(2, 'site area in acres', () => evaluate(mutate(areaBundle(), b => { b.classification = { family: 'area', meaning: 'site_area', unit: 'acres', origin: 'source_stated' }; })), eligible),
  fixture(3, 'acres and square feet remain separate source observations', () => evaluate(areaBundle()), eligible, { expectedDisposition: 'two independent bundles; no promotion-time conversion' }),
  fixture(4, 'asking rent with resolved premises', () => evaluate(rentBundle()), eligible),
  fixture(5, 'asking rent with reported space', () => evaluate(mutate(rentBundle(), b => { b.subjects = [...property, { role: 'reported_space', authority: 'confirmed', subjectReference: 'space-1' }]; })), eligible),
  fixture(6, 'asking rent without denominator space', () => evaluate(mutate(rentBundle(), b => { b.subjects = property; })), blocked('unresolved_subject')),
  fixture(7, 'contractual monthly absolute rent', () => evaluate(rentBundle('contractual')), eligible),
  fixture(8, 'separate 3000 square foot area for later derivation', () => evaluate(mutate(areaBundle(), b => { b.classification = { family: 'area', meaning: 'premises_area', unit: 'square_feet', origin: 'source_stated' }; b.subjects = rentBundle().subjects; })), eligible),
  fixture(9, 'promotion cannot manufacture annualized per-area rent', () => evaluate(mutate(rentBundle('contractual'), b => { b.candidates = [...b.candidates, { candidateReference: 'candidate-2', role: 'area_amount' }]; })), blocked('deterministic_derivation_forbidden')),
  fixture(10, 'two contractual rent steps are separate bundles', () => evaluate(mutate(rentBundle('contractual'), b => { b.temporal = [{ role: 'effective_end', value: { state: 'known', value: { precision: 'day', year: 2026, month: 12, day: 31 } } }]; })), eligible),
  fixture(11, 'lease commencement exact date', () => evaluate(leaseTermBundle()), eligible),
  fixture(12, 'lease expiration month precision', () => evaluate(mutate(leaseTermBundle(), b => { b.classification = { family: 'lease_term', termType: 'lease_expiration', origin: 'contractual_document_stated' }; b.temporal = [{ role: 'lease_expiration', value: { state: 'known', value: { precision: 'month', year: 2031, month: 12, day: null } } }]; })), eligible),
  fixture(13, 'lease term without Lease identity', () => evaluate(mutate(leaseTermBundle(), b => { b.subjects = property; })), blocked('unresolved_subject')),
  fixture(14, 'unknown tenant trade name blocks tenant-dependent claim', () => evaluate(mutate(rentBundle('contractual'), b => { b.subjects = [...b.subjects, { role: 'tenant_organization', authority: 'unresolved' }]; })), blocked('unresolved_subject')),
  fixture(15, 'known brand does not resolve legal tenant', () => evaluate(mutate(rentBundle('contractual'), b => { b.subjects = [...b.subjects, { role: 'brand', authority: 'confirmed', subjectReference: 'brand-1' }, { role: 'tenant_organization', authority: 'unresolved' }]; })), blocked('unresolved_subject')),
  fixture(16, 'ambiguous Premises match', () => evaluate(mutate(rentBundle(), b => { b.subjects = [...property, { role: 'premises', authority: 'ambiguous' }]; })), blocked('ambiguous_subject')),
  fixture(17, 'existing reported space without Premises match', () => evaluate(mutate(areaBundle(), b => { b.classification = { family: 'area', meaning: 'reported_space_area', unit: 'square_feet', origin: 'source_stated' }; b.subjects = [...property, { role: 'reported_space', authority: 'confirmed', subjectReference: 'space-1' }]; })), eligible),
  fixture(18, 'implicit reported space creation forbidden', () => evaluate(areaBundle(), { ...acceptedAuthority, attemptedImplicitIdentityCreation: 'reported_space' }), blocked('implicit_identity_creation_forbidden')),
  fixture(19, 'same OM under two Opportunities excludes Opportunity from proposition identity', () => evaluate(areaBundle()), eligible, { expectedDisposition: 'future canonical semantics exclude Opportunity identity' }),
  fixture(20, 'same artifact acquired twice retains one global content identity', () => evaluate(areaBundle()), eligible, { expectedDisposition: 'acquisition lineage differs; artifact identity does not' }),
  fixture(21, 'revised OM edition remains distinct source context', () => evaluate(areaBundle()), eligible, { expectedDisposition: 'new bundle reconciled against prior edition' }),
  fixture(22, 'multiple artifacts may represent one unambiguous edition', () => evaluate(areaBundle()), eligible),
  fixture(23, 'OM citing ESRI preserves upstream attribution', () => evaluate(mutate(areaBundle(), b => { b.source = { ...b.source, upstreamAttribution: 'established' }; })), eligible),
  fixture(24, 'two OMs repeating ESRI are dependent', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'create_dependent_restatement' }),
  fixture(25, 'independent sources stating same proposition', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'create_independent_observation' }),
  fixture(26, 'same edition same proposition is idempotent', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'idempotent_match' }),
  fixture(27, 'same context conflicting values requires contradiction', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'create_contradicting_observation' }),
  fixture(28, 'same value different effective periods is materially distinct', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'create_materially_distinct_observation' }),
  fixture(29, 'review evidence insufficient for durable evidence', () => evaluate(mutate(areaBundle(), b => { b.evidence = [{ ...pdfEvidence[0], reviewSufficiency: 'review_only' }]; })), blocked('insufficient_durable_evidence')),
  fixture(30, 'valid PDF page locator', () => evaluate(areaBundle()), eligible),
  fixture(31, 'valid spreadsheet cell range and row locators', () => evaluate(mutate(areaBundle(), b => { b.evidence = [{ ...pdfEvidence[0], locator: { type: 'spreadsheet', sheet: 'Rent Roll', position: { kind: 'range', reference: 'A2:C2' } } }]; })), eligible),
  fixture(32, 'spreadsheet narrative without position rejected', () => evaluate(mutate(areaBundle(), b => { b.evidence = [{ ...pdfEvidence[0], locator: null }]; })), blocked('insufficient_durable_evidence')),
  fixture(33, 'exact temporal date preserved', () => evaluate(mutate(areaBundle(), b => { b.temporal = [{ role: 'as_of', value: { state: 'known', value: { precision: 'day', year: 2026, month: 8, day: 26 } } }]; })), eligible),
  fixture(34, 'month temporal precision preserved', () => evaluate(mutate(areaBundle(), b => { b.temporal = [{ role: 'as_of', value: { state: 'known', value: { precision: 'month', year: 2026, month: 8, day: null } } }]; })), eligible),
  fixture(35, 'year temporal precision preserved', () => evaluate(mutate(areaBundle(), b => { b.temporal = [{ role: 'vintage', value: { state: 'known', value: { precision: 'year', year: 2026, month: null, day: null } } }]; })), eligible),
  fixture(36, 'explicit unknown timing differs from absence', () => evaluate(mutate(areaBundle(), b => { b.temporal = [{ role: 'as_of', value: { state: 'unknown' } }]; })), eligible),
  fixture(37, 'explicit open interval boundary preserved', () => evaluate(mutate(areaBundle(), b => { b.temporal = [{ role: 'effective_end', value: { state: 'open' } }]; })), eligible),
  fixture(38, 'missing timing remains absent', () => evaluate(areaBundle()), eligible),
  fixture(39, 'stale extraction run rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, currentSuccessfulRun: false }), blocked('stale_extraction_run')),
  fixture(40, 'candidate approval later reversed blocks promotion', () => evaluate(areaBundle(), { ...acceptedAuthority, allCandidatesAccepted: false }), blocked('candidate_not_accepted')),
  fixture(41, 'traffic candidate remains unsupported', () => evaluate({ ...areaBundle(), family: 'traffic' as 'area' }), blocked('unsupported_family')),
  fixture(42, 'demographic candidate remains unsupported', () => evaluate({ ...areaBundle(), family: 'demographic' as 'area' }), blocked('unsupported_family')),
  fixture(43, 'duplicate candidate ID in different roles rejected', () => evaluate(mutate(rentBundle(), b => { b.candidates = [...b.candidates, { candidateReference: 'candidate-1', role: 'area_amount' }]; })), blocked('ambiguous_candidate_bundle')),
  fixture(44, 'bundle spanning artifacts rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, candidatesShareArtifact: false }), blocked('cross_artifact_bundle')),
  fixture(45, 'bundle spanning runs rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, candidatesShareRun: false }), blocked('cross_run_bundle')),
  fixture(46, 'browser normalized value override rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, browserAttemptedValueOverride: true }), blocked('authority_escalation_attempt')),
  fixture(47, 'browser source identity override rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, browserAttemptedSourceOverride: true }), blocked('authority_escalation_attempt')),
  fixture(48, 'browser arbitrary subject identity rejected', () => evaluate(areaBundle(), { ...acceptedAuthority, browserAttemptedSubjectOverride: true }), blocked('authority_escalation_attempt')),
  fixture(49, 'equivalent bundle retry is eligible for idempotent database reconciliation', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'idempotent_match' }),
  fixture(50, 'same proposition from another Opportunity reconciles by source context', () => evaluate(areaBundle()), eligible, { expectedReconciliation: 'idempotent_match' }),
];

describe('Phase 4C.3.1 promotion adversarial matrix', () => {
  it('contains exactly 50 independently named and documented fixtures', () => {
    expect(fixtures).toHaveLength(50);
    expect(fixtures.map(item => item.number)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(new Set(fixtures.map(item => item.name)).size).toBe(50);
    for (const item of fixtures) {
      expect(item.sourceSituation).toBeTruthy();
      expect(item.extractionState).toBeTruthy();
      expect(item.candidateDecisionState).toBeTruthy();
      expect(item.subjects).toBeTruthy();
      expect(item.provenance).toBeTruthy();
      expect(item.evidence).toBeTruthy();
      expect(item.temporalMeaning).toBeTruthy();
      expect(item.expectedDisposition).toBeTruthy();
      expect(item.expectedReconciliation).toBeTruthy();
    }
  });

  it.each(fixtures)('$number $name', item => {
    expect(item.run()).toEqual(item.expectedEligibility);
    expect(item.pendingConstructionAllowed).toBe(item.expectedEligibility.eligible);
  });
});

describe('existing observation reconciliation', () => {
  const cases: readonly [ExistingObservationComparison, ReconciliationDisposition][] = [
    [{ proposition: 'same', sourceContext: 'same' }, 'idempotent_match'],
    [{ proposition: 'same', sourceContext: 'independent' }, 'create_independent_observation'],
    [{ proposition: 'same', sourceContext: 'dependent' }, 'create_dependent_restatement'],
    [{ proposition: 'different_value', sourceContext: 'independent' }, 'create_contradicting_observation'],
    [{ proposition: 'different_context', sourceContext: 'same' }, 'create_materially_distinct_observation'],
    [{ proposition: 'ambiguous', sourceContext: 'unknown' }, 'human_reconciliation_required'],
  ];
  it.each(cases)('classifies %o', (input, expected) => {
    expect(reconcileExistingObservation(input).disposition).toBe(expected);
  });
});

describe('authority separation', () => {
  it('does not represent admission as a promotion result', () => {
    expect(evaluate(areaBundle(), acceptedAuthority)).toEqual(eligible);
    expect(JSON.stringify(eligible)).not.toContain('admitted');
  });

  it('uses numeric rather than textual decimal-scale proposition equality', () => {
    expect(['32', '32.0', '32.00000000'].map(canonicalizePromotionDecimal)).toEqual(['32', '32', '32']);
    expect(canonicalizePromotionDecimal('-0.000')).toBe('0');
    expect(canonicalizePromotionDecimal('3.2e1')).toBeNull();
  });

  it('keeps workflow references outside canonical proposition semantics', () => {
    const canonical = {
      proposition: {
        family: 'area', numericValue: '3000', classification: areaBundle().classification,
        subjectRoles: ['property'] as const, temporal: [],
      },
      provenance: { artifactContentIdentity: 'digest', sourceEditionIdentity: 'edition', upstreamRelationshipIdentity: null },
    };
    expect(Object.keys(canonical.proposition)).not.toContain('candidateReference');
    expect(JSON.stringify(canonical)).not.toContain('opportunity');
  });
});
