import type { TemporalAssertion } from './observation-contracts';

export function normalizeDurableIntelligenceText(value: string): string {
  return value.normalize('NFC');
}

export const ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CANONICAL_MANIFEST =
  '{"annualization_factor":12,"arithmetic_type":"exact_numeric","both_effective_boundary_roles_required":true,"closed_boundary_inclusive":true,"closed_boundary_required_precision":"day","denominator_identity":"rent_supplied_exact_premises_or_reported_space","denominator_unit":"square_feet","effective_temporal_compatibility":"complete_affirmative_interval_containment","eligible_boundary_pairs":["closed_day:closed_day","closed_day:open","open:closed_day"],"formula":"monthly_absolute_rent*12/square_feet","lone_known_boundary_proves_exact_instant":false,"omitted_as_open":false,"omitted_boundary_eligible":false,"open_open_eligible":false,"origin":"deterministic_derived","output_scale":8,"partial_date_expansion":"forbidden","premises_containment":"identity_level_unique_confirmed_property_contains_premises_dates_ignored","reporting_period_substitution":"forbidden","rounding_mode":"half_away_from_zero","rounding_stage":"final_output_only","subject_projection":"exact_rent_subject_set","unknown_as_open":false,"version":1}' as const;

export const ANNUALIZED_RENT_PER_SQUARE_FOOT_V1_CONTRACT_SHA256 =
  '4135a2f3be9e9ef1a71ab4890871f3b0acfd1063aa0028b412fc0646f5ffa3dc' as const;

export const ACRES_TO_SQUARE_FEET_V1_CANONICAL_MANIFEST =
  '{"arithmetic_type":"exact_numeric","formula":"acres*43560","input_unit":"acres","origin":"deterministic_derived","output_unit":"square_feet","premises_containment":"identity_level_unique_confirmed_property_contains_premises_dates_ignored","rounding_stage":"none","subject_projection":"exact_area_subject_set","temporal_projection":"exact_area_temporal_set","version":1}' as const;

export const ACRES_TO_SQUARE_FEET_V1_CONTRACT_SHA256 =
  '4d76c6d8354c1c2cf4a42d33c36d8162fce0dd6b851235ccd3c2aa38673388fe' as const;

function exactDay(assertion: TemporalAssertion | undefined): number | null {
  if (!assertion || assertion.boundary === 'open' || assertion.value.precision !== 'day') return null;
  return Date.UTC(assertion.value.year, assertion.value.month - 1, assertion.value.day);
}

export function areaTemporallySupportsRentReferenceV1(
  assertions: readonly TemporalAssertion[],
  rentReferenceDate: { year: number; month: number; day: number },
): boolean {
  const reference = Date.UTC(rentReferenceDate.year, rentReferenceDate.month - 1, rentReferenceDate.day);
  const start = assertions.find((item) => item.role === 'effective_start');
  const end = assertions.find((item) => item.role === 'effective_end');

  if (start || end) {
    if (!start || !end) return false;
    if (start.boundary === 'open' && end.boundary === 'open') return false;
    if (start.boundary === 'closed' && end.boundary === 'closed') {
      const lower = exactDay(start);
      const upper = exactDay(end);
      return lower !== null && upper !== null && lower <= reference && reference <= upper;
    }
    if (start.boundary === 'closed' && end.boundary === 'open') {
      const lower = exactDay(start);
      return lower !== null && lower <= reference;
    }
    if (start.boundary === 'open' && end.boundary === 'closed') {
      const upper = exactDay(end);
      return upper !== null && reference <= upper;
    }
    return false;
  }

  for (const role of ['as_of', 'measurement'] as const) {
    const point = assertions.find((item) => item.role === role);
    const value = exactDay(point);
    if (point?.boundary === 'point' && value !== null) return value === reference;
  }
  return false;
}
