import Decimal from 'decimal.js';
import type { CalculationOptions, Diagnostic, IsoDate, LeaseUpSchedulePeriod, ResolvedLeasingAssumptions, RetailUnderwritingInput, RetailUnderwritingResult, SensitivityMatrix, TenantCalculation, TenantInput } from '../model/types';
import { resolvePolicy } from '../policies/calculation-policy';
import { validateInput } from '../validation/validate';
import { D, out, sum } from '../utilities/decimal';
import { addDays, compareDates, edate } from '../utilities/dates';

const ZERO = D(0); const TWELVE = D(12); const ACRE_SF = D(43560);
const record = (values: Record<string, Decimal>): Record<string, string> => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, out(value)]));
const ratio = (numerator: Decimal, denominator: Decimal): Decimal | null => denominator.isZero() ? null : numerator.div(denominator);

export function totalBaseRent(annualBaseRent: Decimal, annualBump: Decimal, leaseTermMonths: number): Decimal {
  const years = D(leaseTermMonths).div(TWELVE);
  return annualBump.isZero() ? annualBaseRent.times(years) : annualBaseRent.times(D(1).plus(annualBump).pow(years).minus(1).div(annualBump));
}

function tenantRows(tenants: TenantInput[], gla: Decimal): TenantCalculation[] {
  let cumulative = ZERO;
  return [...tenants].sort((a, b) => a.displayOrder - b.displayOrder).map((tenant) => {
    const size = D(tenant.sizeSf); const annualRent = size.times(tenant.rentalRatePerSfYear); const termRent = totalBaseRent(annualRent, D(tenant.annualRentBump), tenant.leaseTermMonths);
    cumulative = cumulative.plus(size);
    return { ...tenant, percentOfGla: ratio(size, gla)?.toString() ?? null, annualBaseRent: out(annualRent), totalBaseRentOverTerm: out(termRent), tenantImprovementTotal: out(size.times(tenant.tenantImprovementPerSf)), leasingCommissionTotal: out(termRent.times(tenant.leasingCommissionRate)), freeRentTotal: out(annualRent.times(tenant.freeRentMonths).div(TWELVE)), leaseExpirationDate: tenant.leaseCommencementDate ? edate(tenant.leaseCommencementDate, tenant.leaseTermMonths) : null, cumulativeSf: out(cumulative), cumulativePercentOfGla: ratio(cumulative, gla)?.toString() ?? null };
  });
}

function resolveLeasing(input: RetailUnderwritingInput, rows: TenantCalculation[]): ResolvedLeasingAssumptions | null {
  if (input.leasing.mode === 'market') return { source: 'market', rentalRatePerSfYear: out(D(input.leasing.rentalRatePerSfYear)), annualRentBump: out(D(input.leasing.annualRentBump)), leaseTermMonths: input.leasing.leaseTermMonths, freeRentMonths: out(D(input.leasing.freeRentMonths)), tenantImprovementPerSf: out(D(input.leasing.tenantImprovementPerSf)), leasingCommissionRate: out(D(input.leasing.leasingCommissionRate)), totalRosterSf: null };
  const totalSf = sum(rows.map((row) => D(row.sizeSf))); if (totalSf.isZero()) return null;
  const weighted = (selector: (tenant: TenantInput) => Decimal) => sum(input.leasing.mode === 'tenantRoster' ? input.leasing.tenants.map((tenant) => D(tenant.sizeSf).times(selector(tenant))) : []).div(totalSf);
  const weightedMonths = weighted((tenant) => D(tenant.leaseTermMonths));
  return { source: 'tenantRoster', rentalRatePerSfYear: out(weighted((t) => D(t.rentalRatePerSfYear))), annualRentBump: out(weighted((t) => D(t.annualRentBump))), leaseTermMonths: weightedMonths.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(), freeRentMonths: out(weighted((t) => D(t.freeRentMonths))), tenantImprovementPerSf: out(weighted((t) => D(t.tenantImprovementPerSf))), leasingCommissionRate: out(weighted((t) => D(t.leasingCommissionRate))), totalRosterSf: out(totalSf) };
}

