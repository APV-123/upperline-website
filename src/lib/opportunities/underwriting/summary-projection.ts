import type { RetailUnderwritingResult } from '../../underwriting/retail-development';

export type UnderwritingSummaryProjection = {
  building_area_sf: string | null; market_rent_per_sf_year: string | null;
  development_cost_before_financing: string | null; development_cost_per_sf: string | null;
  stabilized_noi: string | null; return_on_cost: string | null; exit_cap_rate: string | null;
  development_spread: string | null; unlevered_profit: string | null;
  net_equity_invested: string | null; equity_multiple: string | null;
  annualized_equity_return: string | null; screen_result: RetailUnderwritingResult['opportunityScreen'];
  is_complete: boolean; blocking_error_count: number; warning_count: number;
};

const field = (record: Record<string, string | null> | null, name: string) =>
  record?.[name] ?? null;

export function projectUnderwritingSummary(result: RetailUnderwritingResult): UnderwritingSummaryProjection {
  return {
    building_area_sf: result.geometry?.buildingAreaSf ?? null,
    market_rent_per_sf_year: result.resolvedLeasing?.rentalRatePerSfYear ?? null,
    development_cost_before_financing: field(result.developmentCosts, 'developmentCostBeforeFinancing'),
    development_cost_per_sf: field(result.developmentCosts, 'developmentCostPerBuildingSf'),
    stabilized_noi: field(result.stabilizedOperations, 'netOperatingIncome'),
    return_on_cost: field(result.unleveredReturns, 'returnOnCost'),
    exit_cap_rate: field(result.disposition, 'exitCapRate'),
    development_spread: field(result.unleveredReturns, 'developmentSpread'),
    unlevered_profit: field(result.unleveredReturns, 'unleveredProfit'),
    net_equity_invested: field(result.equityReturns, 'netEquityInvested'),
    equity_multiple: field(result.equityReturns, 'equityMultiple'),
    annualized_equity_return: field(result.equityReturns, 'annualizedEquityReturn'),
    screen_result: result.opportunityScreen, is_complete: result.complete,
    blocking_error_count: result.diagnostics.filter(({ severity }) => severity === 'error').length,
    warning_count: result.diagnostics.filter(({ severity }) => severity === 'warning').length,
  };
}
