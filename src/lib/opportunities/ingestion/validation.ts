import type { CandidateDestination, CandidateUnit, CandidateValue } from './contracts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_PATH = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;
const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const INTEGER = /^-?(?:0|[1-9]\d*)$/;
const UNITS = new Set<CandidateUnit>(['USD', 'USD_PER_SF', 'USD_PER_SF_YEAR', 'SF',
  'PERCENT_DECIMAL', 'MONTHS', 'DAYS', 'COUNT', 'NONE']);

export class IngestionValidationError extends Error {
  constructor(readonly issues: string[]) { super(issues.join('; ')); this.name = 'IngestionValidationError'; }
}

const calendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export function validateCandidateDestination(value: CandidateDestination): CandidateDestination {
  const issues: string[] = [];
  if (!FIELD_PATH.test(value.fieldPath) || value.fieldPath.includes('[')) issues.push('fieldPath must be canonical dotted application identity');
  if (value.domain === 'tenant' && !UUID.test(value.candidateTenantKey)) issues.push('candidateTenantKey must be a UUID');
  if (issues.length) throw new IngestionValidationError(issues);
  return value;
}

export function validateCandidateValue(value: CandidateValue): CandidateValue {
  const issues: string[] = [];
  if (value.type === 'decimal' && !DECIMAL.test(value.value)) issues.push('decimal must be a canonical string');
  if (value.type === 'integer' && !INTEGER.test(value.value)) issues.push('integer must be a canonical string');
  if (value.type === 'date' && !calendarDate(value.value)) issues.push('date must be a valid ISO calendar date');
  if ((value.type === 'text' || value.type === 'enum') && !value.value.trim()) issues.push(`${value.type} must not be blank`);
  if (issues.length) throw new IngestionValidationError(issues);
  return value;
}

export function validateConfidence(value: string | null): string | null {
  if (value === null) return null;
  if (!/^(?:0(?:\.\d{1,4})?|1(?:\.0{1,4})?)$/.test(value)) throw new IngestionValidationError(['confidence must be an exact decimal from 0 through 1 with at most four fractional digits']);
  return value;
}

export function validateCandidateUnit(value: string | null): CandidateUnit | null {
  if (value === null) return null;
  if (!UNITS.has(value as CandidateUnit)) throw new IngestionValidationError(['unit is unsupported']);
  return value as CandidateUnit;
}
