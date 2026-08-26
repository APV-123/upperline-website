/** Phase 4C.2.0 semantic contract. This file defines no persistence schema. */
export const PROPERTY_INTELLIGENCE_OBSERVATION_CONTRACT_VERSION =
  'property-intelligence-observation-domain-v1' as const;

export const RENT_MEANINGS = ['asking', 'contractual', 'market_opinion'] as const;
export type RentMeaning = (typeof RENT_MEANINGS)[number];

export const RENT_COMMITMENTS = [
  'marketed_uncommitted',
  'executed',
  'reported_contractual',
  'option',
  'not_applicable',
] as const;
export type RentCommitment = (typeof RENT_COMMITMENTS)[number];

export const RENT_COMPONENTS = ['base', 'additional', 'percentage', 'total'] as const;
export type RentComponent = (typeof RENT_COMPONENTS)[number];

export const RENT_AMOUNT_BASES = ['monetary_absolute', 'monetary_per_area', 'percentage'] as const;
export type RentAmountBasis = (typeof RENT_AMOUNT_BASES)[number];

export const RENT_TIME_BASES = ['monthly', 'annual', 'term', 'one_time', 'not_applicable'] as const;
export type RentTimeBasis = (typeof RENT_TIME_BASES)[number];

export const RENT_AREA_BASES = ['square_feet', 'acres', 'not_applicable'] as const;
export type RentAreaBasis = (typeof RENT_AREA_BASES)[number];

export const LEASE_STRUCTURES = [
  'nnn',
  'gross',
  'modified_gross',
  'ground_lease',
  'percentage_lease',
  'not_stated',
  'unknown',
] as const;
export type LeaseStructure = (typeof LEASE_STRUCTURES)[number];

export const RENT_LIFECYCLES = ['historical', 'current', 'future_scheduled', 'prospective'] as const;
export type RentLifecycle = (typeof RENT_LIFECYCLES)[number];

export const OBSERVATION_ORIGINS = [
  'source_stated',
  'contractual_document_stated',
  'deterministic_derived',
  'model_inferred',
  'human_entered',
] as const;
export type ObservationOrigin = (typeof OBSERVATION_ORIGINS)[number];

export const OBSERVATION_ADMISSION_ACTIONS = ['admitted', 'rejected', 'reversed'] as const;
export type ObservationAdmissionAction = (typeof OBSERVATION_ADMISSION_ACTIONS)[number];
export type ObservationAdmissionState = 'pending' | 'admitted' | 'rejected';

export const TEMPORAL_ROLES = [
  'as_of',
  'effective_start',
  'effective_end',
  'reporting_period_start',
  'reporting_period_end',
  'measurement',
  'lease_commencement',
  'rent_commencement',
  'lease_expiration',
  'vintage',
] as const;
export type ObservationTemporalRole = (typeof TEMPORAL_ROLES)[number];

export type PartialDate =
  | { precision: 'unknown'; year: null; month: null; day: null }
  | { precision: 'year'; year: number; month: null; day: null }
  | { precision: 'month'; year: number; month: number; day: null }
  | { precision: 'day'; year: number; month: number; day: number };

export type TemporalAssertion = {
  role: ObservationTemporalRole;
  value: PartialDate;
  boundary: 'point' | 'closed' | 'open';
};

export type RentClassification = {
  meaning: RentMeaning;
  commitment: RentCommitment;
  component: RentComponent;
  amountBasis: RentAmountBasis;
  timeBasis: RentTimeBasis;
  areaBasis: RentAreaBasis;
  leaseStructure: LeaseStructure;
  lifecycle: RentLifecycle;
  origin: ObservationOrigin;
};

export const LEASE_INSTRUMENT_TYPES = [
  'original_lease',
  'amendment',
  'assignment',
  'renewal_extension',
  'termination',
  'memorandum',
  'source_summary',
] as const;
export type LeaseInstrumentType = (typeof LEASE_INSTRUMENT_TYPES)[number];

export const LEASE_INSTRUMENT_RELATIONSHIPS = [
  'governs',
  'amends',
  'assigns',
  'extends',
  'terminates',
  'summarizes',
] as const;
export type LeaseInstrumentRelationship = (typeof LEASE_INSTRUMENT_RELATIONSHIPS)[number];

