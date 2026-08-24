import { ingestionFingerprint } from './fingerprint';
import type { ExtractionCompletionCandidate, ValidatedProviderOutput } from './extraction-contracts';

export function mapValidatedExtraction(input: {
  output: ValidatedProviderOutput;
  extractionVersion: string;
  idFactory: () => string;
}): ExtractionCompletionCandidate[] {
  return input.output.assertions.map((assertion, ordinal) => {
    const normalizedValue = assertion.value;
    return {
      id: input.idFactory(), destinationDomain: 'source', fieldPath: assertion.destination,
      candidateTenantKey: null, assertionBasis: assertion.assertionBasis,
      economicRole: 'descriptive_fact', rawValue: assertion.value,
      normalizedValueType: normalizedValue.type, normalizedValue: normalizedValue.value, unit: assertion.unit,
      confidence: assertion.confidence,
      validationState: assertion.assertionBasis === 'model_inference' ? 'warning' : 'valid',
      validationIssues: assertion.assertionBasis === 'model_inference' ? ['MODEL_INFERENCE_REQUIRES_REVIEW'] : [],
      groupKey: null, ordinal,
      fingerprint: ingestionFingerprint({ domain: 'source', fieldPath: assertion.destination, value: normalizedValue, unit: assertion.unit }),
      evidence: assertion.evidence.map((evidence, evidenceOrdinal) => ({
        id: input.idFactory(), pageNumber: evidence.pageNumber, snippet: evidence.snippet ?? null,
        boundingBox: evidence.boundingBox ?? null, sectionLabel: evidence.sectionLabel ?? null,
        extractionMethod: assertion.assertionBasis === 'visual_inference' ? 'provider_visual' :
          assertion.assertionBasis === 'model_inference' ? 'provider_model_inference' : 'provider_text',
        extractionVersion: input.extractionVersion, ordinal: evidenceOrdinal,
      })),
    };
  });
}

export function buildExtractionIdempotencyKey(input: {
  artifactDigest: string; configuration: {
    provider: string; model: string; extractionStrategy: string; extractionVersion: string;
    parserVersion: string; promptVersion: string; schemaVersion: string;
  };
}): string {
  return `extract:${ingestionFingerprint(input)}`;
}
