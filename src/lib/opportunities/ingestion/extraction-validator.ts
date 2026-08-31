import Decimal from 'decimal.js';
import { opportunityError } from '../application/errors';
import type { CandidateUnit, CandidateValue } from './contracts';
import { getSourceDestinationDefinition } from './destination-registry';
import {
  EXTRACTION_POLICY, EXTRACTION_SCHEMA_VERSION, LEGACY_EXTRACTION_SCHEMA_VERSION, PREVIOUS_EXTRACTION_SCHEMA_VERSION, type ExtractionBoundingBox,
  type ProviderAssertionBasis, type ValidatedExtractionAssertion,
  type ValidatedExtractionEvidence, type ValidatedProviderOutput,
} from './extraction-contracts';
import { parseTrafficCountProposition, parseTrafficCountPropositionV2 } from './rich-candidate';
import { IngestionValidationError, validateCandidateValue, validateConfidence } from './validation';
import {
  recordExtractionValidatorTelemetry, type ExtractionValidatorInvariant,
  type ExtractionValidatorTelemetryRecorder,
} from './extraction-validator-telemetry';

const BASES = new Set<ProviderAssertionBasis>(['source_stated', 'visual_inference', 'model_inference']);
const DECIMAL = /^(?:0|1)(?:\.\d+)?$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const MAX_VALUE_CHARACTERS = 1_000;
const MAX_NUMERIC_CHARACTERS = 128;
const MAX_COORDINATE_CHARACTERS = 32;

export function parseExtractionProviderOutput(value: unknown, verifiedPageCount: number,
  recordTelemetry: ExtractionValidatorTelemetryRecorder = recordExtractionValidatorTelemetry,
  expectedSchemaVersion?: string): ValidatedProviderOutput {
  try {
    const version = (value as {schemaVersion?:unknown})?.schemaVersion;
    if (expectedSchemaVersion !== undefined && version !== expectedSchemaVersion) fail('schema_version_invalid', 'schemaVersion does not match the configured extraction lineage');
    const richVersion = version === EXTRACTION_SCHEMA_VERSION || version === PREVIOUS_EXTRACTION_SCHEMA_VERSION;
    const keys = richVersion ? ['schemaVersion','assertions','propositions'] : ['schemaVersion','assertions'];
    const root = exactRecord(value, keys, 'provider output',
      'structured_output_not_object', 'structured_output_unknown_property');
    if (root.schemaVersion !== EXTRACTION_SCHEMA_VERSION && root.schemaVersion !== PREVIOUS_EXTRACTION_SCHEMA_VERSION && root.schemaVersion !== LEGACY_EXTRACTION_SCHEMA_VERSION) fail('schema_version_invalid', 'schemaVersion is unsupported');
    if (!Array.isArray(root.assertions)) fail('candidate_collection_invalid', 'assertions must be an array');
    if (root.assertions.length > EXTRACTION_POLICY.maxCandidates) fail('candidate_count_exceeded', 'candidate limit exceeded');
    const assertions = root.assertions.map((item, index) => parseAssertion(item, index, verifiedPageCount));
    const propositions = richVersion ? parsePropositions(root.propositions, verifiedPageCount, root.schemaVersion === EXTRACTION_SCHEMA_VERSION ? 2 : 1) : undefined;
    if (richVersion && assertions.some(assertion => assertion.destination === 'traffic.vehiclesPerDay')) fail('candidate_destination_invalid', 'traffic counts require a rich proposition');
    if (assertions.length + (propositions?.length ?? 0) > EXTRACTION_POLICY.maxCandidates) fail('candidate_count_exceeded', 'candidate limit exceeded');
    enforceCardinality(assertions);
    return { schemaVersion: root.schemaVersion, assertions, ...(propositions ? {propositions} : {}) } as ValidatedProviderOutput;
  } catch (cause) {
    if (cause instanceof ExtractionValidatorError) {
      safeTelemetry(recordTelemetry, cause.invariant);
      throw opportunityError('provider_invalid_output', 'The extraction provider returned invalid output.', cause);
    }
    if (cause instanceof IngestionValidationError) {
      safeTelemetry(recordTelemetry, 'validator_dependency_rejection');
      throw opportunityError('provider_invalid_output', 'The extraction provider returned invalid output.', cause);
    }
    throw cause;
  }
}

