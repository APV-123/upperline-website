import type { Diagnostic, RetailUnderwritingResult } from '../../underwriting/retail-development';
import type { PersistedRetailUnderwritingInput, PersistedTenantInput, RetailDevelopmentPersistenceEnvelope } from '../underwriting/retail-development-persistence';
import Decimal from 'decimal.js';

export const EMPTY = '—';
type DisplayValue = string | number | null | undefined;
export type EconomicDisplayKind = 'currency' | 'currencyCents' | 'currencyPerSf' | 'percent' | 'multiple' | 'squareFeet' | 'years' | 'decimal';
export type SensitivityTone = 'unavailable' | 'weak' | 'weakMid' | 'neutral' | 'strongMid' | 'strong';
export const SENSITIVITY_AXES = {
  unleveredProfit: { row: 'Rent multiplier', column: 'Exit cap delta' },
  returnOnCost: { row: 'Hard-cost multiplier', column: 'Rent multiplier' },
} as const;
const decimal = (value: DisplayValue): Decimal | null => { if (value === null || value === undefined || value === '') return null; try { return new Decimal(value); } catch { return null; } };
const groupFixed = (value: Decimal, places: number): string => { const fixed=value.toDecimalPlaces(places).toFixed(places); const [integer,fraction]=fixed.split('.'); const sign=integer.startsWith('-')?'-':''; const grouped=`${sign}${integer.replace('-','').replace(/\B(?=(\d{3})+(?!\d))/g,',')}`; return fraction===undefined?grouped:`${grouped}.${fraction}`; };
const groupVariable = (value: Decimal, places: number): string => groupFixed(value,places).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
export function formatCurrency(value: DisplayValue, cents=false): string { const parsed=decimal(value); return parsed===null?EMPTY:`${parsed.isNegative()?'-':''}$${groupFixed(parsed.abs(),cents?2:0)}`; }
export function formatNumber(value: DisplayValue, suffix=''): string { const parsed=decimal(value); return parsed===null?EMPTY:`${groupVariable(parsed,2)}${suffix}`; }
export function formatPercent(value: DisplayValue): string { const parsed=decimal(value); return parsed===null?EMPTY:`${groupFixed(parsed.times(100),2)}%`; }
export function formatMultiple(value: DisplayValue): string { const parsed=decimal(value); return parsed===null?EMPTY:`${groupFixed(parsed,2)}×`; }
export function formatCurrencyPerSf(value: DisplayValue): string { const parsed=decimal(value); return parsed===null?EMPTY:`${formatCurrency(parsed.toString(),true)} / SF`; }
const DETAIL_KINDS:Record<string,EconomicDisplayKind>={landCostPerBuildingSf:'currencyPerSf',hardCostPerBuildingSf:'currencyPerSf',developmentCostPerBuildingSf:'currencyPerSf',netOperatingIncomePerSf:'currencyPerSf',opexCarryOnVacantSpace:'currencyCents',rentalIncomeCollected:'currencyCents',netLeaseUpOperatingCashFlow:'currencyCents',leaseUpOperatingDeficit:'currencyCents',leaseUpOperatingSurplus:'currencyCents',unfundedOperatingDeficit:'currencyCents',exitCapRate:'percent',returnOnCost:'percent',developmentSpread:'percent',unleveredProfitMargin:'percent',annualizedEquityReturn:'percent',equityMultiple:'multiple',investmentPeriodYears:'years'};
export function formatEconomicDetail(field:string,value:DisplayValue):string{const kind=DETAIL_KINDS[field]??'currency';if(kind==='currencyPerSf')return formatCurrencyPerSf(value);if(kind==='percent')return formatPercent(value);if(kind==='multiple')return formatMultiple(value);if(kind==='years'){const parsed=decimal(value);return parsed===null?EMPTY:`${groupVariable(parsed,2)} years`;}if(kind==='squareFeet')return formatNumber(value,' SF');if(kind==='decimal')return formatNumber(value);return formatCurrency(value,kind==='currencyCents');}
export function classifySensitivity(value: string | null, values: Array<string | null>): SensitivityTone {
  const current=decimal(value);if(current===null)return'unavailable';
  const available=values.map(decimal).filter((item):item is Decimal=>item!==null);if(available.length===0)return'unavailable';
  const minimum=Decimal.min(...available),maximum=Decimal.max(...available);if(minimum.eq(maximum))return'neutral';
  const position=current.minus(minimum).dividedBy(maximum.minus(minimum));
  if(position.lte('0.2'))return'weak';if(position.lte('0.4'))return'weakMid';if(position.lt('0.6'))return'neutral';if(position.lt('0.8'))return'strongMid';return'strong';
}
export function isSensitivityBase(baseRowIndex:number,baseColumnIndex:number,rowIndex:number,columnIndex:number):boolean{return rowIndex===baseRowIndex&&columnIndex===baseColumnIndex;}
export class NumericInputValidationError extends Error {
  constructor(readonly field: string, readonly input: string) {
    super(`${field} must be a valid decimal number.`);
    this.name = 'NumericInputValidationError';
  }
}

