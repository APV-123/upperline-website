import 'server-only';

export type ExtractionValidatorInvariant =
  | 'structured_output_not_object'
  | 'structured_output_unknown_property'
  | 'schema_version_invalid'
  | 'candidate_collection_invalid'
  | 'candidate_count_exceeded'
  | 'candidate_not_object'
  | 'candidate_unknown_property'
  | 'candidate_destination_invalid'
  | 'candidate_destination_not_registered'
  | 'candidate_value_not_object'
  | 'candidate_value_unknown_property'
  | 'candidate_value_invalid'
  | 'candidate_value_type_mismatch'
  | 'candidate_unit_invalid'
  | 'candidate_assertion_basis_invalid'
  | 'candidate_confidence_invalid'
  | 'evidence_collection_invalid'
  | 'evidence_not_object'
  | 'evidence_unknown_property'
  | 'evidence_page_invalid'
  | 'evidence_text_invalid'
  | 'evidence_bounding_box_not_object'
  | 'evidence_bounding_box_unknown_property'
  | 'evidence_bounding_box_invalid'
  | 'evidence_support_missing'
  | 'scalar_destination_competing'
  | 'set_destination_duplicate'
  | 'validator_dependency_rejection';

export type ExtractionValidatorTelemetryEvent = Readonly<{
  event: 'opportunity_extraction_validator_rejected';
  invariant: ExtractionValidatorInvariant;
}>;

export type ExtractionValidatorTelemetryRecorder =
  (event: ExtractionValidatorTelemetryEvent) => void;

export function recordExtractionValidatorTelemetry(event: ExtractionValidatorTelemetryEvent): void {
  console.info('opportunity_extraction_validator', event);
}