function schedule(rows: TenantCalculation[], gla: Decimal, start: IsoDate, diagnostics: Diagnostic[], tolerance: Decimal): LeaseUpSchedulePeriod[] {
  let cumulativeSf = ZERO; let cumulativeRent = ZERO; const periods: LeaseUpSchedulePeriod[] = [];
  for (let year = 1; year <= 5; year += 1) {
    const periodStart = edate(start, 12 * (year - 1)); const periodEnd = edate(start, 12 * year);
    const selected = rows.filter((row) => row.leaseCommencementDate && compareDates(row.leaseCommencementDate, periodStart) >= 0 && compareDates(row.leaseCommencementDate, periodEnd) < 0);
    const newSf = sum(selected.map((row) => D(row.sizeSf))); const newRent = sum(selected.map((row) => D(row.annualBaseRent))); cumulativeSf = cumulativeSf.plus(newSf); cumulativeRent = cumulativeRent.plus(newRent);
    periods.push({ label: `Year ${year}`, periodStart, periodEndExclusive: periodEnd, newSf: out(newSf), cumulativeSf: out(cumulativeSf), cumulativePercentOfGla: ratio(cumulativeSf, gla)?.toString() ?? null, newAnnualBaseRent: out(newRent), cumulativeAnnualBaseRent: out(cumulativeRent) });
  }
  const boundary = edate(start, 60); const beyondRows = rows.filter((row) => row.leaseCommencementDate && compareDates(row.leaseCommencementDate, boundary) >= 0); const unscheduledRows = rows.filter((row) => !row.leaseCommencementDate);
  for (const [label, selected] of [['Beyond Year 5', beyondRows], ['Unscheduled', unscheduledRows]] as const) {
    const newSf = sum(selected.map((row) => D(row.sizeSf))); const newRent = sum(selected.map((row) => D(row.annualBaseRent))); cumulativeSf = cumulativeSf.plus(newSf); cumulativeRent = cumulativeRent.plus(newRent);
    periods.push({ label, periodStart: label === 'Beyond Year 5' ? boundary : null, periodEndExclusive: null, newSf: out(newSf), cumulativeSf: out(cumulativeSf), cumulativePercentOfGla: ratio(cumulativeSf, gla)?.toString() ?? null, newAnnualBaseRent: out(newRent), cumulativeAnnualBaseRent: out(cumulativeRent) });
  }
  const rosterSf = sum(rows.map((row) => D(row.sizeSf))); if (cumulativeSf.minus(rosterSf).abs().gt(tolerance)) diagnostics.push({ code: 'LEASE_UP_SCHEDULE_RECONCILIATION_FAILURE', severity: 'error', path: 'leaseUpSchedule', message: 'Scheduled and catch-all SF do not reconcile to roster SF.' });
  return periods;
}

