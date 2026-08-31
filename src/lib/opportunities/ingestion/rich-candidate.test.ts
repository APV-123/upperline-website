import { describe, expect, it } from 'vitest';
import { ingestionFingerprint } from './fingerprint';
import { canonicalizeRichCandidate, parseTrafficCountProposition, parseTrafficCountPropositionV2 } from './rich-candidate';

const masonTraffic = () => ({
  kind: 'traffic_count', schemaVersion: 1, count: 31_942, unit: 'vehicles_per_day',
  basis: { normalized: 'VPD', sourceLiteral: 'VPD' },
  roadway: { sourceLiteral: 'Mason Road' }, countLocation: null, direction: null,
  measurementTime: { role: 'measurement', precision: 'year', year: 2025, month: null, day: null },
});

describe('traffic_count schemaVersion 2', () => {
  const greenbusch = () => ({ kind:'traffic_count',schemaVersion:2,count:10732,unit:'vehicles_per_day',basis:{normalized:'unknown',sourceLiteral:'Avg Daily Volume'},sourceVolumeType:'MPSI',roadway:{sourceLiteral:'Greenbusch Rd'},crossStreet:{sourceLiteral:'Roesner Rd'},crossStreetOffset:{distance:0.21,unit:'miles',direction:'NW'},sourceRelativeSubjectDistance:{distance:0.12,unit:'miles'},measurementTime:{role:'measurement',precision:'year',year:2025,month:null,day:null} });
  it('faithfully represents Greenbusch and Amy Shores without generic location fields',()=>{
    expect(parseTrafficCountPropositionV2(greenbusch())).toEqual(greenbusch());
    const amy={...greenbusch(),count:3172,roadway:{sourceLiteral:'Amy Shores Ct'},crossStreet:null,crossStreetOffset:{distance:0,unit:'miles',direction:null},sourceRelativeSubjectDistance:{distance:0.06,unit:'miles'},measurementTime:{role:'measurement',precision:'year',year:2024,month:null,day:null}};
    expect(parseTrafficCountPropositionV2(amy)).toEqual(amy);
    expect(parseTrafficCountPropositionV2(amy).crossStreetOffset.distance).toBe(0);
  });
  it.each([
    ['Amy Shores Ct',null,0,null,2024,3172,0.06],['Amy Shores Ct',null,0,null,2025,3194,0.06],
    ['Greenbusch Rd','Roesner Rd',0.21,'NW',2025,10732,0.12],['Greenbusch Rd','Roesner Rd',0.21,'NW',2024,10665,0.12],
    ['Westheimer Pkwy','Cinco Ranch Blvd',1.91,'SE',2025,11118,0.15],['Westheimer Pkwy','Cinco Ranch Blvd',1.91,'SE',2024,11048,0.15],
    ['Green Bush Rd','Willow Creek Ln',0.18,'SW',2025,5919,0.20],['Green Bush Rd','Willow Creek Ln',0.18,'SW',2024,5891,0.20],
    ['Roesner Rd','Lake Point Estates Dr',0.04,'NE',2025,3057,0.22],['Roesner Rd','Lake Point Estates Dr',0.04,'NE',2024,3036,0.22],
  ] as const)('represents Katy row %# without spelling or semantic conflation',(road,cross,distanceValue,direction,year,count,subjectDistance)=>{
    const value={...greenbusch(),count,roadway:{sourceLiteral:road},crossStreet:cross===null?null:{sourceLiteral:cross},crossStreetOffset:{distance:distanceValue,unit:'miles',direction},sourceRelativeSubjectDistance:{distance:subjectDistance,unit:'miles'},measurementTime:{role:'measurement',precision:'year',year,month:null,day:null}};
    expect(parseTrafficCountPropositionV2(value)).toEqual(value);
  });
  it('keeps missing distance distinct from zero and MPSI outside normalized basis',()=>{
    expect(parseTrafficCountPropositionV2({...greenbusch(),sourceRelativeSubjectDistance:{distance:null,unit:null}}).sourceRelativeSubjectDistance.distance).toBeNull();
    expect(()=>parseTrafficCountPropositionV2({...greenbusch(),basis:{normalized:'ADT',sourceLiteral:'MPSI'}})).toThrow();
    expect(()=>parseTrafficCountPropositionV2({...greenbusch(),basis:{normalized:'unknown',sourceLiteral:'MPSI'}})).toThrow();
  });
  it.each([
    ['unknown key',{countLocation:'Roesner Rd'}],['negative distance',{crossStreetOffset:{distance:-1,unit:'miles',direction:'NW'}}],['nonfinite distance',{crossStreetOffset:{distance:Number.POSITIVE_INFINITY,unit:'miles',direction:'NW'}}],['bad direction',{crossStreetOffset:{distance:0.21,unit:'miles',direction:'northwest'}}],['unit without distance',{sourceRelativeSubjectDistance:{distance:null,unit:'miles'}}],['provider property authority',{propertyId:'forged'}],
  ])('rejects %s',(_name,replacement)=>expect(()=>parseTrafficCountPropositionV2({...greenbusch(),...replacement})).toThrow());
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
