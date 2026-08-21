export type DecimalInput = string | number;
export type DecimalOutput = string;
export type IsoDate = `${number}-${number}-${number}`;
export type Diagnostic = { code: string; severity: 'error' | 'warning'; path: string; message: string; context?: Record<string, string | number> };

export type MarketLeasingAssumptions = { mode: 'market'; rentalRatePerSfYear: DecimalInput; annualRentBump: DecimalInput; leaseTermMonths: number; freeRentMonths: DecimalInput; tenantImprovementPerSf: DecimalInput; leasingCommissionRate: DecimalInput };
export type TenantInput = { name: string; useType: string; displayOrder: number; sizeSf: DecimalInput; rentalRatePerSfYear: DecimalInput; annualRentBump: DecimalInput; leaseCommencementDate: IsoDate | null; leaseTermMonths: number; freeRentMonths: DecimalInput; tenantImprovementPerSf: DecimalInput; leasingCommissionRate: DecimalInput };
export type TenantRosterLeasingAssumptions = { mode: 'tenantRoster'; tenants: TenantInput[] };

export type RetailUnderwritingInput = {
  analysisDate: IsoDate;
  site: { landAreaSf: DecimalInput; targetFar: DecimalInput; landCostPerLandSf: DecimalInput };
  development: { hardCostPerBuildingSf: DecimalInput; softCostRate: DecimalInput; contingencyRate: DecimalInput; developerFeeRate: DecimalInput };
  leasing: MarketLeasingAssumptions | TenantRosterLeasingAssumptions;
  timeline: { closingLagDays: number; designPermittingMonths: number; constructionMonths: number; postCompletionMonths: number };
  financing: { loanToCost: DecimalInput; annualInterestRate: DecimalInput; averageConstructionBalanceRate: DecimalInput };
  leaseUp: { averageOccupancyRate: DecimalInput; nnnOperatingExpensesPerSfYear: DecimalInput };
  operations: { vacancyCreditLossRate: DecimalInput; otherIncomePerYear: DecimalInput; operatingExpenseRateOfEgi: DecimalInput };
  disposition: { exitCapRate: DecimalInput; costOfSaleRate: DecimalInput };
};

export type CalculationPolicy = { calculationVersion: string; pursueSpread: DecimalInput; reviewSpread: DecimalInput; reconciliationTolerance: DecimalInput };
export type CalculationOptions = { policy?: Partial<CalculationPolicy> };
export type ResolvedLeasingAssumptions = { source: 'market' | 'tenantRoster'; rentalRatePerSfYear: DecimalOutput; annualRentBump: DecimalOutput; leaseTermMonths: number; freeRentMonths: DecimalOutput; tenantImprovementPerSf: DecimalOutput; leasingCommissionRate: DecimalOutput; totalRosterSf: DecimalOutput | null };
export type TenantCalculation = TenantInput & { percentOfGla: DecimalOutput | null; annualBaseRent: DecimalOutput; totalBaseRentOverTerm: DecimalOutput; tenantImprovementTotal: DecimalOutput; leasingCommissionTotal: DecimalOutput; freeRentTotal: DecimalOutput; leaseExpirationDate: IsoDate | null; cumulativeSf: DecimalOutput; cumulativePercentOfGla: DecimalOutput | null };
export type LeaseUpSchedulePeriod = { label: string; periodStart: IsoDate | null; periodEndExclusive: IsoDate | null; newSf: DecimalOutput; cumulativeSf: DecimalOutput; cumulativePercentOfGla: DecimalOutput | null; newAnnualBaseRent: DecimalOutput; cumulativeAnnualBaseRent: DecimalOutput };
export type SensitivityMatrix = { rowValues: DecimalOutput[]; columnValues: DecimalOutput[]; cells: Array<Array<DecimalOutput | null>>; baseRowIndex: number; baseColumnIndex: number };

export type RetailUnderwritingResult = {
  calculationVersion: string; complete: boolean;
  geometry: null | { landAreaAcres: DecimalOutput; buildingAreaSf: DecimalOutput };
  resolvedLeasing: ResolvedLeasingAssumptions | null; tenants: TenantCalculation[];
  developmentCosts: null | Record<string, DecimalOutput | null>; timeline: null | Record<string, IsoDate>;
  financing: null | Record<string, DecimalOutput | null>; leaseUpEconomics: null | Record<string, DecimalOutput | null>;
  sourcesAndUses: null | Record<string, DecimalOutput | null>; stabilizedOperations: null | Record<string, DecimalOutput | null>;
  disposition: null | Record<string, DecimalOutput | null>; unleveredReturns: null | Record<string, DecimalOutput | null>;
  equityReturns: null | Record<string, DecimalOutput | null>;
  opportunityScreen: 'PASS' | 'REVIEW' | 'PURSUE' | null;
  leaseUpSchedule: LeaseUpSchedulePeriod[];
  sensitivities: null | { unleveredProfitByRentAndExitCap: SensitivityMatrix; returnOnCostByHardCostAndRent: SensitivityMatrix };
  diagnostics: Diagnostic[];
};