/** Removes supported display decoration without using binary floating point. */
export function normalizeDecimalInput(value: string, field = 'Value'): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const unsigned = trimmed
    .replace(/^\$(-?)/, '$1')
    .replace(/^(-)\$/, '$1');
  if (!/^-?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(unsigned)) {
    throw new NumericInputValidationError(field, value);
  }
  const canonical = unsigned.replace(/,/g, '');
  try { new Decimal(canonical); } catch { throw new NumericInputValidationError(field, value); }
  return canonical;
}
export function decimalFromDisplay(value: string): string { return normalizeDecimalInput(value); }
export function percentFromDisplay(value: string): string { const normalized = normalizeDecimalInput(value.trim().replace(/%$/, ''), 'Percentage'); if (!normalized) return ''; return new Decimal(normalized).dividedBy(100).toString(); }
export function percentToDisplay(value: string | number): string { try { return new Decimal(value).times(100).toString(); } catch { return String(value); } }
export function createDefaultEnvelope(input?: { askingPrice?: string | null; landAreaSf?: string | null; buildingAreaSf?: string | null }): RetailDevelopmentPersistenceEnvelope {
  const landArea = input?.landAreaSf || '0'; const buildingArea = input?.buildingAreaSf || '0';
  const far = new Decimal(landArea).gt(0) ? new Decimal(buildingArea).dividedBy(landArea).toString() : '0'; const landCost = new Decimal(landArea).gt(0) ? new Decimal(input?.askingPrice || 0).dividedBy(landArea).toString() : '0';
  return { schemaVersion: 'retail-development-persistence-v1', engineInput: { analysisDate: new Date().toISOString().slice(0, 10) as `${number}-${number}-${number}`, site: { landAreaSf: landArea, targetFar: far, landCostPerLandSf: landCost }, development: { hardCostPerBuildingSf: '185', softCostRate: '0.18', contingencyRate: '0.075', developerFeeRate: '0.05' }, leasing: { mode: 'market', rentalRatePerSfYear: '28', annualRentBump: '0.03', leaseTermMonths: 120, freeRentMonths: '4', tenantImprovementPerSf: '35', leasingCommissionRate: '0.05' }, timeline: { closingLagDays: 90, designPermittingMonths: 6, constructionMonths: 12, postCompletionMonths: 12 }, financing: { loanToCost: '0.65', annualInterestRate: '0.075', averageConstructionBalanceRate: '0.55' }, leaseUp: { averageOccupancyRate: '0.5', nnnOperatingExpensesPerSfYear: '8' }, operations: { vacancyCreditLossRate: '0.05', otherIncomePerYear: '0', operatingExpenseRateOfEgi: '0.03' }, disposition: { exitCapRate: '0.0625', costOfSaleRate: '0.02' } } };
}
export function addTenant(input: PersistedRetailUnderwritingInput, tenantKey = crypto.randomUUID()): PersistedRetailUnderwritingInput { const tenants = input.leasing.mode === 'tenantRoster' ? input.leasing.tenants : []; const tenant: PersistedTenantInput = { tenantKey, name: '', useType: '', displayOrder: tenants.length + 1, sizeSf: '0', rentalRatePerSfYear: '0', annualRentBump: '0', leaseCommencementDate: null, leaseTermMonths: 120, freeRentMonths: '0', tenantImprovementPerSf: '0', leasingCommissionRate: '0' }; return { ...input, leasing: { mode: 'tenantRoster', tenants: [...tenants, tenant] } }; }
export function reorderTenants(tenants: PersistedTenantInput[], from: number, to: number): PersistedTenantInput[] { const copy = [...tenants]; const [moved] = copy.splice(from, 1); copy.splice(to, 0, moved); return copy.map((tenant, index) => ({ ...tenant, displayOrder: index + 1 })); }
export function diagnostics(result: RetailUnderwritingResult | null): { errors: Diagnostic[]; warnings: Diagnostic[] } { const values = result?.diagnostics ?? []; return { errors: values.filter((item) => item.severity === 'error'), warnings: values.filter((item) => item.severity === 'warning') }; }
export async function saveThenCalculate<TSaved, TResult>(dirty: boolean, save: () => Promise<TSaved>, calculate: (saved: TSaved | null) => Promise<TResult>): Promise<TResult> { const saved = dirty ? await save() : null; return calculate(saved); }

