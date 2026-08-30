import { describe, expect, it } from 'vitest';
import { ingestionFingerprint } from './fingerprint';
import { canonicalizeRichCandidate, parseTrafficCountProposition } from './rich-candidate';

const masonTraffic = () => ({
  kind: 'traffic_count', schemaVersion: 1, count: 31_942, unit: 'vehicles_per_day',
  basis: { normalized: 'VPD', sourceLiteral: 'VPD' },
  roadway: { sourceLiteral: 'Mason Road' }, countLocation: null, direction: null,
  measurementTime: { role: 'measurement', precision: 'year', year: 2025, month: null, day: null },
});

describe('versioned rich candidate propositions', () => {
  it('admits the complete typed Mason-like traffic proposition', () => {
    expect(parseTrafficCountProposition(masonTraffic())).toEqual(masonTraffic());
  });

  it.each([
    ['non-positive count', { count: 0 }],
    ['fractional count', { count: 31942.5 }],
    ['wrong unit', { unit: 'COUNT' }],
    ['provider UUID authority', { propertyId: '3a24a91f-a0c0-4cfc-96a2-8d4f00282e63' }],
    ['provider road UUID authority', { roadEntityId: '11111111-1111-4111-8111-111111111111' }],
  ])('rejects %s', (_name, replacement) => {
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), ...replacement })).toThrow();
  });

  it('requires every nullable dimension to be explicit rather than absent', () => {
    const value = masonTraffic() as Record<string, unknown>;
    delete value.roadway;
    expect(() => parseTrafficCountProposition(value)).toThrow();
  });

  it('does not invent a roadway when the source does not state one', () => {
    expect(parseTrafficCountProposition({ ...masonTraffic(), roadway: null }).roadway).toBeNull();
  });

  it('maps only exact controlled source literals and never silently upgrades unknown', () => {
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), basis: { normalized: 'AADT', sourceLiteral: 'VPD' } })).toThrow();
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), basis: { normalized: 'unknown', sourceLiteral: 'VPD' } })).toThrow();
    expect(parseTrafficCountProposition({ ...masonTraffic(), basis: { normalized: 'unknown', sourceLiteral: 'Daily Vehicles' } }).basis).toEqual({ normalized: 'unknown', sourceLiteral: 'Daily Vehicles' });
  });

  it('rejects inferred, incomplete, or impossible measurement dates', () => {
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), measurementTime: { role: 'measurement', precision: 'unknown', year: 2025, month: null, day: null } })).toThrow();
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), measurementTime: { role: 'measurement', precision: 'month', year: 2025, month: null, day: null } })).toThrow();
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), measurementTime: { role: 'measurement', precision: 'day', year: 2025, month: 2, day: 30 } })).toThrow();
  });

  it('normalizes Unicode to NFC but rejects whitespace or controls instead of silently rewriting source text', () => {
    const parsed = parseTrafficCountProposition({ ...masonTraffic(), roadway: { sourceLiteral: 'Cafe\u0301 Road' } });
    expect(parsed.roadway?.sourceLiteral).toBe('Café Road');
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), roadway: { sourceLiteral: ' Mason Road ' } })).toThrow();
    expect(() => parseTrafficCountProposition({ ...masonTraffic(), roadway: { sourceLiteral: 'Mason\u0000Road' } })).toThrow();
  });

  it('canonicalizes key order while preserving every proposition dimension in identity', () => {
    const parsed = parseTrafficCountProposition(masonTraffic());
    const reordered = { measurementTime: parsed.measurementTime, direction: null, countLocation: null, roadway: parsed.roadway, basis: parsed.basis, unit: parsed.unit, count: parsed.count, schemaVersion: 1, kind: 'traffic_count' };
    expect(canonicalizeRichCandidate(parseTrafficCountProposition(reordered))).toBe(canonicalizeRichCandidate(parsed));
    const identity = (value: unknown) => ingestionFingerprint({ domain: 'source', fieldPath: 'traffic.vehiclesPerDay', proposition: value });
    expect(identity(parsed)).toBe(identity(parseTrafficCountProposition(reordered)));
    expect(identity(parsed)).not.toBe(identity({ ...parsed, direction: 'northbound' }));
    expect(identity(parsed)).not.toBe(identity({ ...parsed, roadway: null }));
  });
});