function parsePropositions(value: unknown, pageCount: number, propositionVersion: 1 | 2) {
  if (!Array.isArray(value) || value.length > EXTRACTION_POLICY.maxCandidates) fail('candidate_collection_invalid','propositions must be a bounded array');
  const seen=new Set<string>();
  return value.map((input,index)=>{const item=exactRecord(input,['proposition','assertionBasis','confidence','evidence'],`proposition ${index}`,'candidate_not_object','candidate_unknown_property'); const proposition=propositionVersion===2?parseTrafficCountPropositionV2(item.proposition):parseTrafficCountProposition(item.proposition); const basis=item.assertionBasis; if(typeof basis!=='string'||!BASES.has(basis as ProviderAssertionBasis))fail('candidate_assertion_basis_invalid',`proposition ${index} basis is invalid`); const confidence=item.confidence===null?null:requireConfidence(item.confidence); if(!Array.isArray(item.evidence)||item.evidence.length===0||item.evidence.length>EXTRACTION_POLICY.maxEvidencePerCandidate)fail('evidence_collection_invalid',`proposition ${index} evidence is invalid`); const evidence=item.evidence.map((e,i)=>parseEvidence(e,index,i,pageCount,basis as ProviderAssertionBasis)); if(!evidence.some(item=>item.snippet))fail('evidence_support_missing',`proposition ${index} requires source text supporting the complete proposition`); const key=JSON.stringify(proposition); if(seen.has(key))fail('set_destination_duplicate','duplicate traffic proposition'); seen.add(key); return {proposition,assertionBasis:basis as ProviderAssertionBasis,confidence,evidence};});
}

function parseAssertion(value: unknown, index: number, pageCount: number): ValidatedExtractionAssertion {
  const item = exactRecord(value, ['destination', 'value', 'unit', 'assertionBasis', 'confidence', 'evidence'],
    `assertion ${index}`, 'candidate_not_object', 'candidate_unknown_property');
  if (typeof item.destination !== 'string') fail('candidate_destination_invalid', `assertion ${index} destination is invalid`);
  const definition = getSourceDestinationDefinition(item.destination);
  if (!definition) fail('candidate_destination_not_registered', `assertion ${index} destination is not allowlisted`);
  const proposed = parseValue(item.value, index);
  if (proposed.type !== definition.expectedValueType) fail('candidate_value_type_mismatch', `assertion ${index} value type is invalid`);
  if (typeof item.unit !== 'string' || !definition.allowedUnits.includes(item.unit as CandidateUnit)) fail('candidate_unit_invalid', `assertion ${index} unit is invalid`);
  if (typeof item.assertionBasis !== 'string' || !BASES.has(item.assertionBasis as ProviderAssertionBasis)) fail('candidate_assertion_basis_invalid', `assertion ${index} assertion basis is invalid`);
  const confidence = item.confidence === undefined || item.confidence === null ? null : requireConfidence(item.confidence);
  if (!Array.isArray(item.evidence) || item.evidence.length === 0 || item.evidence.length > EXTRACTION_POLICY.maxEvidencePerCandidate) {
    fail('evidence_collection_invalid', `assertion ${index} evidence count is invalid`);
  }
  const basis = item.assertionBasis as ProviderAssertionBasis;
  const evidence = item.evidence.map((evidenceItem, evidenceIndex) => parseEvidence(evidenceItem, index, evidenceIndex, pageCount, basis));
  return { destination: item.destination, value: normalizeValue(proposed), unit: item.unit as CandidateUnit, assertionBasis: basis, confidence, evidence };
}

function parseValue(value: unknown, index: number): CandidateValue {
  const record = exactRecord(value, ['type', 'value'], `assertion ${index} value`,
    'candidate_value_not_object', 'candidate_value_unknown_property');
  if (!['decimal', 'integer', 'date', 'text', 'boolean', 'enum', 'json'].includes(String(record.type))) fail('candidate_value_invalid', `assertion ${index} value type is invalid`);
  if (record.type === 'boolean') {
    if (typeof record.value !== 'boolean') fail('candidate_value_invalid', `assertion ${index} boolean value is invalid`);
    return { type: 'boolean', value: record.value };
  }
  if (record.type === 'json') fail('candidate_value_invalid', `assertion ${index} JSON values are unsupported`);
  if (typeof record.value !== 'string') fail('candidate_value_invalid', `assertion ${index} value is invalid`);
  const maximum = record.type === 'decimal' || record.type === 'integer' ? MAX_NUMERIC_CHARACTERS : MAX_VALUE_CHARACTERS;
  if (Array.from(record.value).length > maximum || CONTROL.test(record.value)) fail('candidate_value_invalid', `assertion ${index} value exceeds safe limits`);
  try {
    return validateCandidateValue({ type: record.type as 'decimal' | 'integer' | 'date' | 'text' | 'enum', value: record.value });
  } catch (cause) {
    if (cause instanceof IngestionValidationError) fail('candidate_value_invalid', cause.issues.join('; '));
    throw cause;
  }
}

function normalizeValue(value: CandidateValue): CandidateValue {
  if (value.type === 'text' || value.type === 'enum') return { ...value, value: value.value.trim().normalize('NFC') };
  return value;
}

