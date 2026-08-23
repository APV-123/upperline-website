import { describe, expect, it } from 'vitest';
import { parseStrictJson, StrictJsonParseError } from './strict-json-parser';

describe('strict duplicate-aware JSON parser', () => {
  it('parses strict JSON without object-key loss', () => {
    expect(parseStrictJson('{"a":[true,false,null,-1.25e2],"b":"safe"}'))
      .toEqual({ a: [true, false, null, -125], b: 'safe' });
  });
  it.each([['root', '{"a":1,"a":2}'], ['nested', '{"a":{"b":1,"b":2}}']])
    ('rejects duplicate keys at %s', (_name, source) => {
      expect(() => parseStrictJson(source)).toThrowError(
        expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'duplicate_key' }));
    });
  it.each(['{"a":1,}', '[1,]', '{/*x*/"a":1}', '{"a":NaN}', '```json\n{}\n```'])
    ('rejects non-standard or repaired JSON: %s', source => {
      expect(() => parseStrictJson(source)).toThrowError(
        expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
    });
  it('rejects excessive nesting and oversized strings', () => {
    expect(() => parseStrictJson('[[[0]]]', { maxDepth: 2 })).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'excessive_nesting' }));
    expect(() => parseStrictJson('{"x":"abcd"}', { maxStringCharacters: 3 })).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'oversized_string' }));
  });
  it('does not allow JSON keys to mutate the result prototype', () => {
    const parsed = parseStrictJson('{"__proto__":{"polluted":true},"constructor":1,"prototype":2}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(parsed).toHaveProperty('__proto__');
    expect(parsed).toMatchObject({ constructor: 1, prototype: 2 });
  });
  it('rejects escaped and Unicode-equivalent duplicate keys', () => {
    expect(() => parseStrictJson('{"a":1,"\\u0061":2}')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'duplicate_key' }));
    expect(() => parseStrictJson('{"😀":1,"\\ud83d\\ude00":2}')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'duplicate_key' }));
  });
  it('accepts valid surrogate pairs and rejects unpaired surrogates', () => {
    expect(parseStrictJson('"\\ud83d\\ude00"')).toBe('😀');
    expect(() => parseStrictJson('"\\ud800"')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
    expect(() => parseStrictJson('"\\udc00"')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
  });
  it('enforces JSON numeric grammar without losing negative zero', () => {
    expect(Object.is(parseStrictJson('-0'), -0)).toBe(true);
    expect(parseStrictJson('1.25e+2')).toBe(125);
    for (const invalid of ['01', '+1', '.1', '1.', '1e', '1e9999']) {
      expect(() => parseStrictJson(invalid)).toThrowError(
        expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
    }
  });
  it('rejects BOM and trailing JSON values', () => {
    expect(() => parseStrictJson('\ufeff{}')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
    expect(() => parseStrictJson('{}{}')).toThrowError(
      expect.objectContaining<Partial<StrictJsonParseError>>({ classification: 'malformed_json' }));
  });
});