export type LeaseBusinessIdentity = { kind: 'lease'; id: string; resolution: 'provisional' | 'resolved' };
export type LeaseInstrumentIdentity = { kind: 'lease_instrument'; id: string; instrumentType: LeaseInstrumentType };
export type ArtifactIdentityReference = { kind: 'artifact'; id: string; sha256Digest: string };

export const SOURCE_INDEPENDENCE = [
  'independent',
  'derivative',
  'same_logical_source',
  'same_artifact',
  'unknown',
] as const;
export type SourceIndependence = (typeof SOURCE_INDEPENDENCE)[number];

export type SourcePairProvenance = {
  sameArtifactDigest: boolean;
  sameLogicalSource: boolean;
  sharesUpstreamAssertion: boolean;
  independentlyAssessed: boolean;
};

export const EVIDENCE_LOCATOR_TYPES = [
  'pdf',
  'spreadsheet',
  'delimited',
  'document',
  'structured_record',
  'human_attestation',
] as const;
export type EvidenceLocatorType = (typeof EVIDENCE_LOCATOR_TYPES)[number];
export type EvidenceRole = 'supports' | 'contradicts';

export type PdfEvidenceLocator = {
  type: 'pdf';
  page: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  textAnchor?: string;
  sectionLabel?: string;
};
export type SpreadsheetEvidenceLocator = {
  type: 'spreadsheet';
  sheet: string;
  cell?: string;
  range?: string;
  row?: number;
};
export type DelimitedEvidenceLocator = { type: 'delimited'; row: number; column?: string };
export type DocumentEvidenceLocator = {
  type: 'document';
  section?: string;
  clause?: string;
  paragraph?: number;
};
export type StructuredRecordEvidenceLocator = {
  type: 'structured_record';
  recordIdentifier: string;
  fieldPath?: string;
};
export type HumanAttestationEvidenceLocator = {
  type: 'human_attestation';
  noteReference: string;
};
export type EvidenceLocator =
  | PdfEvidenceLocator
  | SpreadsheetEvidenceLocator
  | DelimitedEvidenceLocator
  | DocumentEvidenceLocator
  | StructuredRecordEvidenceLocator
  | HumanAttestationEvidenceLocator;

export const PREMISES_RESOLUTION_STATES = ['resolved', 'unresolved', 'not_applicable'] as const;
export type PremisesResolutionState = (typeof PREMISES_RESOLUTION_STATES)[number];

export type PremisesAttachment =
  | { state: 'resolved'; premisesEntityId: string; reportedSpaceLabel: string | null }
  | { state: 'unresolved'; premisesEntityId: null; reportedSpaceLabel: string | null }
  | { state: 'not_applicable'; premisesEntityId: null; reportedSpaceLabel: null };

export function validatePartialDate(value: PartialDate): string[] {
  if (value.precision === 'unknown') {
    return value.year === null && value.month === null && value.day === null
      ? [] : ['unknown_precision_has_components'];
  }
  if (!Number.isInteger(value.year) || value.year < 1 || value.year > 9999) return ['year_invalid'];
  if (value.precision === 'year') {
    return value.month === null && value.day === null ? [] : ['year_precision_has_finer_components'];
  }
  if (!Number.isInteger(value.month) || value.month < 1 || value.month > 12) return ['month_invalid'];
  if (value.precision === 'month') return value.day === null ? [] : ['month_precision_has_day'];
  if (!Number.isInteger(value.day)) return ['day_invalid'];
  const candidate = new Date(Date.UTC(value.year, value.month - 1, value.day));
  return candidate.getUTCFullYear() === value.year && candidate.getUTCMonth() === value.month - 1 && candidate.getUTCDate() === value.day
    ? [] : ['day_invalid'];
}

function lowerBound(value: PartialDate): number | null {
  if (value.precision === 'unknown') return null;
  return Date.UTC(value.year, (value.month ?? 1) - 1, value.day ?? 1);
}

function upperBound(value: PartialDate): number | null {
  if (value.precision === 'unknown') return null;
  if (value.precision === 'year') return Date.UTC(value.year, 11, 31);
  if (value.precision === 'month') return Date.UTC(value.year, value.month, 0);
  return Date.UTC(value.year, value.month - 1, value.day);
}

