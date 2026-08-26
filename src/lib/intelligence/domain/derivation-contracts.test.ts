import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { TemporalAssertion } from './observation-contracts';
import {
  ACRES_TO_SQUARE_FEET_V1_CANONICAL_MANIFEST,
  ACRES_TO_SQUARE_FEET_V1_CONTRACT_SHA256,
  ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CANONICAL_MANIFEST,
  ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CONTRACT_SHA256,
  areaTemporallySupportsRentReferenceV1,
  normalizeDurableIntelligenceText,
} from './derivation-contracts';

const point = (role: TemporalAssertion['role'], iso: string): TemporalAssertion => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { role, boundary: 'point', value: { precision: 'day', year, month, day } };
};
const closed = (role: 'effective_start' | 'effective_end', iso: string): TemporalAssertion => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { role, boundary: 'closed', value: { precision: 'day', year, month, day } };
};
const open = (role: 'effective_start' | 'effective_end'): TemporalAssertion => ({
  role,
  boundary: 'open',
  value: { precision: 'unknown', year: null, month: null, day: null },
});
const unknown = (role: 'effective_start' | 'effective_end'): TemporalAssertion => ({
  role,
  boundary: 'closed',
  value: { precision: 'unknown', year: null, month: null, day: null },
});
const ref = { year: 2026, month: 6, day: 15 };

describe('Phase 4C.2.3 derivation method contracts', () => {
  it('NFC-normalizes durable bounded text before persistence', () => {
    expect(normalizeDurableIntelligenceText('Cafe\u0301')).toBe('Café');
  });
  it.each([
    [ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CANONICAL_MANIFEST, ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CONTRACT_SHA256],
    [ACRES_TO_SQUARE_FEET_V1_CANONICAL_MANIFEST, ACRES_TO_SQUARE_FEET_V1_CONTRACT_SHA256],
  ])('locks canonical UTF-8 manifest bytes to the reviewed digest', (manifest, digest) => {
    expect(createHash('sha256').update(manifest, 'utf8').digest('hex')).toBe(digest);
  });

  it.each([
    [[closed('effective_start', '2026-06-15'), closed('effective_end', '2026-12-31')], true, 'finite exact start'],
    [[closed('effective_start', '2026-01-01'), closed('effective_end', '2026-06-15')], true, 'finite exact end'],
    [[closed('effective_start', '2026-01-01'), closed('effective_end', '2026-12-31')], true, 'finite interior'],
    [[closed('effective_start', '2026-06-16'), closed('effective_end', '2026-12-31')], false, 'before finite'],
    [[closed('effective_start', '2025-01-01'), closed('effective_end', '2026-06-14')], false, 'after finite'],
    [[closed('effective_start', '2026-06-15'), open('effective_end')], true, 'known start exact'],
    [[closed('effective_start', '2026-01-01'), open('effective_end')], true, 'known start later'],
    [[closed('effective_start', '2026-06-16'), open('effective_end')], false, 'before known start'],
    [[open('effective_start'), closed('effective_end', '2026-06-15')], true, 'known end exact'],
    [[open('effective_start'), closed('effective_end', '2026-12-31')], true, 'known end earlier'],
    [[open('effective_start'), closed('effective_end', '2026-06-14')], false, 'after known end'],
    [[closed('effective_start', '2026-06-15')], false, 'known start omitted end'],
    [[closed('effective_end', '2026-06-15')], false, 'omitted start known end'],
    [[closed('effective_start', '2026-01-01')], false, 'known start later reference'],
    [[closed('effective_end', '2026-12-31')], false, 'known end earlier reference'],
    [[closed('effective_start', '2026-06-15'), unknown('effective_end')], false, 'unknown end'],
    [[unknown('effective_start'), closed('effective_end', '2026-06-15')], false, 'unknown start'],
    [[open('effective_start'), open('effective_end')], false, 'open open'],
    [[point('reporting_period_start', '2026-06-15'), point('reporting_period_end', '2026-06-15')], false, 'reporting cannot substitute'],
    [[point('vintage', '2026-06-15')], false, 'vintage cannot substitute'],
    [[point('as_of', '2026-06-15')], true, 'exact as of fallback'],
    [[point('measurement', '2026-06-15')], true, 'exact measurement fallback'],
    [[point('measurement', '2026-06-14')], false, 'measurement mismatch'],
  ] as const)('$2', (assertions, expected, caseName) => {
    expect(caseName.length).toBeGreaterThan(0);
    expect(areaTemporallySupportsRentReferenceV1(assertions, ref)).toBe(expected);
  });

  it('does not expand month or year precision', () => {
    const partial: TemporalAssertion[] = [
      { role: 'effective_start', boundary: 'closed', value: { precision: 'month', year: 2026, month: 6, day: null } },
      open('effective_end'),
    ];
    expect(areaTemporallySupportsRentReferenceV1(partial, ref)).toBe(false);
  });
});
