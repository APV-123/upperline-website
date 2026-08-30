import 'server-only';

import type { OpportunityActor } from '../application/actor-core';
import { opportunityError } from '../application/errors';
import { createOpportunitySupabaseClient } from '../persistence/client';
import type { ExtractionConfiguration, ExtractionProviderPort, ExtractionRepositoryPort, ExtractionRunRecord } from './extraction-contracts';
import { runProviderNeutralExtraction, type RunExtractionResult } from './extraction-service';
import { loadOpenAIApiKey, OPENAI_EXTRACTION_MODEL, OPENAI_EXTRACTION_PROVIDER,
  OpenAIExtractionProvider, type OpenAIExtractionTelemetryEvent } from './openai-extraction-provider';
import { OrganizationWideOpportunityAuthorizer, type OpportunityAuthorizer,
  type PrivateArtifactObjectStorePort } from './pdf-acquisition';
import { readPdfStorageConfig } from './pdf-storage-config';
import { SupabaseExtractionRepository } from './supabase-extraction-repository';
import { SupabasePdfIngestionRepository } from './supabase-pdf-ingestion-repository';
import { SupabasePrivatePdfObjectStore } from './supabase-pdf-object-store';

export const PRODUCTION_EXTRACTION_CONFIGURATION: Readonly<ExtractionConfiguration> = Object.freeze({
  provider: OPENAI_EXTRACTION_PROVIDER, model: OPENAI_EXTRACTION_MODEL, extractionStrategy: 'land-flyer',
  extractionVersion: 'openai-land-flyer-v2', parserVersion: 'strict-json-v2', promptVersion: 'land-flyer-v2',
  schemaVersion: 'land-flyer-v2', timeoutMilliseconds: 90_000,
});

export type ExtractionControlState = {
  stage: 'not_ready' | 'ready' | 'extracting' | 'failed' | 'succeeded';
  attemptNumber: number | null;
  canRetry: boolean;
};

type StateRepository = Pick<SupabaseExtractionRepository, 'resolveEligibleArtifact' | 'getLatestRun'>;
type StateDependencies = { authorizer: OpportunityAuthorizer; repository: StateRepository };
type RunDependencies = Omit<StateDependencies, 'repository'> & {
  repository: ExtractionRepositoryPort & StateRepository;
  objectStore: PrivateArtifactObjectStorePort;
  provider: ExtractionProviderPort;
  configuration: ExtractionConfiguration;
  loadCredential: () => string | undefined;
  idFactory?: () => string;
};

export async function getExtractionControlState(opportunityId: string, actor: OpportunityActor,
  dependencies: StateDependencies = composeStateDependencies()): Promise<ExtractionControlState> {
  await dependencies.authorizer.authorize({ actor, opportunityId, action: 'extract_pdf_artifact' });
  const artifact = await dependencies.repository.resolveEligibleArtifact(opportunityId);
  if (!artifact) return { stage: 'not_ready', attemptNumber: null, canRetry: false };
  if (artifact.opportunityId !== opportunityId) throw opportunityError('integrity_conflict', 'The verified artifact is not attached to this Opportunity.');
  const run = await dependencies.repository.getLatestRun(artifact);
  return projectState(run);
}

export async function runExtractionControl(opportunityId: string, actor: OpportunityActor, body: unknown,
  dependencies: RunDependencies = composeRunDependencies()): Promise<RunExtractionResult> {
  const request = parseRequest(body);
  await dependencies.authorizer.authorize({ actor, opportunityId, action: 'extract_pdf_artifact' });
  if (!dependencies.loadCredential()?.trim()) throw opportunityError('provider_failure', 'The extraction provider is unavailable.');
  return runProviderNeutralExtraction({ actor, opportunityId, ...request }, {
    authorizer: { authorize: async () => undefined }, repository: dependencies.repository,
    objectStore: dependencies.objectStore, provider: dependencies.provider,
    configuration: dependencies.configuration, idFactory: dependencies.idFactory,
  });
}

function projectState(run: ExtractionRunRecord | null): ExtractionControlState {
  if (!run) return { stage: 'ready', attemptNumber: null, canRetry: false };
  if (run.status === 'pending' || run.status === 'running') return { stage: 'extracting', attemptNumber: run.attemptNumber, canRetry: false };
  if (run.status === 'succeeded') return { stage: 'succeeded', attemptNumber: run.attemptNumber, canRetry: false };
  return { stage: 'failed', attemptNumber: run.attemptNumber, canRetry: run.status === 'failed' };
}

function parseRequest(value: unknown): { retryCommandId?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw opportunityError('validation', 'Extraction request is invalid.');
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => key !== 'retryCommandId')) throw opportunityError('validation', 'Extraction request contains unsupported fields.');
  if (record.retryCommandId === undefined) return {};
  if (typeof record.retryCommandId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(record.retryCommandId)) {
    throw opportunityError('validation', 'Retry command ID must be a UUID.');
  }
  return { retryCommandId: record.retryCommandId };
}

function composeStateDependencies(): StateDependencies {
  const client = createOpportunitySupabaseClient();
  const access = new SupabasePdfIngestionRepository(client);
  return { authorizer: new OrganizationWideOpportunityAuthorizer(access), repository: new SupabaseExtractionRepository(client) };
}
function composeRunDependencies(): RunDependencies {
  const client = createOpportunitySupabaseClient();
  const access = new SupabasePdfIngestionRepository(client);
  return { authorizer: new OrganizationWideOpportunityAuthorizer(access), repository: new SupabaseExtractionRepository(client),
    objectStore: new SupabasePrivatePdfObjectStore(client, readPdfStorageConfig()),
    provider: new OpenAIExtractionProvider({ recordTelemetry }), configuration: PRODUCTION_EXTRACTION_CONFIGURATION,
    loadCredential: loadOpenAIApiKey };
}
function recordTelemetry(event: OpenAIExtractionTelemetryEvent): void { console.info('opportunity_openai_extraction', event); }
