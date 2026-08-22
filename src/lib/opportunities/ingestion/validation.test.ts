import { describe, expect, it } from 'vitest';
import { ingestionFingerprint } from './fingerprint';
import { IngestionValidationError, validateCandidateDestination, validateCandidateValue, validateConfidence, validateCandidateUnit } from './validation';

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
});
