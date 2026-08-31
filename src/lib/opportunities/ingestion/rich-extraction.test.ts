import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { mapValidatedExtraction } from './extraction-mapper';
import { buildExtractionReviewModel, type ExtractionReviewCandidate } from './extraction-review';
import { parseExtractionProviderOutput } from './extraction-validator';
import { buildOpenAIExtractionInstructions, buildOpenAIExtractionSchema } from './openai-extraction-provider';
import type { TrafficCountPropositionV1 } from './rich-candidate';
import type { TrafficCountPropositionV2 } from './rich-candidate';

const proposition = (): TrafficCountPropositionV1 => ({
  kind: 'traffic_count', schemaVersion: 1, count: 31_942, unit: 'vehicles_per_day',
  basis: { normalized: 'VPD', sourceLiteral: 'VPD' }, roadway: { sourceLiteral: 'Mason Road' },
  countLocation: 'at Mason Manor Drive', direction: null,
  measurementTime: { role: 'measurement', precision: 'year', year: 2025, month: null, day: null },
});
const output = (value: unknown = proposition()) => ({ schemaVersion: 'land-flyer-v2', assertions: [], propositions: [{
  proposition: value, assertionBasis: 'source_stated', confidence: '0.98',
  evidence: [{ pageNumber: 2, snippet: '31,942 VPD — Mason Road — 2025' }],
}] });

