import type { IsoDate } from '../model/types';

function parse(date: IsoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid ISO date: ${date}`);
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error(`Invalid ISO date: ${date}`);
  return { year, month, day };
}
const format = (date: Date): IsoDate => date.toISOString().slice(0, 10) as IsoDate;
export function addDays(date: IsoDate, days: number): IsoDate { const { year, month, day } = parse(date); return format(new Date(Date.UTC(year, month - 1, day + days))); }
/** Excel EDATE semantics: retain the day or clamp to the target month's final day. */
export function edate(date: IsoDate, months: number): IsoDate {
  if (!Number.isInteger(months)) throw new Error('EDATE months must be an integer');
  const { year, month, day } = parse(date);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return format(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay))));
}
export const compareDates = (a: IsoDate, b: IsoDate): number => a.localeCompare(b);
