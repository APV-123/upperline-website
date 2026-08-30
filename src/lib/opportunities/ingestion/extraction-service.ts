import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { OpportunityActor } from '../application/actor-core';
import { OpportunityApplicationError, opportunityError } from '../application/errors';
import type { OpportunityAuthorizer, PrivateArtifactObjectStorePort } from './pdf-acquisition';
import {
  EXTRACTION_POLICY, EXTRACTION_SCHEMA_VERSION, LEGACY_EXTRACTION_SCHEMA_VERSION,
  ExtractionProviderFailureError, ExtractionProviderTimeoutError,
  type ExtractionConfiguration, type ExtractionProviderPort, type ExtractionRepositoryPort,
  type ExtractionRunRecord, type ExtractionTelemetryEvent, type ExtractionTelemetryPort,
  type VerifiedExtractionArtifact,
} from './extraction-contracts';
import { buildExtractionIdempotencyKey, mapValidatedExtraction } from './extraction-mapper';
import { parseExtractionProviderOutput } from './extraction-validator';

export type RunExtractionInput = { actor: OpportunityActor; opportunityId: string; retryCommandId?: string };
export type RunExtractionResult = { disposition: 'completed' | 'recovered'; run: ExtractionRunRecord };

export async function runProviderNeutralExtraction(input: RunExtractionInput, dependencies: {
  authorizer: OpportunityAuthorizer;
  repository: ExtractionRepositoryPort;
  objectStore: PrivateArtifactObjectStorePort;
  provider: ExtractionProviderPort;
  configuration: ExtractionConfiguration;
  telemetry?: ExtractionTelemetryPort;
  idFactory?: () => string;
}): Promise<RunExtractionResult> {
  const configuration = dependencies.configuration;
  validateConfiguration(configuration, dependencies.provider.identifier);
  const actorEmail = requireActorEmail(input.actor);
  await dependencies.authorizer.authorize({ actor: input.actor, opportunityId: input.opportunityId, action: 'extract_pdf_artifact' });
  const artifact = await dependencies.repository.resolveEligibleArtifact(input.opportunityId);
  if (!artifact || artifact.detectedMediaType !== 'application/pdf') throw opportunityError('artifact_not_ready', 'A verified PDF artifact is required.');
  if (artifact.opportunityId !== input.opportunityId) throw opportunityError('integrity_conflict', 'The verified artifact is not attached to this Opportunity.');
  enforceArtifactLimits(artifact);
  const idFactory = dependencies.idFactory ?? randomUUID;
  const idempotencyKey = buildExtractionIdempotencyKey({ artifactDigest: artifact.sha256Digest, configuration });
  const runId = idFactory();
  const allocation = input.retryCommandId === undefined
    ? await dependencies.repository.allocateRun({ artifact, runId, idempotencyKey, configuration, actorEmail })
    : await dependencies.repository.allocateRetryRun({ artifact, runId, logicalExtractionKey: idempotencyKey,
      retryCommandId: requireRetryCommandId(input.retryCommandId), configuration, actorEmail });
  if (allocation.disposition === 'recovered') {
    if (allocation.run.status === 'running' || allocation.run.status === 'pending') throw opportunityError('extraction_already_running', 'Extraction is already running.');
    if (allocation.run.status === 'succeeded') return { disposition: 'recovered', run: await dependencies.repository.recoverSucceededRun(allocation.run.runId) };
    throw opportunityError('provider_failure', 'The prior extraction attempt did not succeed.');
  }

  const allocatedRunId = allocation.run.runId;
  try {
    let bytes: Uint8Array;
    try { bytes = await readAuthoritativeBytes(dependencies.objectStore, artifact); }
    catch (cause) {
      if (cause instanceof OpportunityApplicationError) throw cause;
      throw opportunityError('persistence_failure', 'The verified artifact could not be retrieved.', cause);
    }
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let untrusted: unknown;
    try {
      const invocation = dependencies.provider.extract({ pdfBytes: bytes, verifiedPageCount: artifact.pageCount,
        configuration, signal: controller.signal });
      const deadline = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new ExtractionProviderTimeoutError()); }, configuration.timeoutMilliseconds);
      });
      untrusted = await Promise.race([invocation, deadline]);
    } finally { if (timeout) clearTimeout(timeout); }
    if (controller.signal.aborted) throw new ExtractionProviderTimeoutError();
    const output = parseExtractionProviderOutput(untrusted, artifact.pageCount);
    const candidates = mapValidatedExtraction({ output, extractionVersion: configuration.extractionVersion, idFactory });
    const completed = await dependencies.repository.completeRun({ artifact, runId: allocatedRunId, candidates, diagnostics: [] });
    await safeTelemetry(dependencies.telemetry, telemetry(configuration, 'complete_run', 'succeeded', { pageCount: artifact.pageCount, candidateCount: candidates.length, attemptNumber: completed.attemptNumber }));
    return { disposition: 'completed', run: completed };
  } catch (cause) {
    const translated = translateExtractionFailure(cause);
    await safelyFailRun(dependencies.repository, artifact, allocatedRunId, translated);
    await safeTelemetry(dependencies.telemetry, telemetry(configuration, 'complete_run', 'failed', { failureClassification: translated.kind }));
    throw translated;
  }
}

