import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_LOCATOR_TYPES,
  LEASE_STRUCTURES,
  OBSERVATION_ORIGINS,
  PROPERTY_INTELLIGENCE_OBSERVATION_CONTRACT_VERSION,
  RENT_COMMITMENTS,
  RENT_MEANINGS,
  TEMPORAL_ROLES,
  classifySourceIndependence,
  projectAdmissionState,
  validateEvidenceLocator,
  validatePartialDate,
  validatePremisesAttachment,
  validateRentClassification,
  validateTemporalInterval,
  type RentClassification,
  type ArtifactIdentityReference,
  type LeaseBusinessIdentity,
  type LeaseInstrumentIdentity,
} from './observation-contracts';

const executedAnnualRent: RentClassification = {
  meaning: 'contractual',
  commitment: 'executed',
  component: 'base',
  amountBasis: 'monetary_per_area',
  timeBasis: 'annual',
  areaBasis: 'square_feet',
  leaseStructure: 'nnn',
  lifecycle: 'current',
  origin: 'contractual_document_stated',
};

describe('Phase 4C.2.0 observation contract', () => {
  it('versions the semantic contract without replacing Phase 4C.1', () => {
    expect(PROPERTY_INTELLIGENCE_OBSERVATION_CONTRACT_VERSION)
      .toBe('property-intelligence-observation-domain-v1');
  });

  it('exports closed orthogonal vocabularies', () => {
    expect(RENT_MEANINGS).toEqual(['asking', 'contractual', 'market_opinion']);
    expect(RENT_COMMITMENTS).toContain('reported_contractual');
    expect(OBSERVATION_ORIGINS).toContain('deterministic_derived');
    expect(LEASE_STRUCTURES).toContain('not_stated');
    expect(LEASE_STRUCTURES).toContain('unknown');
    expect(TEMPORAL_ROLES).not.toContain('publication');
    expect(EVIDENCE_LOCATOR_TYPES).not.toContain('openai');
  });

  it('keeps asking and contractual classifications distinct', () => {
    expect(validateRentClassification(executedAnnualRent)).toEqual([]);
    expect(validateRentClassification({
      ...executedAnnualRent,
      meaning: 'asking',
    })).toContain('asking_requires_marketed_uncommitted');
  });

  it('validates amount, time, component, and area dimensions together', () => {
    expect(validateRentClassification({
      ...executedAnnualRent,
      amountBasis: 'monetary_absolute',
    })).toContain('area_basis_requires_per_area_amount');
    expect(validateRentClassification({
      ...executedAnnualRent,
      component: 'percentage',
      amountBasis: 'percentage',
      areaBasis: 'not_applicable',
      timeBasis: 'not_applicable',
      leaseStructure: 'percentage_lease',
    })).toEqual([]);
  });

  it('keeps source-stated and deterministic-derived origins distinct', () => {
    expect(executedAnnualRent.origin).toBe('contractual_document_stated');
    const derived = { ...executedAnnualRent, origin: 'deterministic_derived' as const };
    expect(derived.origin).not.toBe(executedAnnualRent.origin);
    expect(validateRentClassification(derived)).toEqual([]);
  });

  it('retains partial date precision and rejects manufactured components', () => {
    expect(validatePartialDate({ precision: 'year', year: 2026, month: null, day: null })).toEqual([]);
    expect(validatePartialDate({ precision: 'month', year: 2026, month: 3, day: null })).toEqual([]);
    expect(validatePartialDate({ precision: 'day', year: 2026, month: 2, day: 29 })).toContain('day_invalid');
    expect(validatePartialDate({ precision: 'unknown', year: null, month: null, day: null })).toEqual([]);
  });

  it('rejects impossible temporal ordering without requiring equal precision', () => {
    expect(validateTemporalInterval(
      { precision: 'month', year: 2027, month: 3, day: null },
      { precision: 'year', year: 2026, month: null, day: null },
    )).toContain('interval_order_invalid');
    expect(validateTemporalInterval(
      { precision: 'year', year: 2026, month: null, day: null },
      { precision: 'month', year: 2026, month: 3, day: null },
    )).toEqual([]);
  });

  it('requires an explicit admission action independent of candidate approval', () => {
    const candidateReview = { decision: 'accepted' as const };
    expect(candidateReview.decision).toBe('accepted');
    expect(projectAdmissionState([])).toBe('pending');
    expect(projectAdmissionState(['admitted'])).toBe('admitted');
    expect(projectAdmissionState(['admitted', 'reversed'])).toBe('pending');
    expect(projectAdmissionState(['rejected'])).toBe('rejected');
  });

  it('keeps lease business identity, instrument identity, and artifact identity separate', () => {
    const lease: LeaseBusinessIdentity = { kind: 'lease', id: 'lease-1', resolution: 'provisional' };
    const instrument: LeaseInstrumentIdentity = {
      kind: 'lease_instrument', id: 'instrument-1', instrumentType: 'source_summary',
    };
    const artifact: ArtifactIdentityReference = {
      kind: 'artifact', id: 'artifact-1', sha256Digest: 'a'.repeat(64),
    };
    expect(new Set([lease.kind, instrument.kind, artifact.kind]).size).toBe(3);
  });

  it('does not count repeated evidence or custody as independent corroboration', () => {
    expect(classifySourceIndependence({
      sameArtifactDigest: true,
      sameLogicalSource: true,
      sharesUpstreamAssertion: true,
      independentlyAssessed: false,
    })).toBe('same_artifact');
    expect(classifySourceIndependence({
      sameArtifactDigest: false,
      sameLogicalSource: true,
      sharesUpstreamAssertion: false,
      independentlyAssessed: false,
    })).toBe('same_logical_source');
    expect(classifySourceIndependence({
      sameArtifactDigest: false,
      sameLogicalSource: false,
      sharesUpstreamAssertion: true,
      independentlyAssessed: false,
    })).toBe('derivative');
  });

  it('validates typed evidence positions without provider identity', () => {
    expect(validateEvidenceLocator({ type: 'pdf', page: 11, sectionLabel: 'Rent roll' })).toEqual([]);
    expect(validateEvidenceLocator({ type: 'spreadsheet', sheet: 'RR', cell: 'B12' })).toEqual([]);
    expect(validateEvidenceLocator({ type: 'spreadsheet', sheet: 'RR', cell: 'B12', row: 12 }))
      .toContain('spreadsheet_locator_invalid');
  });

  it('does not fabricate premises for an unresolved roster row', () => {
    expect(validatePremisesAttachment({
      state: 'unresolved',
      premisesEntityId: null,
      reportedSpaceLabel: 'Starbucks — 2,200 SF',
    })).toEqual([]);
    expect(validatePremisesAttachment({
      state: 'resolved',
      premisesEntityId: '',
      reportedSpaceLabel: null,
    })).toContain('resolved_premises_id_required');
  });
});