export function validateTemporalInterval(start: PartialDate, end: PartialDate): string[] {
  const errors = [...validatePartialDate(start), ...validatePartialDate(end)];
  if (errors.length > 0) return errors;
  const startMinimum = lowerBound(start);
  const endMaximum = upperBound(end);
  return startMinimum !== null && endMaximum !== null && startMinimum > endMaximum
    ? ['interval_order_invalid'] : [];
}

export function validateRentClassification(value: RentClassification): string[] {
  const errors: string[] = [];
  if (value.amountBasis === 'monetary_per_area' && value.areaBasis === 'not_applicable') {
    errors.push('per_area_requires_area_basis');
  }
  if (value.amountBasis !== 'monetary_per_area' && value.areaBasis !== 'not_applicable') {
    errors.push('area_basis_requires_per_area_amount');
  }
  if (value.amountBasis === 'percentage') {
    if (value.component !== 'percentage') errors.push('percentage_amount_requires_percentage_component');
    if (value.timeBasis !== 'not_applicable') errors.push('percentage_amount_requires_no_time_basis');
  }
  if (value.component === 'percentage' && value.amountBasis !== 'percentage') {
    errors.push('percentage_component_requires_percentage_amount');
  }
  if (value.meaning === 'asking' && value.commitment !== 'marketed_uncommitted') {
    errors.push('asking_requires_marketed_uncommitted');
  }
  if (value.meaning === 'contractual' && !['executed', 'reported_contractual', 'option'].includes(value.commitment)) {
    errors.push('contractual_requires_contractual_commitment');
  }
  if (value.meaning === 'market_opinion' && value.commitment !== 'not_applicable') {
    errors.push('market_opinion_requires_not_applicable_commitment');
  }
  if (value.commitment === 'option' && value.lifecycle !== 'prospective') {
    errors.push('option_requires_prospective_lifecycle');
  }
  if (value.lifecycle === 'future_scheduled' && value.commitment !== 'executed' && value.commitment !== 'reported_contractual') {
    errors.push('future_scheduled_requires_contractual_commitment');
  }
  return errors;
}

export function projectAdmissionState(
  actions: readonly ObservationAdmissionAction[],
): ObservationAdmissionState {
  let state: ObservationAdmissionState = 'pending';
  for (const action of actions) {
    if (action === 'admitted') state = 'admitted';
    else if (action === 'rejected') state = 'rejected';
    else state = 'pending';
  }
  return state;
}

export function classifySourceIndependence(value: SourcePairProvenance): SourceIndependence {
  if (value.sameArtifactDigest) return 'same_artifact';
  if (value.sameLogicalSource) return 'same_logical_source';
  if (value.sharesUpstreamAssertion) return 'derivative';
  if (value.independentlyAssessed) return 'independent';
  return 'unknown';
}

export function validateEvidenceLocator(locator: EvidenceLocator): string[] {
  if (locator.type === 'pdf') return Number.isInteger(locator.page) && locator.page > 0 ? [] : ['pdf_page_invalid'];
  if (locator.type === 'spreadsheet') {
    const positions = [locator.cell, locator.range, locator.row].filter((item) => item !== undefined);
    return locator.sheet.trim().length > 0 && positions.length === 1 ? [] : ['spreadsheet_locator_invalid'];
  }
  if (locator.type === 'delimited') return Number.isInteger(locator.row) && locator.row > 0 ? [] : ['delimited_row_invalid'];
  if (locator.type === 'document') return locator.section || locator.clause || locator.paragraph ? [] : ['document_position_required'];
  if (locator.type === 'structured_record') return locator.recordIdentifier.trim() ? [] : ['record_identifier_required'];
  return locator.noteReference.trim() ? [] : ['note_reference_required'];
}

export function validatePremisesAttachment(value: PremisesAttachment): string[] {
  if (value.state === 'resolved') return value.premisesEntityId.trim() ? [] : ['resolved_premises_id_required'];
  if (value.state === 'unresolved') return value.premisesEntityId === null ? [] : ['unresolved_premises_id_forbidden'];
  return value.premisesEntityId === null && value.reportedSpaceLabel === null
    ? [] : ['not_applicable_premises_fields_forbidden'];
}
