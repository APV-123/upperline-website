import type { CalculationOptions, CalculationPolicy } from '../model/types';
export const DEFAULT_CALCULATION_POLICY: CalculationPolicy = { calculationVersion: 'retail-development-v1.0.0', pursueSpread: '0.02', reviewSpread: '0.01', reconciliationTolerance: '0.00000001' };
export const resolvePolicy = (options?: CalculationOptions): CalculationPolicy => ({ ...DEFAULT_CALCULATION_POLICY, ...options?.policy });