async function readAuthoritativeBytes(store: PrivateArtifactObjectStorePort, artifact: VerifiedExtractionArtifact): Promise<Uint8Array> {
  const reader = await store.openExactObject(artifact.storagePath);
  if (!reader) throw opportunityError('artifact_not_ready', 'The verified artifact is unavailable.');
  const chunks: Uint8Array[] = []; let length = 0;
  for await (const chunk of reader.bytes) {
    length += chunk.byteLength;
    if (length > EXTRACTION_POLICY.maxPdfBytes) throw opportunityError('artifact_not_ready', 'The verified artifact exceeds extraction limits.');
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (length !== artifact.byteSize || digest !== artifact.sha256Digest) throw opportunityError('artifact_not_ready', 'The verified artifact failed integrity validation.');
  return bytes;
}

function validateConfiguration(configuration: ExtractionConfiguration, providerIdentifier: string): void {
  if (configuration.provider !== providerIdentifier || ![EXTRACTION_SCHEMA_VERSION, LEGACY_EXTRACTION_SCHEMA_VERSION].includes(configuration.schemaVersion) ||
      ![configuration.model, configuration.extractionStrategy, configuration.extractionVersion, configuration.parserVersion, configuration.promptVersion].every(value => typeof value === 'string' && value.trim() && value.length <= 120) ||
      !Number.isSafeInteger(configuration.timeoutMilliseconds) || configuration.timeoutMilliseconds < EXTRACTION_POLICY.minimumTimeoutMilliseconds || configuration.timeoutMilliseconds > EXTRACTION_POLICY.maximumTimeoutMilliseconds) {
    throw opportunityError('extraction_contract_violation', 'Extraction configuration is invalid.');
  }
}
function enforceArtifactLimits(artifact: VerifiedExtractionArtifact): void {
  if (!Number.isSafeInteger(artifact.byteSize) || artifact.byteSize <= 0 || artifact.byteSize > EXTRACTION_POLICY.maxPdfBytes ||
      !Number.isSafeInteger(artifact.pageCount) || artifact.pageCount <= 0 || artifact.pageCount > EXTRACTION_POLICY.maxPages ||
      !/^[0-9a-f]{64}$/.test(artifact.sha256Digest)) {
    throw opportunityError('artifact_not_ready', 'The verified artifact is outside V1 extraction limits.');
  }
}
function translateExtractionFailure(cause: unknown): OpportunityApplicationError {
  if (cause instanceof OpportunityApplicationError) return cause;
  if (cause instanceof ExtractionProviderTimeoutError || (cause instanceof DOMException && cause.name === 'AbortError')) return opportunityError('provider_timeout', 'The extraction provider timed out.');
  if (cause instanceof ExtractionProviderFailureError) return opportunityError('provider_failure', 'The extraction provider failed.');
  return opportunityError('provider_failure', 'The extraction provider failed.');
}
async function safelyFailRun(repository: ExtractionRepositoryPort, artifact: VerifiedExtractionArtifact, runId: string, error: OpportunityApplicationError): Promise<void> {
  try { await repository.failRun({ artifact, runId, failureCode: error.kind.toUpperCase(), failureMessage: safeFailureMessage(error.kind), diagnostics: [] }); } catch { /* preserve the original sanitized failure */ }
}
function safeFailureMessage(kind: string): string { return `Extraction stopped with ${kind.replace(/_/g, ' ')}.`; }
function requireActorEmail(actor: OpportunityActor): string {
  if (!actor?.email?.trim()) throw opportunityError('unauthorized', 'Authentication is required.');
  return actor.email.trim().toLowerCase();
}
function requireRetryCommandId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw opportunityError('validation', 'Retry command ID must be a UUID.');
  }
  return value.toLowerCase();
}
function telemetry(configuration: ExtractionConfiguration, stage: ExtractionTelemetryEvent['stage'], outcome: ExtractionTelemetryEvent['outcome'], extra: Partial<ExtractionTelemetryEvent>): ExtractionTelemetryEvent {
  return { stage, outcome, provider: configuration.provider, model: configuration.model, schemaVersion: configuration.schemaVersion,
    promptVersion: configuration.promptVersion, extractionVersion: configuration.extractionVersion, ...extra };
}
async function safeTelemetry(port: ExtractionTelemetryPort | undefined, event: ExtractionTelemetryEvent): Promise<void> { try { await port?.record(event); } catch { /* telemetry is non-authoritative */ } }