function parseEvidence(value: unknown, assertionIndex: number, evidenceIndex: number, pageCount: number, basis: ProviderAssertionBasis): ValidatedExtractionEvidence {
  const label = `assertion ${assertionIndex} evidence ${evidenceIndex}`;
  const record = exactRecord(value, ['pageNumber', 'snippet', 'boundingBox', 'sectionLabel'], label,
    'evidence_not_object', 'evidence_unknown_property');
  if (!Number.isSafeInteger(record.pageNumber) || (record.pageNumber as number) < 1 || (record.pageNumber as number) > pageCount) fail('evidence_page_invalid', `${label} page is invalid`);
  const snippet = optionalBoundedText(record.snippet, EXTRACTION_POLICY.maxSnippetCharacters, `${label} snippet`);
  const sectionLabel = optionalBoundedText(record.sectionLabel, 120, `${label} sectionLabel`);
  const boundingBox = record.boundingBox === undefined ? undefined : parseBox(record.boundingBox, label);
  if (basis === 'source_stated' && !snippet) fail('evidence_support_missing', `${label} requires a snippet`);
  if (basis === 'visual_inference' && !boundingBox) fail('evidence_support_missing', `${label} requires a bounding box`);
  if (basis === 'model_inference' && !snippet && !boundingBox) fail('evidence_support_missing', `${label} requires supporting evidence`);
  return { pageNumber: record.pageNumber as number, ...(snippet ? { snippet } : {}), ...(boundingBox ? { boundingBox } : {}), ...(sectionLabel ? { sectionLabel } : {}) };
}

function parseBox(value: unknown, label: string): ExtractionBoundingBox {
  const box = exactRecord(value, ['x', 'y', 'width', 'height'], `${label} boundingBox`,
    'evidence_bounding_box_not_object', 'evidence_bounding_box_unknown_property');
  const values = ['x', 'y', 'width', 'height'].map(key => requireCoordinate(box[key], `${label} ${key}`));
  const [x, y, width, height] = values.map(item => new Decimal(item));
  if (width.lte(0) || height.lte(0) || x.plus(width).gt(1) || y.plus(height).gt(1)) fail('evidence_bounding_box_invalid', `${label} boundingBox is out of range`);
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

function requireCoordinate(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > MAX_COORDINATE_CHARACTERS || !DECIMAL.test(value)) fail('evidence_bounding_box_invalid', `${label} must be a canonical finite decimal in [0,1]`);
  const decimal = new Decimal(value as string);
  if (!decimal.isFinite() || decimal.lt(0) || decimal.gt(1)) fail('evidence_bounding_box_invalid', `${label} is out of range`);
  return value as string;
}

function requireConfidence(value: unknown): string {
  if (typeof value !== 'string') fail('candidate_confidence_invalid', 'confidence must be a canonical decimal string');
  try { return validateConfidence(value as string) as string; }
  catch (cause) {
    if (cause instanceof IngestionValidationError) fail('candidate_confidence_invalid', cause.issues.join('; '));
    throw cause;
  }
}

function enforceCardinality(assertions: ValidatedExtractionAssertion[]): void {
  const scalar = new Set<string>();
  const setFingerprints = new Set<string>();
  for (const assertion of assertions) {
    const definition = getSourceDestinationDefinition(assertion.destination)!;
    if (definition.cardinality === 'scalar') {
      if (scalar.has(assertion.destination)) fail('scalar_destination_competing', `scalar destination ${assertion.destination} has competing candidates`);
      scalar.add(assertion.destination);
    } else {
      const key = JSON.stringify([assertion.destination, assertion.value, assertion.unit]);
      if (setFingerprints.has(key)) fail('set_destination_duplicate', `set destination ${assertion.destination} has a duplicate candidate`);
      setFingerprints.add(key);
    }
  }
}

function optionalBoundedText(value: unknown, maximum: number, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail('evidence_text_invalid', `${label} must be text`);
  const normalized = (value as string).trim().normalize('NFC');
  if (!normalized || Array.from(normalized).length > maximum || CONTROL.test(normalized)) fail('evidence_text_invalid', `${label} is invalid`);
  return normalized;
}

function exactRecord(value: unknown, keys: readonly string[], label: string,
  notObjectInvariant: ExtractionValidatorInvariant,
  unknownPropertyInvariant: ExtractionValidatorInvariant): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(notObjectInvariant, `${label} must be an object`);
  const record = value as Record<string, unknown>;
  const allowed = new Set(keys);
  if (Object.keys(record).some(key => !allowed.has(key))) fail(unknownPropertyInvariant, `${label} contains an unknown property`);
  return record;
}

class ExtractionValidatorError extends IngestionValidationError {
  constructor(readonly invariant: ExtractionValidatorInvariant, issue: string) {
    super([issue]);
    this.name = 'ExtractionValidatorError';
  }
}

function fail(invariant: ExtractionValidatorInvariant, issue: string): never {
  throw new ExtractionValidatorError(invariant, issue);
}

function safeTelemetry(record: ExtractionValidatorTelemetryRecorder,
  invariant: ExtractionValidatorInvariant): void {
  try { record({ event: 'opportunity_extraction_validator_rejected', invariant }); }
  catch { /* telemetry is non-authoritative */ }
}
