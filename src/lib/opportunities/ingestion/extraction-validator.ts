import Decimal from 'decimal.js';
import { opportunityError } from '../application/errors';
import type { CandidateUnit, CandidateValue } from './contracts';
import { getSourceDestinationDefinition } from './destination-registry';
import {
  EXTRACTION_POLICY, EXTRACTION_SCHEMA_VERSION, type ExtractionBoundingBox,
  type ProviderAssertionBasis, type ValidatedExtractionAssertion,
  type ValidatedExtractionEvidence, type ValidatedProviderOutput,
} from './extraction-contracts';
import { IngestionValidationError, validateCandidateValue, validateConfidence } from './validation';

const BASES = new Set<ProviderAssertionBasis>(['source_stated', 'visual_inference', 'model_inference']);
const DECIMAL = /^(?:0|1)(?:\.\d+)?$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const MAX_VALUE_CHARACTERS = 1_000;
const MAX_NUMERIC_CHARACTERS = 128;
const MAX_COORDINATE_CHARACTERS = 32;

export function parseExtractionProviderOutput(value: unknown, verifiedPageCount: number): ValidatedProviderOutput {
  try {
    const root = exactRecord(value, ['schemaVersion', 'assertions'], 'provider output');
    if (root.schemaVersion !== EXTRACTION_SCHEMA_VERSION) fail('schemaVersion is unsupported');
    if (!Array.isArray(root.assertions)) fail('assertions must be an array');
    if (root.assertions.length > EXTRACTION_POLICY.maxCandidates) fail('candidate limit exceeded');
    const assertions = root.assertions.map((item, index) => parseAssertion(item, index, verifiedPageCount));
    enforceCardinality(assertions);
    return { schemaVersion: EXTRACTION_SCHEMA_VERSION, assertions };
  } catch (cause) {
    if (cause instanceof IngestionValidationError) {
      throw opportunityError('provider_invalid_output', 'The extraction provider returned invalid output.', cause);
    }
    throw cause;
  }
}

function parseAssertion(value: unknown, index: number, pageCount: number): ValidatedExtractionAssertion {
  const item = exactRecord(value, ['destination', 'value', 'unit', 'assertionBasis', 'confidence', 'evidence'], `assertion ${index}`);
  if (typeof item.destination !== 'string') fail(`assertion ${index} destination is invalid`);
  const definition = getSourceDestinationDefinition(item.destination);
  if (!definition) fail(`assertion ${index} destination is not allowlisted`);
  const proposed = parseValue(item.value, index);
  if (proposed.type !== definition.expectedValueType) fail(`assertion ${index} value type is invalid`);
  if (typeof item.unit !== 'string' || !definition.allowedUnits.includes(item.unit as CandidateUnit)) fail(`assertion ${index} unit is invalid`);
  if (typeof item.assertionBasis !== 'string' || !BASES.has(item.assertionBasis as ProviderAssertionBasis)) fail(`assertion ${index} assertion basis is invalid`);
  const confidence = item.confidence === undefined || item.confidence === null ? null : requireConfidence(item.confidence);
  if (!Array.isArray(item.evidence) || item.evidence.length === 0 || item.evidence.length > EXTRACTION_POLICY.maxEvidencePerCandidate) {
    fail(`assertion ${index} evidence count is invalid`);
  }
  const basis = item.assertionBasis as ProviderAssertionBasis;
  const evidence = item.evidence.map((evidenceItem, evidenceIndex) => parseEvidence(evidenceItem, index, evidenceIndex, pageCount, basis));
  return { destination: item.destination, value: normalizeValue(proposed), unit: item.unit as CandidateUnit, assertionBasis: basis, confidence, evidence };
}

function parseValue(value: unknown, index: number): CandidateValue {
  const record = exactRecord(value, ['type', 'value'], `assertion ${index} value`);
  if (!['decimal', 'integer', 'date', 'text', 'boolean', 'enum', 'json'].includes(String(record.type))) fail(`assertion ${index} value type is invalid`);
  if (record.type === 'boolean') {
    if (typeof record.value !== 'boolean') fail(`assertion ${index} boolean value is invalid`);
    return { type: 'boolean', value: record.value };
  }
  if (record.type === 'json') fail(`assertion ${index} JSON values are unsupported`);
  if (typeof record.value !== 'string') fail(`assertion ${index} value is invalid`);
  const maximum = record.type === 'decimal' || record.type === 'integer' ? MAX_NUMERIC_CHARACTERS : MAX_VALUE_CHARACTERS;
  if (Array.from(record.value).length > maximum || CONTROL.test(record.value)) fail(`assertion ${index} value exceeds safe limits`);
  return validateCandidateValue({ type: record.type as 'decimal' | 'integer' | 'date' | 'text' | 'enum', value: record.value });
}

