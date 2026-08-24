import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { LAND_FLYER_SOURCE_DESTINATIONS } from './destination-registry';
import { mapValidatedExtraction } from './extraction-mapper';
import { parseExtractionProviderOutput } from './extraction-validator';
import { ingestionFingerprint } from './fingerprint';
import type { CandidateValue, CandidateValueType } from './contracts';

describe('validated extraction persistence mapping', () => {
  it('projects all 31 registry destinations to the scalar JSON value required by persistence', () => {
    const assertions = Object.entries(LAND_FLYER_SOURCE_DESTINATIONS).map(([destination, definition]) => {
      const value = valueFor(definition.expectedValueType);
      return {
        destination, value, unit: definition.allowedUnits[0], assertionBasis: 'source_stated',
        confidence: '0.9000', evidence: [{ pageNumber: 1, snippet: 'Synthetic support', sectionLabel: null }],
      };
    });
    const output = parseExtractionProviderOutput({ schemaVersion: 'land-flyer-v1', assertions }, 1);
    const snapshot = structuredClone(output);
    let sequence = 0;
    const candidates = mapValidatedExtraction({ output, extractionVersion: 'synthetic-v1',
      idFactory: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` });

    expect(candidates).toHaveLength(31);
    expect(candidates.map(candidate => candidate.fieldPath)).toEqual(Object.keys(LAND_FLYER_SOURCE_DESTINATIONS));
    for (const [index, candidate] of candidates.entries()) {
      expect(candidate.destinationDomain).toBe('source');
      expect(candidate.normalizedValueType).toBe(assertions[index].value.type);
      expect(candidate.normalizedValue).toEqual(assertions[index].value.value);
      expect(candidate.normalizedValue).not.toEqual(assertions[index].value);
      expect(candidate.rawValue).toEqual(assertions[index].value);
      expect(candidate.unit).toBe(assertions[index].unit);
      expect(candidate.assertionBasis).toBe('source_stated');
      expect(candidate.confidence).toBe('0.9000');
      expect(candidate.fingerprint).toBe(ingestionFingerprint({ domain: 'source',
        fieldPath: assertions[index].destination, value: assertions[index].value,
        unit: assertions[index].unit }));
      expect(candidate.evidence).toEqual([expect.objectContaining({
        pageNumber: 1, snippet: 'Synthetic support', sectionLabel: null,
        extractionMethod: 'provider_text', extractionVersion: 'synthetic-v1', ordinal: 0,
      })]);
      expect(candidate.evidence[0]).not.toHaveProperty('boundingBox');
    }
    expect(output).toEqual(snapshot);
  });

  it('omits an absent bounding box so the RPC projects SQL NULL instead of JSON null', () => {
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'document.title', value: { type: 'text', value: 'Synthetic' }, unit: 'NONE',
      assertionBasis: 'source_stated', confidence: null,
      evidence: [{ pageNumber: 1, snippet: 'Synthetic support' }],
    }] }, extractionVersion: 'synthetic-v1', idFactory: () => '00000000-0000-4000-8000-000000000001' });

    const serialized = JSON.parse(JSON.stringify(candidates)) as typeof candidates;
    const oldRepresentation = { ...serialized[0].evidence[0], boundingBox: null };
    expect(candidates[0].evidence[0]).not.toHaveProperty('boundingBox');
    expect(serialized[0].evidence[0]).not.toHaveProperty('boundingBox');
    expect(evidenceBoundingBoxCheck(oldRepresentation)).toBe(false);
    expect(evidenceBoundingBoxCheck(serialized[0].evidence[0])).toBe(true);
  });

  it('preserves a validated bounding-box object and all coordinate strings', () => {
    const boundingBox = { x: '0', y: '0.25', width: '0.5', height: '0.75' };
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'document.title', value: { type: 'text', value: 'Synthetic' }, unit: 'NONE',
      assertionBasis: 'visual_inference', confidence: '0', evidence: [{ pageNumber: 1, boundingBox }],
    }] }, extractionVersion: 'synthetic-v1', idFactory: () => '00000000-0000-4000-8000-000000000001' });

    expect(candidates[0].evidence[0]).toMatchObject({
      pageNumber: 1, snippet: null, boundingBox, sectionLabel: null,
      extractionMethod: 'provider_visual', extractionVersion: 'synthetic-v1', ordinal: 0,
    });
    expect(JSON.parse(JSON.stringify(candidates))[0].evidence[0].boundingBox).toEqual(boundingBox);
  });

  it('preserves intentional candidate JSON null while omitting only an absent bounding box', () => {
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'document.title', value: { type: 'json', value: null }, unit: 'NONE',
      assertionBasis: 'visual_inference', confidence: null,
      evidence: [{ pageNumber: 1, boundingBox: { x: '0', y: '0', width: '1', height: '1' } }],
    }] }, extractionVersion: 'synthetic-v1', idFactory: () => '00000000-0000-4000-8000-000000000001' });

    const serialized = JSON.parse(JSON.stringify(candidates)) as typeof candidates;
    expect(serialized[0]).toHaveProperty('normalizedValue', null);
    expect(serialized[0].rawValue).toEqual({ type: 'json', value: null });
    expect(serialized[0].evidence[0]).toMatchObject({ pageNumber: 1, snippet: null, sectionLabel: null });
  });

  it('keeps evidence nested under its candidate with deterministic IDs and fingerprints', () => {
    const assertion = {
      destination: 'document.title', value: { type: 'text', value: 'Synthetic' } as const, unit: 'NONE' as const,
      assertionBasis: 'source_stated' as const, confidence: null,
      evidence: [{ pageNumber: 1, snippet: 'First' }, { pageNumber: 2, snippet: 'Second' }],
    };
    let sequence = 0;
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [assertion] },
      extractionVersion: 'synthetic-v1',
      idFactory: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` });
    const remapped = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [assertion] },
      extractionVersion: 'synthetic-v1', idFactory: () => crypto.randomUUID() });

    expect(candidates[0].id).toBe('00000000-0000-4000-8000-000000000001');
    expect(candidates[0].evidence.map(item => item.id)).toEqual([
      '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003',
    ]);
    expect(candidates[0].evidence.map(item => item.ordinal)).toEqual([0, 1]);
    expect(remapped[0].fingerprint).toBe(candidates[0].fingerprint);
  });

  it.each([undefined, null])('rejects a %s evidence page before mapping', pageNumber => {
    expect(() => parseExtractionProviderOutput({ schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'document.title', value: { type: 'text', value: 'Synthetic' }, unit: 'NONE',
      assertionBasis: 'source_stated', confidence: null,
      evidence: [{ pageNumber, snippet: 'Synthetic support' }],
    }] }, 1)).toThrow(expect.objectContaining({ kind: 'provider_invalid_output' }));
  });

  it.each([
    [{ type: 'decimal', value: '1.25' }, '1.25'],
    [{ type: 'decimal', value: '0' }, '0'],
    [{ type: 'integer', value: '25000' }, '25000'],
    [{ type: 'integer', value: '0' }, '0'],
    [{ type: 'date', value: '2026-08-24' }, '2026-08-24'],
    [{ type: 'text', value: 'Synthetic' }, 'Synthetic'],
    [{ type: 'enum', value: 'synthetic' }, 'synthetic'],
    [{ type: 'boolean', value: true }, true],
    [{ type: 'boolean', value: false }, false],
    [{ type: 'json', value: null }, null],
    [{ type: 'json', value: 'primitive' }, 'primitive'],
    [{ type: 'json', value: [1, false, null] }, [1, false, null]],
    [{ type: 'json', value: { synthetic: ['value'] } }, { synthetic: ['value'] }],
    [{ type: 'json', value: { nested: { array: [0, false, null] } } }, { nested: { array: [0, false, null] } }],
  ] satisfies Array<[CandidateValue, unknown]>)('maps typed value %j to its persistence scalar', (value, scalar) => {
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'document.title', value, unit: 'NONE', assertionBasis: 'source_stated', confidence: null,
      evidence: [{ pageNumber: 1, snippet: 'Synthetic support' }],
    }] }, extractionVersion: 'synthetic-v1', idFactory: () => '00000000-0000-4000-8000-000000000001' });
    expect(candidates[0].normalizedValue).toEqual(scalar);
  });

  it.each([
    { type: 'decimal', value: '' },
    { type: 'integer', value: '' },
    { type: 'date', value: '' },
    { type: 'text', value: '' },
    { type: 'enum', value: '' },
    { type: 'boolean', value: null },
    { type: 'decimal', value: undefined },
    { type: 'json', value: null },
  ])('cannot receive invalid or unsupported provider value %j through the real validator', value => {
    expect(() => parseExtractionProviderOutput({ schemaVersion: 'land-flyer-v1', assertions: [{
      destination: 'pricing.askingPrice', value, unit: 'USD', assertionBasis: 'source_stated', confidence: null,
      evidence: [{ pageNumber: 1, snippet: 'Synthetic support' }],
    }] }, 1)).toThrow(expect.objectContaining({ kind: 'provider_invalid_output' }));
  });
});

function valueFor(type: CandidateValueType): CandidateValue {
  if (type === 'boolean') return { type, value: true };
  if (type === 'json') return { type, value: { synthetic: true } };
  if (type === 'integer') return { type, value: '25000' };
  if (type === 'decimal') return { type, value: '1.25' };
  if (type === 'date') return { type, value: '2026-08-24' };
  if (type === 'enum') return { type, value: 'synthetic' };
  return { type: 'text', value: 'Synthetic' };
}

function evidenceBoundingBoxCheck(evidence: { boundingBox?: unknown }): boolean {
  if (!Object.hasOwn(evidence, 'boundingBox')) return true;
  return Boolean(evidence.boundingBox && typeof evidence.boundingBox === 'object' && !Array.isArray(evidence.boundingBox));
}