type InternalResult = RetailUnderwritingResult & { _rent?: Decimal; _hardCost?: Decimal; _exitCap?: Decimal };
function core(input: RetailUnderwritingInput, options?: CalculationOptions): InternalResult {
  const policy = resolvePolicy(options); const diagnostics = validateInput(input);
  const blank: InternalResult = { calculationVersion: policy.calculationVersion, complete: false, geometry: null, resolvedLeasing: null, tenants: [], developmentCosts: null, timeline: null, financing: null, leaseUpEconomics: null, sourcesAndUses: null, stabilizedOperations: null, disposition: null, unleveredReturns: null, equityReturns: null, opportunityScreen: null, leaseUpSchedule: [], sensitivities: null, diagnostics };
  if (diagnostics.some((item) => item.severity === 'error')) return blank;
  try {
    const landSf = D(input.site.landAreaSf); const gla = landSf.times(input.site.targetFar); const rows = tenantRows(input.leasing.mode === 'tenantRoster' ? input.leasing.tenants : [], gla); const leasing = resolveLeasing(input, rows);
    if (!leasing) return { ...blank, tenants: rows, diagnostics: [...diagnostics, { code: 'INCOMPLETE_LEASING_ASSUMPTIONS', severity: 'error', path: 'leasing', message: 'Authoritative leasing assumptions could not be resolved.' }] };
    if (gla.isZero()) diagnostics.push({ code: 'ZERO_GLA', severity: 'warning', path: 'geometry.buildingAreaSf', message: 'GLA is zero; per-SF and ratio outputs are unavailable.' });
    if (input.leasing.mode === 'tenantRoster') { const rosterSf = D(leasing.totalRosterSf!); if (rosterSf.lt(gla)) diagnostics.push({ code: 'TENANT_SF_BELOW_GLA', severity: 'warning', path: 'leasing.tenants', message: 'Prospective tenant SF is below building GLA.' }); if (rosterSf.gt(gla)) diagnostics.push({ code: 'TENANT_SF_ABOVE_GLA', severity: 'warning', path: 'leasing.tenants', message: 'Prospective tenant SF is above building GLA.' }); }
    const rent = D(leasing.rentalRatePerSfYear); const bump = D(leasing.annualRentBump); const landCost = landSf.times(input.site.landCostPerLandSf); const hardCost = gla.times(input.development.hardCostPerBuildingSf); const softCost = hardCost.times(input.development.softCostRate); const contingency = hardCost.plus(softCost).times(input.development.contingencyRate);
    const weightedTermRent = totalBaseRent(gla.times(rent), bump, leasing.leaseTermMonths); const weightedTi = gla.times(leasing.tenantImprovementPerSf); const weightedLc = weightedTermRent.times(leasing.leasingCommissionRate); const weightedFreeRent = gla.times(rent).times(leasing.freeRentMonths).div(TWELVE);
    const rosterTi = sum(rows.map((row) => D(row.tenantImprovementTotal))); const rosterLc = sum(rows.map((row) => D(row.leasingCommissionTotal))); const rosterFreeRent = sum(rows.map((row) => D(row.freeRentTotal))); const rosterTermRent = sum(rows.map((row) => D(row.totalBaseRentOverTerm)));
    const ti = input.leasing.mode === 'tenantRoster' ? rosterTi : weightedTi; const lc = input.leasing.mode === 'tenantRoster' ? rosterLc : weightedLc; const freeRent = input.leasing.mode === 'tenantRoster' ? rosterFreeRent : weightedFreeRent; const authoritativeTermRent = input.leasing.mode === 'tenantRoster' ? rosterTermRent : weightedTermRent;
    const subtotal = sum([landCost, hardCost, softCost, contingency, ti, lc, freeRent]); const developerFee = subtotal.times(input.development.developerFeeRate); const developmentCost = subtotal.plus(developerFee);
    const closingDate = addDays(input.analysisDate, input.timeline.closingLagDays); const constructionStart = edate(closingDate, input.timeline.designPermittingMonths); const completion = edate(constructionStart, input.timeline.constructionMonths); const saleDate = edate(completion, input.timeline.postCompletionMonths);
    const loan = developmentCost.times(input.financing.loanToCost); const baseEquity = developmentCost.minus(loan); const designInterest = landCost.times(input.financing.loanToCost).times(input.financing.annualInterestRate).times(D(input.timeline.designPermittingMonths).div(TWELVE)); const constructionInterest = loan.times(input.financing.annualInterestRate).times(input.financing.averageConstructionBalanceRate).times(D(input.timeline.constructionMonths).div(TWELVE)); const postInterest = loan.times(input.financing.annualInterestRate).times(D(input.timeline.postCompletionMonths).div(TWELVE)); const totalInterest = sum([designInterest, constructionInterest, postInterest]);
    const leaseUpYears = D(input.timeline.postCompletionMonths).div(TWELVE); const opexCarry = gla.times(D(1).minus(input.leaseUp.averageOccupancyRate)).times(input.leaseUp.nnnOperatingExpensesPerSfYear).times(leaseUpYears); const leaseUpRent = gla.times(input.leaseUp.averageOccupancyRate).times(rent).times(leaseUpYears); const netLeaseUpOperatingCashFlow = leaseUpRent.minus(opexCarry); const operatingDeficit = Decimal.max(ZERO, netLeaseUpOperatingCashFlow.neg()); const operatingSurplus = Decimal.max(ZERO, netLeaseUpOperatingCashFlow);
    const grossProjectUses = developmentCost.plus(totalInterest).plus(operatingDeficit); const grossEquityFunding = grossProjectUses.minus(loan); const netEquityInvested = grossEquityFunding.minus(operatingSurplus); const financingCostEquity = totalInterest; const tolerance = D(policy.reconciliationTolerance);
    if (loan.plus(grossEquityFunding).minus(grossProjectUses).abs().gt(tolerance) || loan.plus(netEquityInvested).plus(operatingSurplus).minus(grossProjectUses).abs().gt(tolerance)) diagnostics.push({ code: 'SOURCES_AND_USES_RECONCILIATION_FAILURE', severity: 'error', path: 'sourcesAndUses', message: 'Debt, equity, and lease-up operating surplus do not reconcile to gross project uses.' });
    const gpr = gla.times(rent); const vacancyLoss = gpr.times(input.operations.vacancyCreditLossRate); const effectiveRentalIncome = gpr.minus(vacancyLoss); const egi = effectiveRentalIncome.plus(input.operations.otherIncomePerYear); const operatingExpenses = egi.times(input.operations.operatingExpenseRateOfEgi); const noi = egi.minus(operatingExpenses);
    if (noi.isNegative()) diagnostics.push({ code: 'NEGATIVE_NOI', severity: 'warning', path: 'stabilizedOperations.netOperatingIncome', message: 'Stabilized NOI is negative.' });
    const returnOnCost = ratio(noi, developmentCost); const exitCap = D(input.disposition.exitCapRate); const grossSale = noi.div(exitCap); const saleCost = grossSale.times(input.disposition.costOfSaleRate); const netSale = grossSale.minus(saleCost); const unleveredProfit = netSale.minus(developmentCost); const profitMargin = ratio(unleveredProfit, developmentCost); const spread = returnOnCost?.minus(exitCap) ?? null;
    if (spread?.isNegative()) diagnostics.push({ code: 'NEGATIVE_DEVELOPMENT_SPREAD', severity: 'warning', path: 'unleveredReturns.developmentSpread', message: 'Development spread is negative.' });
    const screen = spread === null ? null : spread.gte(policy.pursueSpread) ? 'PURSUE' : spread.gte(policy.reviewSpread) ? 'REVIEW' : 'PASS';
    const netCashToEquity = netSale.minus(loan); const equityProfit = netCashToEquity.minus(netEquityInvested); const equityMultiple = ratio(netCashToEquity, netEquityInvested); const years = D(input.timeline.designPermittingMonths + input.timeline.constructionMonths + input.timeline.postCompletionMonths).div(TWELVE); let annualized: Decimal | null = null;
    if (equityMultiple && equityMultiple.gt(0) && years.gt(0)) annualized = equityMultiple.pow(D(1).div(years)).minus(1); else diagnostics.push({ code: 'UNDEFINED_ANNUALIZED_EQUITY_RETURN', severity: 'warning', path: 'equityReturns.annualizedEquityReturn', message: 'Annualized equity return requires positive equity multiple and investment period.' });
    const leaseSchedule = input.leasing.mode === 'tenantRoster' ? schedule(rows, gla, completion, diagnostics, tolerance) : [];
    if (input.leasing.mode === 'tenantRoster') {
      if (weightedLc.minus(rosterLc).abs().gt(tolerance) || weightedTi.minus(rosterTi).abs().gt(tolerance) || weightedFreeRent.minus(rosterFreeRent).abs().gt(tolerance)) diagnostics.push({ code: 'WEIGHTED_ASSUMPTION_COST_DIFFERENCE', severity: 'warning', path: 'resolvedLeasing', message: 'Descriptive weighted-assumption costs differ from authoritative tenant-row totals.', context: { weightedTi: out(weightedTi), rosterTi: out(rosterTi), weightedLc: out(weightedLc), rosterLc: out(rosterLc), weightedFreeRent: out(weightedFreeRent), rosterFreeRent: out(rosterFreeRent) } });
      const scheduledAfter = rows.filter((row) => row.leaseCommencementDate && compareDates(row.leaseCommencementDate, saleDate) > 0); const unscheduled = rows.filter((row) => !row.leaseCommencementDate); const scheduledBySaleSf = sum(rows.filter((row) => row.leaseCommencementDate && compareDates(row.leaseCommencementDate, saleDate) <= 0).map((row) => D(row.sizeSf))); const afterSf = sum(scheduledAfter.map((row) => D(row.sizeSf))); const unscheduledSf = sum(unscheduled.map((row) => D(row.sizeSf)));
      if (scheduledAfter.length > 0) diagnostics.push({ code: 'TENANT_COMMENCEMENT_AFTER_STABILIZATION', severity: 'warning', path: 'leasing.tenants', message: 'One or more tenants commence after the modeled stabilization/sale date.', context: { affectedTenantCount: scheduledAfter.length, affectedSf: out(afterSf), affectedPercentOfGla: ratio(afterSf, gla)?.toString() ?? '0', stabilizationSaleDate: saleDate } });
      if (unscheduledSf.gt(0)) diagnostics.push({ code: 'UNSCHEDULED_SF_AT_STABILIZATION', severity: 'warning', path: 'leasing.tenants', message: 'Tenant roster SF without a commencement date is not scheduled by stabilization.', context: { unscheduledSf: out(unscheduledSf), unscheduledPercentOfGla: ratio(unscheduledSf, gla)?.toString() ?? '0' } });
      if (scheduledBySaleSf.lt(gla)) diagnostics.push({ code: 'ROSTER_NOT_FULLY_SCHEDULED_AT_STABILIZATION', severity: 'warning', path: 'leasing.tenants', message: 'Scheduled tenant SF at stabilization is below building GLA while valuation still uses stabilized NOI.', context: { buildingGla: out(gla), scheduledByStabilizationSf: out(scheduledBySaleSf), scheduledByStabilizationPercentOfGla: ratio(scheduledBySaleSf, gla)?.toString() ?? '0', scheduledAfterStabilizationSf: out(afterSf), unscheduledSf: out(unscheduledSf), stabilizationSaleDate: saleDate } });
    }
    const perSf = (value: Decimal) => ratio(value, gla)?.toString() ?? null;
    return { calculationVersion: policy.calculationVersion, complete: !diagnostics.some((item) => item.severity === 'error'), geometry: { landAreaAcres: out(landSf.div(ACRE_SF)), buildingAreaSf: out(gla) }, resolvedLeasing: leasing, tenants: rows,
      developmentCosts: { ...record({ landCost, hardCost, softCost, contingency, tenantImprovements: ti, headlineTotalBaseRent: authoritativeTermRent, leasingCommissions: lc, freeRentCost: freeRent, subtotalBeforeDeveloperFee: subtotal, developerFee, developmentCostBeforeFinancing: developmentCost }), landCostPerBuildingSf: perSf(landCost), hardCostPerBuildingSf: perSf(hardCost), developmentCostPerBuildingSf: perSf(developmentCost) },
      timeline: { closingDate, designPermittingStart: closingDate, constructionStart, constructionCompletion: completion, projectedStabilizationSaleDate: saleDate },
      financing: record({ constructionLoanPrincipal: loan, baseDevelopmentEquity: baseEquity, designPeriodInterest: designInterest, constructionPeriodInterest: constructionInterest, postCompletionInterest: postInterest, totalInterimInterest: totalInterest, outstandingLoanPrincipalAtSale: loan }),
      leaseUpEconomics: record({ opexCarryOnVacantSpace: opexCarry, rentalIncomeCollected: leaseUpRent, netLeaseUpOperatingCashFlow, leaseUpOperatingDeficit: operatingDeficit, leaseUpOperatingSurplus: operatingSurplus, unfundedOperatingDeficit: operatingDeficit }),
      sourcesAndUses: record({ developmentCostBeforeFinancing: developmentCost, interimFinancingInterest: totalInterest, leaseUpOperatingDeficitFunding: operatingDeficit, grossProjectUses, totalProjectUses: grossProjectUses, debtFunding: loan, baseDevelopmentEquity: baseEquity, financingCostEquity, leaseUpDeficitEquity: operatingDeficit, grossEquityFundingRequirement: grossEquityFunding, leaseUpOperatingSurplus: operatingSurplus, netEquityInvested, totalEquityContributions: netEquityInvested, grossSourcesDifference: loan.plus(grossEquityFunding).minus(grossProjectUses), netSourcesDifference: loan.plus(netEquityInvested).plus(operatingSurplus).minus(grossProjectUses), sourcesAndUsesDifference: loan.plus(netEquityInvested).plus(operatingSurplus).minus(grossProjectUses) }),
      stabilizedOperations: { ...record({ grossPotentialRent: gpr, vacancyCreditLoss: vacancyLoss, effectiveRentalIncome, effectiveGrossIncome: egi, operatingExpenses, netOperatingIncome: noi }), netOperatingIncomePerSf: ratio(noi, gla)?.toString() ?? null },
      disposition: record({ exitCapRate: exitCap, grossSaleValue: grossSale, costOfSale: saleCost, netSaleProceeds: netSale }),
      unleveredReturns: { returnOnCost: returnOnCost?.toString() ?? null, developmentSpread: spread?.toString() ?? null, unleveredProfit: out(unleveredProfit), unleveredProfitMargin: profitMargin?.toString() ?? null },
      equityReturns: { outstandingLoanPrincipalAtSale: out(loan), netCashToEquityAtSale: out(netCashToEquity), grossEquityFundingRequirement: out(grossEquityFunding), leaseUpOperatingSurplus: out(operatingSurplus), netEquityInvested: out(netEquityInvested), totalEquityContributions: out(netEquityInvested), equityProfit: out(equityProfit), equityMultiple: equityMultiple?.toString() ?? null, investmentPeriodYears: out(years), annualizedEquityReturn: annualized?.toString() ?? null }, opportunityScreen: screen, leaseUpSchedule: leaseSchedule, sensitivities: null, diagnostics, _rent: rent, _hardCost: D(input.development.hardCostPerBuildingSf), _exitCap: exitCap };
  } catch (cause) { return { ...blank, diagnostics: [...diagnostics, { code: 'CALCULATION_FAILURE', severity: 'error', path: '', message: cause instanceof Error ? cause.message : 'Unknown calculation failure.' }] }; }
}

