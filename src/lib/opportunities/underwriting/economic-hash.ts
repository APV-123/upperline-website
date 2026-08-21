import 'server-only';

import { createHash } from 'node:crypto';
import type { CalculationPolicy, RetailUnderwritingInput } from '../../underwriting/retail-development';

function canonical(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  throw new TypeError('Economic hash input contains an unsupported value.');
}

export function canonicalEconomicHash(
  input: RetailUnderwritingInput,
  policy: CalculationPolicy,
): string {
  return createHash('sha256').update(canonical({ input, policy }), 'utf8').digest('hex');
}
