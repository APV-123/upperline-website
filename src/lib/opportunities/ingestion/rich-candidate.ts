import { IngestionValidationError } from './validation';

export const TRAFFIC_COUNT_KIND = 'traffic_count' as const;
export const TRAFFIC_COUNT_SCHEMA_VERSION = 1 as const;
export const TRAFFIC_BASIS_LITERALS = Object.freeze({
  VPD: 'VPD',
  ADT: 'ADT',
  'Average Daily Traffic': 'ADT',
  AADT: 'AADT',
  'Average Annual Daily Traffic': 'AADT',
} as const);

export type TrafficBasis = 'VPD' | 'ADT' | 'AADT' | 'unknown';
export type TrafficMeasurementTime = {
  role: 'measurement'; precision: 'year' | 'month' | 'day' | 'unknown';
  year: number | null; month: number | null; day: number | null;
};
export type TrafficCountPropositionV1 = {
  kind: typeof TRAFFIC_COUNT_KIND;
  schemaVersion: typeof TRAFFIC_COUNT_SCHEMA_VERSION;
  count: number;
  unit: 'vehicles_per_day';
  basis: { normalized: TrafficBasis; sourceLiteral: string | null };
  roadway: { sourceLiteral: string } | null;
  countLocation: string | null;
  direction: string | null;
  measurementTime: TrafficMeasurementTime;
};

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const BASIS = new Set<TrafficBasis>(['VPD', 'ADT', 'AADT', 'unknown']);
const PRECISION = new Set(['year', 'month', 'day', 'unknown']);

export function parseTrafficCountProposition(value: unknown): TrafficCountPropositionV1 {
  const record = exact(value, ['kind', 'schemaVersion', 'count', 'unit', 'basis', 'roadway', 'countLocation', 'direction', 'measurementTime'], 'traffic proposition');
  if (record.kind !== TRAFFIC_COUNT_KIND || record.schemaVersion !== TRAFFIC_COUNT_SCHEMA_VERSION) invalid('traffic proposition kind/version is invalid');
  if (!Number.isSafeInteger(record.count) || (record.count as number) <= 0) invalid('traffic count must be a positive integer');
  if (record.unit !== 'vehicles_per_day') invalid('traffic unit is invalid');
  const basisRecord = exact(record.basis, ['normalized', 'sourceLiteral'], 'traffic basis');
  if (typeof basisRecord.normalized !== 'string' || !BASIS.has(basisRecord.normalized as TrafficBasis)) invalid('traffic basis is invalid');
  const sourceLiteral = nullableText(basisRecord.sourceLiteral, 120, 'traffic basis source literal');
  const normalized = basisRecord.normalized as TrafficBasis;
  if (normalized !== 'unknown') {
    if (sourceLiteral === null || TRAFFIC_BASIS_LITERALS[sourceLiteral as keyof typeof TRAFFIC_BASIS_LITERALS] !== normalized) invalid('traffic basis literal does not map to its controlled value');
  } else if (sourceLiteral !== null && sourceLiteral in TRAFFIC_BASIS_LITERALS) invalid('recognized traffic basis literal cannot be normalized as unknown');
  let roadway: { sourceLiteral: string } | null = null;
  if (record.roadway !== null) {
    const road = exact(record.roadway, ['sourceLiteral'], 'traffic roadway');
    roadway = { sourceLiteral: requiredText(road.sourceLiteral, 300, 'traffic roadway source literal') };
  }
  const countLocation = nullableText(record.countLocation, 300, 'traffic count location');
  const direction = nullableText(record.direction, 120, 'traffic direction');
  const time = exact(record.measurementTime, ['role', 'precision', 'year', 'month', 'day'], 'traffic measurement time');
  if (time.role !== 'measurement' || typeof time.precision !== 'string' || !PRECISION.has(time.precision)) invalid('traffic measurement time is invalid');
  const precision = time.precision as TrafficMeasurementTime['precision'];
  const year = nullableInteger(time.year, 'traffic year'); const month = nullableInteger(time.month, 'traffic month'); const day = nullableInteger(time.day, 'traffic day');
  if (precision === 'unknown' && (year !== null || month !== null || day !== null)) invalid('unknown traffic time cannot contain date parts');
  if (precision === 'year' && (!(year && year >= 1800 && year <= 2200) || month !== null || day !== null)) invalid('traffic year precision is invalid');
  if (precision === 'month' && (!(year && year >= 1800 && year <= 2200) || !(month && month >= 1 && month <= 12) || day !== null)) invalid('traffic month precision is invalid');
  if (precision === 'day' && (!(year && year >= 1800 && year <= 2200) || !(month && month >= 1 && month <= 12) || !(day && validDay(year, month, day)))) invalid('traffic day precision is invalid');
  return { kind: TRAFFIC_COUNT_KIND, schemaVersion: TRAFFIC_COUNT_SCHEMA_VERSION, count: record.count as number, unit: 'vehicles_per_day', basis: { normalized, sourceLiteral }, roadway, countLocation, direction, measurementTime: { role: 'measurement', precision, year, month, day } };
}

export function canonicalizeRichCandidate(value: TrafficCountPropositionV1): string { return canonical(value); }

export function isTrafficCountProposition(value: unknown): value is TrafficCountPropositionV1 {
  try { parseTrafficCountProposition(value); return true; } catch { return false; }
}

function exact(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(`${label} must be an object`);
  const record = value as Record<string, unknown>; const allowed = new Set(keys);
  if (Object.keys(record).some(key => !allowed.has(key)) || keys.some(key => !(key in record))) invalid(`${label} properties are invalid`);
  return record;
}
function requiredText(value: unknown, maximum: number, label: string): string { const result = nullableText(value, maximum, label); if (result === null) invalid(`${label} is required`); return result; }
function nullableText(value: unknown, maximum: number, label: string): string | null { if (value === null) return null; if (typeof value !== 'string') invalid(`${label} must be text or null`); const original=value as string; if(original!==original.trim()) invalid(`${label} is invalid`); const text=original.normalize('NFC'); if (!text || Array.from(text).length>maximum || CONTROL.test(text)) invalid(`${label} is invalid`); return text; }
function nullableInteger(value: unknown, label: string): number | null { if (value === null) return null; if (!Number.isSafeInteger(value)) invalid(`${label} must be an integer or null`); return value as number; }
function validDay(year:number,month:number,day:number){const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;}
function canonical(value: unknown): string { if(value===null||typeof value!=='object')return JSON.stringify(value); if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`; const record=value as Record<string,unknown>; return `{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`; }
function invalid(issue:string):never{throw new IngestionValidationError([issue]);}

// A future demographic_metric can reuse kind/version + typed payload + explicit
// null/unknown dimensions + evidence without sharing traffic-specific vocabulary.
