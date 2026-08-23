import 'server-only';

import type { OpportunityActor } from '../application/actor-core';
import { opportunityError } from '../application/errors';
import { createOpportunitySupabaseClient } from '../persistence/client';
import {
  authorizePdfUpload, beginPdfIngestion, OrganizationWideOpportunityAuthorizer,
  type OpportunityAuthorizer, type PdfIngestionLookupPort, type PdfIngestionRepositoryPort,
  type PdfInspectorPort,
  type PrivateArtifactObjectStorePort,
} from './pdf-acquisition';
import { readPdfStorageConfig } from './pdf-storage-config';
import { PdfJsStructuralInspector, verifyPdfIngestion } from './pdf-verification';
import { SupabasePdfIngestionRepository } from './supabase-pdf-ingestion-repository';
import { SupabasePrivatePdfObjectStore } from './supabase-pdf-object-store';

export type BeginPdfApiResponse = {
  disposition: 'authorized' | 'uploaded_pending_verification' | 'ready';
  ingestionId: string;
  upload?: { authorization: string; expiresAt: string; maximumByteSize: number };
  readyForExtraction: boolean;
};

export type VerifyPdfApiResponse = {
  disposition: 'finalized' | 'already_ready';
  ingestionId: string;
  status: 'ready';
  readyForExtraction: true;
  verified?: { byteSize: number; pageCount: number; mediaType: 'application/pdf' };
};

export type PdfAcquisitionStateApiResponse = null | {
  ingestionId: string;
  status: 'awaiting_upload' | 'ready' | 'failed' | 'cancelled';
  readyForExtraction: boolean;
  failureCode?: string;
};

export type PdfApiDependencies = {
  repository: PdfIngestionRepositoryPort;
  objectStore: PrivateArtifactObjectStorePort;
  authorizer: OpportunityAuthorizer;
  inspector: PdfInspectorPort;
  storageBucket: string;
};

const BEGIN_KEYS = new Set(['idempotencyKey', 'originalFilename', 'declaredMediaType', 'declaredByteSize']);

export async function beginPdfAcquisitionApi(
  opportunityId: string,
  actor: OpportunityActor,
  body: unknown,
  dependencies: PdfApiDependencies = composePdfApiDependencies(),
): Promise<BeginPdfApiResponse> {
  const request = exactObject(body, BEGIN_KEYS);
  const begun = await beginPdfIngestion({
    opportunityId,
    idempotencyKey: requireText(request.idempotencyKey, 'Idempotency key'),
    originalFilename: request.originalFilename,
    declaredMediaType: request.declaredMediaType,
    declaredByteSize: request.declaredByteSize,
  }, actor, dependencies);
  const authorization = await authorizePdfUpload({
    actor, opportunityId, ingestionId: begun.ingestion.ingestionId,
  }, dependencies);
  if (authorization.disposition === 'authorized') {
    return {
      disposition: 'authorized', ingestionId: authorization.ingestionId,
      upload: {
        authorization: authorization.authorization,
        expiresAt: authorization.expiresAt,
        maximumByteSize: authorization.maximumByteSize,
      },
      readyForExtraction: false,
    };
  }
  return {
    disposition: authorization.disposition,
    ingestionId: authorization.ingestionId,
    readyForExtraction: authorization.disposition === 'ready',
  };
}

export async function getPdfAcquisitionStateApi(
  opportunityId: string,
  actor: OpportunityActor,
  dependencies: { repository: PdfIngestionLookupPort; authorizer: OpportunityAuthorizer } = composePdfLookupDependencies(),
): Promise<PdfAcquisitionStateApiResponse> {
  await dependencies.authorizer.authorize({ actor, opportunityId, action: 'view_pdf_ingestion' });
  const ingestion = await dependencies.repository.findLatestPdfIngestion(opportunityId, actor.email.trim().toLowerCase());
  if (!ingestion) return null;
  const ready = !['awaiting_source', 'failed', 'cancelled'].includes(ingestion.status);
  const status: NonNullable<PdfAcquisitionStateApiResponse>['status'] = ready
    ? 'ready' : ingestion.status === 'awaiting_source' ? 'awaiting_upload' : ingestion.status as 'failed' | 'cancelled';
  return {
    ingestionId: ingestion.ingestionId,
    status,
    readyForExtraction: ready,
    ...(ingestion.failureCode && { failureCode: ingestion.failureCode }),
  };
}

export async function verifyPdfAcquisitionApi(
  opportunityId: string,
  ingestionId: string,
  actor: OpportunityActor,
  body: unknown,
  dependencies: PdfApiDependencies = composePdfApiDependencies(),
): Promise<VerifyPdfApiResponse> {
  exactObject(body, new Set());
  const result = await verifyPdfIngestion({ actor, opportunityId, ingestionId }, {
    authorizer: dependencies.authorizer,
    repository: dependencies.repository,
    objectStore: dependencies.objectStore,
    inspector: dependencies.inspector,
    storageBucket: dependencies.storageBucket,
  });
  return {
    disposition: result.disposition,
    ingestionId: result.ingestionId,
    status: 'ready',
    readyForExtraction: true,
    ...(result.verified && { verified: {
      byteSize: result.verified.byteSize,
      pageCount: result.verified.pageCount,
      mediaType: result.verified.detectedMediaType,
    } }),
  };
}

function composePdfApiDependencies(): PdfApiDependencies {
  // Resolve configuration only while handling an acquisition request. A missing
  // bucket cannot break unrelated pages, module loading, or production builds.
  const config = readPdfStorageConfig();
  const client = createOpportunitySupabaseClient();
  const repository = new SupabasePdfIngestionRepository(client);
  return {
    repository,
    objectStore: new SupabasePrivatePdfObjectStore(client, config),
    authorizer: new OrganizationWideOpportunityAuthorizer(repository),
    inspector: new PdfJsStructuralInspector(),
    storageBucket: config.bucket,
  };
}

function composePdfLookupDependencies() {
  const repository = new SupabasePdfIngestionRepository(createOpportunitySupabaseClient());
  return { repository, authorizer: new OrganizationWideOpportunityAuthorizer(repository) };
}

function exactObject(value: unknown, keys: ReadonlySet<string>): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw opportunityError('invalid_upload_request', 'PDF acquisition request is invalid.');
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.has(key))) {
    throw opportunityError('invalid_upload_request', 'PDF acquisition request contains unsupported fields.');
  }
  return record;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string') throw opportunityError('invalid_upload_request', `${label} is required.`);
  return value;
}
