import { describe, expect, it } from 'vitest';
import { ingestionFingerprint } from './fingerprint';
import { LAND_FLYER_SOURCE_DESTINATIONS } from './destination-registry';
import {
  IngestionValidationError, validateCandidateDestination, validateCandidateValue,
  validateConfidence, validateCandidateUnit, validateLandFlyerCandidateContract,
} from './validation';

describe('ingestion candidate validation', () => {
  it('accepts canonical exact values', () => {
    expect(validateCandidateValue({ type: 'decimal', value: '153941.04' }).value).toBe('153941.04');
    expect(validateCandidateValue({ type: 'integer', value: '-12' }).value).toBe('-12');
    expect(validateCandidateValue({ type: 'date', value: '2026-02-28' }).value).toBe('2026-02-28');
    expect(validateConfidence('1.0000')).toBe('1.0000');
    expect(validateCandidateUnit('USD_PER_SF_YEAR')).toBe('USD_PER_SF_YEAR');
  });

  it.each([{ type: 'decimal', value: '1,200.00' }, { type: 'decimal', value: '01.2' },
    { type: 'integer', value: '1.0' }, { type: 'date', value: '2026-02-30' }] as const)
  ('rejects malformed normalized value $value', value => {
    expect(() => validateCandidateValue(value)).toThrow(IngestionValidationError);
  });

  it.each(['-0.1', '1.1', '.5', 'NaN', '0.12345'])('rejects invalid confidence %s', value => {
    expect(() => validateConfidence(value)).toThrow(IngestionValidationError);
  });

  it('enforces canonical tenant identity and field paths', () => {
    expect(validateCandidateDestination({ domain: 'tenant', candidateTenantKey: '99a384c6-b3f9-4198-9a8d-28621dd07652', fieldPath: 'rentalRatePerSfYear' }).domain).toBe('tenant');
    expect(() => validateCandidateDestination({ domain: 'tenant', candidateTenantKey: 'tenant-0', fieldPath: 'tenants[0].rent' })).toThrow(IngestionValidationError);
  });

  it('creates stable order-independent fingerprints', () => {
    expect(ingestionFingerprint({ b: 2, a: '1' })).toBe(ingestionFingerprint({ a: '1', b: 2 }));
    expect(ingestionFingerprint({ a: '1' })).not.toBe(ingestionFingerprint({ a: '2' }));
  });

  it('accepts every bounded V1 source destination with its declared contract', () => {
    for (const definition of Object.values(LAND_FLYER_SOURCE_DESTINATIONS)) {
      expect(validateLandFlyerCandidateContract({
        destination: { domain: 'source', fieldPath: definition.fieldPath },
        valueType: definition.expectedValueType,
        unit: definition.allowedUnits[0],
        assertionBasis: definition.allowedAssertionBases[0],
        economicRole: 'descriptive_fact',
      }).destination).toEqual({ domain: 'source', fieldPath: definition.fieldPath });
    }
  });

  it.each(['market.demographicObservation', 'market.nearbyDevelopment',
    'market.nearbyRetailer', 'market.school', 'market.employmentGenerator',
    'marketing.positioning', 'arbitrary.field'])
  ('rejects deferred or unknown source destination %s', fieldPath => {
    expect(() => validateCandidateDestination({ domain: 'source', fieldPath }))
      .toThrow(IngestionValidationError);
  });

  it.each(['visual_inference', 'model_inference'] as const)
  ('accepts %s for source extraction', assertionBasis => {
    expect(validateLandFlyerCandidateContract({
      destination: { domain: 'source', fieldPath: 'document.title' },
      valueType: 'text', unit: 'NONE', assertionBasis, economicRole: 'descriptive_fact',
    }).assertionBasis).toBe(assertionBasis);
  });

  it('rejects invalid field units and extraction-created Upperline assumptions', () => {
    expect(() => validateLandFlyerCandidateContract({
      destination: { domain: 'source', fieldPath: 'land.areaAcres' },
      valueType: 'decimal', unit: 'FEET', assertionBasis: 'source_stated',
      economicRole: 'descriptive_fact',
    })).toThrow(IngestionValidationError);
    expect(() => validateLandFlyerCandidateContract({
      destination: { domain: 'opportunity', fieldPath: 'name' },
      valueType: 'text', unit: 'NONE', assertionBasis: 'source_stated',
      economicRole: 'upperline_assumption',
    })).toThrow(IngestionValidationError);
  });

  it.each([
    ['land.areaAcres', 'decimal', 'ACRES'],
    ['pricing.askingPricePerLandSf', 'decimal', 'USD_PER_LAND_SF'],
    ['access.frontageFeet', 'decimal', 'FEET'],
    ['traffic.vehiclesPerDay', 'integer', 'VEHICLES_PER_DAY'],
  ] as const)('accepts %s as %s with %s', (fieldPath, valueType, unit) => {
    expect(validateLandFlyerCandidateContract({
      destination: { domain: 'source', fieldPath }, valueType, unit,
      assertionBasis: 'source_stated', economicRole: 'descriptive_fact',
    }).unit).toBe(unit);
  });

  it('preserves existing opportunity, underwriting, and tenant destinations', () => {
    expect(validateCandidateDestination({ domain: 'opportunity', fieldPath: 'name' }).domain)
      .toBe('opportunity');
    expect(validateCandidateDestination({ domain: 'underwriting', fieldPath: 'site.landAreaSf' }).domain)
      .toBe('underwriting');
    expect(validateCandidateDestination({
      domain: 'tenant', candidateTenantKey: '99a384c6-b3f9-4198-9a8d-28621dd07652',
      fieldPath: 'sizeSf',
    }).domain).toBe('tenant');
  });
});