function normalizeValue(value: CandidateValue): CandidateValue {
  if (value.type === 'text' || value.type === 'enum') return { ...value, value: value.value.trim().normalize('NFC') };
  return value;
}

function parseEvidence(value: unknown, assertionIndex: number, evidenceIndex: number, pageCount: number, basis: ProviderAssertionBasis): ValidatedExtractionEvidence {
  const label = `assertion ${assertionIndex} evidence ${evidenceIndex}`;
  const record = exactRecord(value, ['pageNumber', 'snippet', 'boundingBox', 'sectionLabel'], label);
  if (!Number.isSafeInteger(record.pageNumber) || (record.pageNumber as number) < 1 || (record.pageNumber as number) > pageCount) fail(`${label} page is invalid`);
  const snippet = optionalBoundedText(record.snippet, EXTRACTION_POLICY.maxSnippetCharacters, `${label} snippet`);
  const sectionLabel = optionalBoundedText(record.sectionLabel, 120, `${label} sectionLabel`);
  const boundingBox = record.boundingBox === undefined ? undefined : parseBox(record.boundingBox, label);
  if (basis === 'source_stated' && !snippet) fail(`${label} requires a snippet`);
  if (basis === 'visual_inference' && !boundingBox) fail(`${label} requires a bounding box`);
  if (basis === 'model_inference' && !snippet && !boundingBox) fail(`${label} requires supporting evidence`);
  return { pageNumber: record.pageNumber as number, ...(snippet ? { snippet } : {}), ...(boundingBox ? { boundingBox } : {}), ...(sectionLabel ? { sectionLabel } : {}) };
}

function parseBox(value: unknown, label: string): ExtractionBoundingBox {
  const box = exactRecord(value, ['x', 'y', 'width', 'height'], `${label} boundingBox`);
  const values = ['x', 'y', 'width', 'height'].map(key => requireCoordinate(box[key], `${label} ${key}`));
  const [x, y, width, height] = values.map(item => new Decimal(item));
  if (width.lte(0) || height.lte(0) || x.plus(width).gt(1) || y.plus(height).gt(1)) fail(`${label} boundingBox is out of range`);
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

function requireCoordinate(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > MAX_COORDINATE_CHARACTERS || !DECIMAL.test(value)) fail(`${label} must be a canonical finite decimal in [0,1]`);
  const decimal = new Decimal(value as string);
  if (!decimal.isFinite() || decimal.lt(0) || decimal.gt(1)) fail(`${label} is out of range`);
  return value as string;
}

function requireConfidence(value: unknown): string {
  if (typeof value !== 'string') fail('confidence must be a canonical decimal string');
  return validateConfidence(value as string) as string;
}

function enforceCardinality(assertions: ValidatedExtractionAssertion[]): void {
  const scalar = new Set<string>();
  const setFingerprints = new Set<string>();
  for (const assertion of assertions) {
    const definition = getSourceDestinationDefinition(assertion.destination)!;
    if (definition.cardinality === 'scalar') {
      if (scalar.has(assertion.destination)) fail(`scalar destination ${assertion.destination} has competing candidates`);
      scalar.add(assertion.destination);
    } else {
      const key = JSON.stringify([assertion.destination, assertion.value, assertion.unit]);
      if (setFingerprints.has(key)) fail(`set destination ${assertion.destination} has a duplicate candidate`);
      setFingerprints.add(key);
    }
  }
}

function optionalBoundedText(value: unknown, maximum: number, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(`${label} must be text`);
  const normalized = (value as string).trim().normalize('NFC');
  if (!normalized || Array.from(normalized).length > maximum || CONTROL.test(normalized)) fail(`${label} is invalid`);
  return normalized;
}

function exactRecord(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  const allowed = new Set(keys);
  if (Object.keys(record).some(key => !allowed.has(key))) fail(`${label} contains an unknown property`);
  return record;
}
function fail(issue: string): never { throw new IngestionValidationError([issue]); }