describe('rich extraction pipeline', () => {
  it('maps traffic V2 unchanged under its own group and fingerprints every source dimension',()=>{
    const base:TrafficCountPropositionV2={kind:'traffic_count',schemaVersion:2,count:10732,unit:'vehicles_per_day',basis:{normalized:'unknown',sourceLiteral:'Avg Daily Volume'},sourceVolumeType:'MPSI',roadway:{sourceLiteral:'Greenbusch Rd'},crossStreet:{sourceLiteral:'Roesner Rd'},crossStreetOffset:{distance:0.21,unit:'miles',direction:'NW'},sourceRelativeSubjectDistance:{distance:0.12,unit:'miles'},measurementTime:{role:'measurement',precision:'year',year:2025,month:null,day:null}};
    const envelope=(p:TrafficCountPropositionV2)=>({schemaVersion:'land-flyer-v3',assertions:[],propositions:[{proposition:p,assertionBasis:'source_stated',confidence:null,evidence:[{pageNumber:1,snippet:'Traffic table'}]}]});
    const mapped=(p:TrafficCountPropositionV2)=>mapValidatedExtraction({output:parseExtractionProviderOutput(envelope(p),9),extractionVersion:'rich-v2',idFactory:()=> 'id'})[0];
    expect(mapped(base)).toMatchObject({normalizedValue:base,groupKey:'traffic_count:2',unit:'VEHICLES_PER_DAY'});
    for(const changed of [{...base,count:10733},{...base,roadway:{sourceLiteral:'Green Bush Rd'}},{...base,crossStreet:null},{...base,crossStreetOffset:{...base.crossStreetOffset,distance:0}},{...base,crossStreetOffset:{...base.crossStreetOffset,direction:'SE' as const}},{...base,sourceVolumeType:'AADT'},{...base,sourceRelativeSubjectDistance:{distance:0,unit:'miles' as const}},{...base,measurementTime:{...base.measurementTime,year:2024}}]) expect(mapped(changed).fingerprint).not.toBe(mapped(base).fingerprint);
    expect(mapped({...base,sourceRelativeSubjectDistance:{distance:null,unit:null}}).fingerprint).not.toBe(mapped({...base,sourceRelativeSubjectDistance:{distance:0,unit:'miles'}}).fingerprint);
  });
  it('validates and maps the complete proposition without scalar flattening', () => {
    const validated = parseExtractionProviderOutput(output(), 9);
    let id = 0;
    const [candidate] = mapValidatedExtraction({ output: validated, extractionVersion: 'rich-v1', idFactory: () => `id-${++id}` });
    expect(candidate).toMatchObject({ fieldPath: 'traffic.vehiclesPerDay', normalizedValueType: 'json',
      normalizedValue: proposition(), unit: 'VEHICLES_PER_DAY', groupKey: 'traffic_count:1', validationState: 'valid' });
    expect(candidate.evidence).toEqual([expect.objectContaining({ pageNumber: 2, snippet: '31,942 VPD — Mason Road — 2025' })]);
  });

  it('binds fingerprint identity to every material proposition dimension', () => {
    const fingerprint = (value: ReturnType<typeof proposition>) => mapValidatedExtraction({
      output: parseExtractionProviderOutput(output(value), 9), extractionVersion: 'rich-v1', idFactory: () => 'id',
    })[0].fingerprint;
    const baseline = proposition();
    expect(fingerprint({ ...baseline })).toBe(fingerprint(baseline));
    expect(fingerprint({ ...baseline, count: 31_943 })).not.toBe(fingerprint(baseline));
    expect(fingerprint({ ...baseline, roadway: null })).not.toBe(fingerprint(baseline));
    expect(fingerprint({ ...baseline, measurementTime: { ...baseline.measurementTime, year: 2024 } })).not.toBe(fingerprint(baseline));
  });

  it('renders a rich candidate as one whole-proposition human decision target', () => {
    const candidate: ExtractionReviewCandidate = { id: 'opaque-candidate', fieldPath: 'traffic.vehiclesPerDay',
      valueType: 'json', value: proposition(), unit: 'VEHICLES_PER_DAY', groupKey: 'traffic_count:1',
      assertionBasis: 'source_stated', confidence: '0.98', validationState: 'valid', validationIssues: [], ordinal: 0,
      fingerprint: 'not-public', latestDecision: { state: 'approved', decisionNumber: 1, decidedAt: '2026-08-29T00:00:00Z' },
      evidence: [{ pageNumber: 2, snippet: null, sectionLabel: null, boundingBoxAvailable: false, extractionMethod: 'provider_text', extractionVersion: 'rich-v1' }] };
    const item = buildExtractionReviewModel({ attemptNumber: 1, completedAt: null, candidates: [candidate] }).groups[0].items[0];
    expect(item).toMatchObject({ candidateId: 'opaque-candidate', formattedValue: '31,942 VPD · Roadway: Mason Road · Measurement: 2025 · Location: at Mason Manor Drive · Direction: Not reported', cardinality: 'set',
      humanReviewStatus: 'approved', propositionDetails: { basis: 'VPD · Source: VPD', roadway: 'Mason Road', vintage: '2025', location: 'at Mason Manor Drive', direction: 'Not reported' } });
    expect(item).not.toHaveProperty('fingerprint');
  });

  it('renders V2 traffic with distinct source semantics and no generic location labels',()=>{
    const value:TrafficCountPropositionV2={kind:'traffic_count',schemaVersion:2,count:3172,unit:'vehicles_per_day',basis:{normalized:'unknown',sourceLiteral:'Avg Daily Volume'},sourceVolumeType:'MPSI',roadway:{sourceLiteral:'Amy Shores Ct'},crossStreet:null,crossStreetOffset:{distance:0,unit:'miles',direction:null},sourceRelativeSubjectDistance:{distance:0.06,unit:'miles'},measurementTime:{role:'measurement',precision:'year',year:2024,month:null,day:null}};
    const candidate:ExtractionReviewCandidate={id:'v2',fieldPath:'traffic.vehiclesPerDay',valueType:'json',value,unit:'VEHICLES_PER_DAY',groupKey:'traffic_count:2',assertionBasis:'source_stated',confidence:null,validationState:'valid',validationIssues:[],ordinal:0,fingerprint:'hidden',latestDecision:null,evidence:[]};
    const item=buildExtractionReviewModel({attemptNumber:1,completedAt:null,candidates:[candidate]}).groups[0].items[0];
    expect(item.formattedValue).toContain('Amy Shores Ct · Cross street: Not reported · Cross-street offset: 0.00 mi');
    expect(item.formattedValue).toContain('Source heading: Avg Daily Volume');
    expect(item.formattedValue).toContain('Volume type: MPSI');
    expect(item.propositionDetails).toMatchObject({crossStreet:'Not reported',sourceRelativeSubjectDistance:'0.06 mi'});
    expect(item.propositionDetails).not.toHaveProperty('location');
    expect(item.propositionDetails).not.toHaveProperty('direction');
  });

  it('keeps historical scalar extraction envelopes readable and mappable', () => {
    const legacy = parseExtractionProviderOutput({ schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'traffic.vehiclesPerDay', value: { type: 'integer', value: '31942' }, unit: 'VEHICLES_PER_DAY',
      assertionBasis: 'source_stated', confidence: null, evidence: [{ pageNumber: 2, snippet: '31,942 VPD' }],
    }] }, 9);
    expect(mapValidatedExtraction({ output: legacy, extractionVersion: 'legacy-v1', idFactory: () => 'id' })[0]).toMatchObject({
      normalizedValueType: 'integer', normalizedValue: '31942', groupKey: null,
    });
  });

  it('keeps the OpenAI boundary strict, source-grounded, and free of internal identity authority', () => {
    const schema = JSON.stringify(buildOpenAIExtractionSchema());
    const instructions = buildOpenAIExtractionInstructions();
    expect(schema).toContain('traffic_count');
    expect(schema).toContain('vehicles_per_day');
    expect(schema).toContain('measurementTime');
    expect(instructions).toContain('Do not infer a date');
    expect(instructions).toContain('Never output internal UUIDs or business/entity identifiers');
    expect(schema).not.toContain('opportunityId');
    expect(schema).not.toContain('propertyId');
  });

  it('rejects evidence-free or partially structured propositions at the hostile local boundary', () => {
    expect(() => parseExtractionProviderOutput({ ...output(), propositions: [{ ...output().propositions[0], evidence: [] }] }, 9)).toThrow();
    expect(() => parseExtractionProviderOutput({ ...output(), propositions: [{ ...output().propositions[0], evidence: [{ pageNumber: 2 }] }] }, 9)).toThrow();
    const partial = proposition() as Record<string, unknown>;
    delete partial.measurementTime;
    expect(() => parseExtractionProviderOutput(output(partial), 9)).toThrow();
  });

  it('enforces one aggregate 100-candidate budget across scalar and rich families', () => {
    const scalar = { destination: 'access.roadName', value: { type: 'text', value: 'Road' }, unit: 'NONE',
      assertionBasis: 'source_stated', confidence: null, evidence: [{ pageNumber: 1, snippet: 'Road' }] };
    const rich = output().propositions[0];
    expect(() => parseExtractionProviderOutput({ schemaVersion: 'land-flyer-v2', assertions: Array.from({ length: 50 }, (_, index) => ({ ...scalar, value: { type: 'text', value: `Road ${index}` } })), propositions: Array.from({ length: 51 }, (_, index) => ({ ...rich, proposition: { ...proposition(), count: 10_000 + index } })) }, 9)).toThrow();
  });
});