const normalizeFields = <T extends Record<string, unknown>>(record: T, fields: readonly string[], prefix: string): T => {
  const normalized = { ...record };
  for (const key of fields) {
    const value = normalized[key];
    if (typeof value === 'string') normalized[key as keyof T] = normalizeDecimalInput(value, `${prefix}.${key}`) as T[keyof T];
  }
  return normalized;
};

/** Canonicalizes every Phase 1 decimal field while preserving integers, dates, and tenant identity. */
export function normalizeRetailDevelopmentEnvelope(value: RetailDevelopmentPersistenceEnvelope): RetailDevelopmentPersistenceEnvelope {
  const input = value.engineInput;
  const leasing = input.leasing.mode === 'market'
    ? normalizeFields(input.leasing, ['rentalRatePerSfYear', 'annualRentBump', 'freeRentMonths', 'tenantImprovementPerSf', 'leasingCommissionRate'], 'leasing')
    : { ...input.leasing, tenants: input.leasing.tenants.map((tenant, index) => normalizeFields(tenant,
      ['sizeSf', 'rentalRatePerSfYear', 'annualRentBump', 'freeRentMonths', 'tenantImprovementPerSf', 'leasingCommissionRate'], `leasing.tenants[${index}]`)) };
  return { ...value, engineInput: {
    ...input,
    site: normalizeFields(input.site, ['landAreaSf', 'targetFar', 'landCostPerLandSf'], 'site'),
    development: normalizeFields(input.development, ['hardCostPerBuildingSf', 'softCostRate', 'contingencyRate', 'developerFeeRate'], 'development'),
    leasing,
    financing: normalizeFields(input.financing, ['loanToCost', 'annualInterestRate', 'averageConstructionBalanceRate'], 'financing'),
    leaseUp: normalizeFields(input.leaseUp, ['averageOccupancyRate', 'nnnOperatingExpensesPerSfYear'], 'leaseUp'),
    operations: normalizeFields(input.operations, ['vacancyCreditLossRate', 'otherIncomePerYear', 'operatingExpenseRateOfEgi'], 'operations'),
    disposition: normalizeFields(input.disposition, ['exitCapRate', 'costOfSaleRate'], 'disposition'),
  } };
}
export function createOpportunityRequest(values: { name: string; market?: string; city?: string; state?: string; askingPrice?: string; gla?: string; sourceUrl?: string }) {
  return { opportunity: { name: values.name, address: { market: values.market || '', city: values.city || '', state: values.state || '' }, askingPrice: decimalFromDisplay(values.askingPrice || ''), existingBuildingAreaSf: decimalFromDisplay(values.gla || '') }, sourceUrl: values.sourceUrl || '' };
}
