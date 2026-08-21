import type { Diagnostic, RetailUnderwritingInput } from '../model/types';
import { D, finite } from '../utilities/decimal';

export function validateInput(input: RetailUnderwritingInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const error = (code: string, path: string, message: string) => diagnostics.push({ code, path, message, severity: 'error' });
  const nonnegative = (value: string | number, path: string) => {
    if (!finite(value) || D(value).isNegative()) error('INVALID_NONNEGATIVE_VALUE', path, 'Must be a finite value greater than or equal to zero.');
  };
  const rate01 = (value: string | number, path: string) => {
    if (!finite(value) || D(value).lt(0) || D(value).gt(1)) error('INVALID_RATE', path, 'Must be between zero and one.');
  };
  const months = (value: number, path: string, positive = false) => {
    if (!Number.isInteger(value) || value < (positive ? 1 : 0)) error('INVALID_MONTHS', path, `Must be an integer ${positive ? 'greater than zero' : 'greater than or equal to zero'}.`);
  };

  nonnegative(input.site.landAreaSf, 'site.landAreaSf'); nonnegative(input.site.targetFar, 'site.targetFar'); nonnegative(input.site.landCostPerLandSf, 'site.landCostPerLandSf');
  nonnegative(input.development.hardCostPerBuildingSf, 'development.hardCostPerBuildingSf'); nonnegative(input.development.softCostRate, 'development.softCostRate'); nonnegative(input.development.contingencyRate, 'development.contingencyRate'); nonnegative(input.development.developerFeeRate, 'development.developerFeeRate');
  months(input.timeline.closingLagDays, 'timeline.closingLagDays'); months(input.timeline.designPermittingMonths, 'timeline.designPermittingMonths'); months(input.timeline.constructionMonths, 'timeline.constructionMonths'); months(input.timeline.postCompletionMonths, 'timeline.postCompletionMonths');
  rate01(input.financing.loanToCost, 'financing.loanToCost'); nonnegative(input.financing.annualInterestRate, 'financing.annualInterestRate'); rate01(input.financing.averageConstructionBalanceRate, 'financing.averageConstructionBalanceRate');
  rate01(input.leaseUp.averageOccupancyRate, 'leaseUp.averageOccupancyRate'); nonnegative(input.leaseUp.nnnOperatingExpensesPerSfYear, 'leaseUp.nnnOperatingExpensesPerSfYear');
  rate01(input.operations.vacancyCreditLossRate, 'operations.vacancyCreditLossRate'); nonnegative(input.operations.otherIncomePerYear, 'operations.otherIncomePerYear'); nonnegative(input.operations.operatingExpenseRateOfEgi, 'operations.operatingExpenseRateOfEgi');
  if (!finite(input.disposition.exitCapRate) || D(input.disposition.exitCapRate).lte(0)) error('INVALID_EXIT_CAP_RATE', 'disposition.exitCapRate', 'Must be a finite value greater than zero.');
  rate01(input.disposition.costOfSaleRate, 'disposition.costOfSaleRate');

  if (input.leasing.mode === 'market') {
    nonnegative(input.leasing.rentalRatePerSfYear, 'leasing.rentalRatePerSfYear'); nonnegative(input.leasing.annualRentBump, 'leasing.annualRentBump'); months(input.leasing.leaseTermMonths, 'leasing.leaseTermMonths', true); nonnegative(input.leasing.freeRentMonths, 'leasing.freeRentMonths'); nonnegative(input.leasing.tenantImprovementPerSf, 'leasing.tenantImprovementPerSf'); rate01(input.leasing.leasingCommissionRate, 'leasing.leasingCommissionRate');
  } else {
    if (input.leasing.tenants.length === 0) error('EMPTY_TENANT_ROSTER', 'leasing.tenants', 'Tenant Roster Mode requires at least one usable tenant.');
    input.leasing.tenants.forEach((tenant, index) => {
      const path = `leasing.tenants[${index}]`;
      if (!Number.isInteger(tenant.displayOrder)) error('INVALID_DISPLAY_ORDER', `${path}.displayOrder`, 'Display order must be an integer.');
      nonnegative(tenant.sizeSf, `${path}.sizeSf`); nonnegative(tenant.rentalRatePerSfYear, `${path}.rentalRatePerSfYear`); nonnegative(tenant.annualRentBump, `${path}.annualRentBump`); months(tenant.leaseTermMonths, `${path}.leaseTermMonths`, true); nonnegative(tenant.freeRentMonths, `${path}.freeRentMonths`); nonnegative(tenant.tenantImprovementPerSf, `${path}.tenantImprovementPerSf`); rate01(tenant.leasingCommissionRate, `${path}.leasingCommissionRate`);
    });
    if (input.leasing.tenants.length > 0 && input.leasing.tenants.every((tenant) => D(tenant.sizeSf).isZero())) error('UNUSABLE_TENANT_ROSTER', 'leasing.tenants', 'Tenant Roster Mode requires positive total tenant SF.');
  }
  return diagnostics;
}
