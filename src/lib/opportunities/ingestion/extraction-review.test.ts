import { describe, expect, it } from 'vitest';
import { buildExtractionReviewModel, formatCandidateValue, type ExtractionReviewCandidate } from './extraction-review';
const candidate = (fieldPath: string, ordinal = 0, overrides: Partial<ExtractionReviewCandidate> = {}): ExtractionReviewCandidate => ({
  id: `candidate-${ordinal}`, fieldPath, valueType: 'text', value: `Value ${ordinal}`, unit: 'NONE',
  assertionBasis: 'source_stated', confidence: null, validationState: 'valid', validationIssues: [], ordinal,
  fingerprint: String(ordinal).padStart(64, '0'), decisionCount: 0,
  evidence: [{ pageNumber: 2, snippet: 'Synthetic support', sectionLabel: null, boundingBoxAvailable: false,
    extractionMethod: 'synthetic', extractionVersion: 'v1' }], ...overrides,
});
describe('extraction review model', () => {
  it('builds Mason-shaped counts from synthetic candidates without hard-coded values', () => {
    const paths = ['document.title','property.marketedType','location.intersection','land.areaAcres','land.areaSf',
      'pricing.askingPrice','pricing.askingPricePerLandSf','site.utilities','access.roadName','access.roadName',
      'access.pointDescription','access.signalizedIntersectionClaim','broker.brokerage','broker.contactName',
      'broker.phone','broker.email','marketing.suggestedUse'];
    const model = buildExtractionReviewModel({ attemptNumber: 8, completedAt: null,
      candidates: paths.map((path, index) => candidate(path, index)) });
    expect(model.factCount).toBe(17); expect(model.representedDestinationCount).toBe(16);
    expect(model.registryDestinationCount).toBe(31); expect(model.missingDestinationCount).toBe(15);
    expect(model.decisionCount).toBe(0);
  });
  it('preserves set values while flagging conflicting scalar candidates', () => {
    const model = buildExtractionReviewModel({ attemptNumber: 1, completedAt: null, candidates: [
      candidate('access.roadName', 0), candidate('access.roadName', 1),
      candidate('pricing.askingPrice', 2), candidate('pricing.askingPrice', 3),
    ] });
    const items = model.groups.flatMap(group => group.items);
    expect(items.filter(item => item.fieldPath === 'access.roadName')).toHaveLength(2);
    expect(items.filter(item => item.fieldPath === 'access.roadName').every(item => !item.scalarConflict)).toBe(true);
    expect(items.filter(item => item.fieldPath === 'pricing.askingPrice').every(item => item.scalarConflict)).toBe(true);
  });
  it('describes missing fields as absent candidates rather than negative facts', () => {
    const model = buildExtractionReviewModel({ attemptNumber: 1, completedAt: null, candidates: [] });
    expect(model.missingDestinations).toContainEqual(expect.objectContaining({ fieldPath: 'site.floodplainClaim', label: 'Floodplain' }));
    expect(model.factCount).toBe(0); expect(model.missingDestinationCount).toBe(31);
  });
  it('formats supported values without mutating canonical input', () => {
    expect(formatCandidateValue('decimal', '3.96', 'ACRES')).toBe('3.96 acres');
    expect(formatCandidateValue('decimal', '172498', 'SF')).toBe('172,498 SF');
    expect(formatCandidateValue('decimal', '3277455', 'USD')).toBe('$3,277,455');
    expect(formatCandidateValue('decimal', '19.00', 'USD_PER_LAND_SF')).toBe('$19.00 / SF');
    expect(formatCandidateValue('boolean', false, 'NONE')).toBe('No');
    expect(formatCandidateValue('date', '2026-08-24', 'NONE')).toBe('2026-08-24');
  });
  it('preserves missing confidence and evidence metadata', () => {
    const model = buildExtractionReviewModel({ attemptNumber: 2, completedAt: null,
      candidates: [candidate('site.utilities')] }); const item = model.groups[0].items[0];
    expect(item.confidence).toBeNull(); expect(item.evidence[0]).toMatchObject({ pageNumber: 2, boundingBoxAvailable: false });
    expect(item.humanReviewStatus).toBe('unreviewed');
  });
});