function scenarioInput(input: RetailUnderwritingInput, rentMultiplier: Decimal, hardMultiplier = D(1), capDelta = ZERO): RetailUnderwritingInput {
  const copy = structuredClone(input); copy.development.hardCostPerBuildingSf = D(copy.development.hardCostPerBuildingSf).times(hardMultiplier).toString(); copy.disposition.exitCapRate = D(copy.disposition.exitCapRate).plus(capDelta).toString();
  if (copy.leasing.mode === 'market') copy.leasing.rentalRatePerSfYear = D(copy.leasing.rentalRatePerSfYear).times(rentMultiplier).toString(); else copy.leasing.tenants = copy.leasing.tenants.map((tenant) => ({ ...tenant, rentalRatePerSfYear: D(tenant.rentalRatePerSfYear).times(rentMultiplier).toString() }));
  return copy;
}
function matrix(rowValues: Decimal[], columnValues: Decimal[], cell: (row: Decimal, column: Decimal) => Decimal | null): SensitivityMatrix { return { rowValues: rowValues.map(out), columnValues: columnValues.map(out), cells: rowValues.map((row) => columnValues.map((column) => cell(row, column)?.toString() ?? null)), baseRowIndex: 2, baseColumnIndex: 2 }; }

export function calculateRetailDevelopmentUnderwriting(input: RetailUnderwritingInput, options?: CalculationOptions): RetailUnderwritingResult {
  const result = core(input, options); if (!result.complete) return result;
  const multipliers = [D('0.9'), D('0.95'), D(1), D('1.05'), D('1.1')]; const capDeltas = [D('-0.005'), D('-0.0025'), D(0), D('0.0025'), D('0.005')];
  const unlevered = matrix(multipliers, capDeltas, (rentMultiplier, capDelta) => { const scenario = core(scenarioInput(input, rentMultiplier, D(1), capDelta), options); const value = scenario.unleveredReturns?.unleveredProfit; return scenario.complete && value !== null && value !== undefined ? D(value) : null; });
  const returnOnCost = matrix(multipliers, multipliers, (hardMultiplier, rentMultiplier) => { const scenario = core(scenarioInput(input, rentMultiplier, hardMultiplier), options); const value = scenario.unleveredReturns?.returnOnCost; return scenario.complete && value !== null && value !== undefined ? D(value) : null; });
  const { _rent, _hardCost, _exitCap, ...publicResult } = result; void _rent; void _hardCost; void _exitCap;
  return { ...publicResult, sensitivities: { unleveredProfitByRentAndExitCap: unlevered, returnOnCostByHardCostAndRent: returnOnCost } };
}
