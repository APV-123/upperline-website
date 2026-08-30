import { ingestionFingerprint } from './fingerprint';
import type { ExtractionCompletionCandidate, ValidatedProviderOutput } from './extraction-contracts';
import { canonicalizeRichCandidate } from './rich-candidate';

export function mapValidatedExtraction(input: {
  output: ValidatedProviderOutput;
  extractionVersion: string;
  idFactory: () => string;
}): ExtractionCompletionCandidate[] {
  const scalar: ExtractionCompletionCandidate[] = input.output.assertions.map((assertion, ordinal) => {
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
        ...(evidence.boundingBox ? { boundingBox: evidence.boundingBox } : {}),
        sectionLabel: evidence.sectionLabel ?? null,
        extractionMethod: assertion.assertionBasis === 'visual_inference' ? 'provider_visual' :
          assertion.assertionBasis === 'model_inference' ? 'provider_model_inference' : 'provider_text',
        extractionVersion: input.extractionVersion, ordinal: evidenceOrdinal,
      })),
    };
  });
  const rich: ExtractionCompletionCandidate[]=(input.output.propositions??[]).map((item,index)=>({
    id:input.idFactory(),destinationDomain:'source' as const,fieldPath:'traffic.vehiclesPerDay',candidateTenantKey:null,
    assertionBasis:item.assertionBasis,economicRole:'descriptive_fact' as const,rawValue:item.proposition,
    normalizedValueType:'json' as const,normalizedValue:item.proposition,unit:'VEHICLES_PER_DAY' as const,confidence:item.confidence,
    validationState:item.assertionBasis==='model_inference'?'warning' as const:'valid' as const,
    validationIssues:item.assertionBasis==='model_inference'?['MODEL_INFERENCE_REQUIRES_REVIEW']:[],groupKey:'traffic_count:1',ordinal:scalar.length+index,
    fingerprint:ingestionFingerprint({domain:'source',fieldPath:'traffic.vehiclesPerDay',kind:'traffic_count',schemaVersion:1,canonicalProposition:canonicalizeRichCandidate(item.proposition)}),
    evidence:item.evidence.map((evidence,evidenceOrdinal)=>({id:input.idFactory(),pageNumber:evidence.pageNumber,snippet:evidence.snippet??null,...(evidence.boundingBox?{boundingBox:evidence.boundingBox}:{}),sectionLabel:evidence.sectionLabel??null,extractionMethod:item.assertionBasis==='visual_inference'?'provider_visual':item.assertionBasis==='model_inference'?'provider_model_inference':'provider_text',extractionVersion:input.extractionVersion,ordinal:evidenceOrdinal}))
  }));
  return [...scalar,...rich];
}

export function buildExtractionIdempotencyKey(input: {
  artifactDigest: string; configuration: {
    provider: string; model: string; extractionStrategy: string; extractionVersion: string;
    parserVersion: string; promptVersion: string; schemaVersion: string;
  };
}): string {
  return `extract:${ingestionFingerprint(input)}`;
}
