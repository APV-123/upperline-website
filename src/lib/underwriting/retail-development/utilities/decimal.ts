import Decimal from 'decimal.js';
import type { DecimalInput, DecimalOutput } from '../model/types';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -30, toExpPos: 40 });
export const D = (value: DecimalInput): Decimal => new Decimal(value);
export const out = (value: Decimal): DecimalOutput => value.toString();
export const sum = (values: Decimal[]): Decimal => values.reduce((a, b) => a.plus(b), D(0));
export function finite(value: DecimalInput): boolean { try { return D(value).isFinite(); } catch { return false; } }
