import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import type {
  CreateOrRecoverPdfIngestionInput, CreateOrRecoverPdfIngestionResult,
  PdfIngestionRecord, PdfIngestionRepositoryPort, OpportunityAccessPort,
  VerifiedPdfFinalization,
} from './pdf-acquisition';
import { validateVerifiedPdfFinalization } from './pdf-acquisition';

type IngestionRow = {
  id: string; opportunity_id: string | null; entry_type: string; status: PdfIngestionRecord['status'];
  idempotency_key: string | null; requested_by_email: string; revision: number;
  failure_code: string | null; failure_message: string | null;
};

type DatabaseErrorLike = { code?: string; message?: string };

export class SupabasePdfIngestionRepository implements PdfIngestionRepositoryPort, OpportunityAccessPort {
  constructor(private readonly client: SupabaseClient) {}

  async opportunityExists(opportunityId: string): Promise<boolean> {
    const { data, error } = await this.client.from('acquisition_opportunities')
      .select('id').eq('id', opportunityId).maybeSingle();
    if (error) throw translatePdfDatabaseError(error);
    return data !== null;
  }

  async createOrRecoverPdfIngestion(
    input: CreateOrRecoverPdfIngestionInput,
  ): Promise<CreateOrRecoverPdfIngestionResult> {
    const existing = await this.findByIdempotency(input.requestedByEmail, input.idempotencyKey);
    if (existing) return { ingestion: reconcile(existing, input), disposition: 'recovered' };
    const { data, error } = await this.client.from('opportunity_ingestions').insert({
      opportunity_id: input.opportunityId, entry_type: 'pdf', status: 'awaiting_source',
      idempotency_key: input.idempotencyKey, requested_by_email: input.requestedByEmail,
    }).select('*').single();
    if (!error && data) return { ingestion: reconcile(data as IngestionRow, input), disposition: 'created' };
    if ((error as DatabaseErrorLike | null)?.code === '23505') {
      const raced = await this.findByIdempotency(input.requestedByEmail, input.idempotencyKey);
      if (raced) return { ingestion: reconcile(raced, input), disposition: 'recovered' };
    }
    throw translatePdfDatabaseError(error);
  }

  async getPdfIngestion(ingestionId: string): Promise<PdfIngestionRecord | null> {
    const { data, error } = await this.client.from('opportunity_ingestions')
      .select('*').eq('id', ingestionId).maybeSingle();
    if (error) throw translatePdfDatabaseError(error);
    return data ? mapRow(data as IngestionRow) : null;
  }

  async findLatestPdfIngestion(opportunityId: string, requestedByEmail: string): Promise<PdfIngestionRecord | null> {
    const { data, error } = await this.client.from('opportunity_ingestions').select('*')
      .eq('opportunity_id', opportunityId).eq('entry_type', 'pdf')
      .eq('requested_by_email', requestedByEmail).order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (error) throw translatePdfDatabaseError(error);
    return data ? mapRow(data as IngestionRow) : null;
  }

  async finalizeVerifiedPdf(input: VerifiedPdfFinalization): Promise<{
    ingestionId: string; artifactId: string; ingestionStatus: 'ready';
  }> {
    const trusted = validateVerifiedPdfFinalization(input);
    const ingestion = await this.getPdfIngestion(trusted.ingestionId);
    if (!ingestion) throw opportunityError('ingestion_not_found', 'PDF ingestion was not found.');
    if (ingestion.opportunityId !== trusted.opportunityId || ingestion.requestedByEmail !== trusted.actorEmail.toLowerCase()) {
      throw opportunityError('artifact_conflict', 'Verified artifact identity conflicts with the ingestion.');
    }
    const { data, error } = await this.client.rpc('finalize_opportunity_verified_artifact', {
      p_ingestion_id: trusted.ingestionId, p_artifact_id: trusted.artifactId,
      p_storage_bucket: trusted.storageBucket, p_storage_path: trusted.storagePath,
      p_original_filename: trusted.originalFilename, p_declared_mime_type: trusted.declaredMediaType,
      p_detected_mime_type: trusted.verified.detectedMediaType,
      p_byte_size: trusted.verified.byteSize, p_sha256_digest: trusted.verified.sha256Digest,
      p_page_count: trusted.verified.pageCount, p_document_metadata: trusted.verified.documentMetadata,
      p_actor_email: trusted.actorEmail,
    }).single();
    if (error || !data) throw translatePdfDatabaseError(error);
    const result = data as { ingestion_id: string; artifact_id: string; ingestion_status: string };
    if (result.ingestion_id !== trusted.ingestionId || result.artifact_id !== trusted.artifactId || result.ingestion_status !== 'ready') {
      throw opportunityError('artifact_conflict', 'Artifact finalization returned an inconsistent result.');
    }
    return { ingestionId: result.ingestion_id, artifactId: result.artifact_id, ingestionStatus: 'ready' };
  }

  private async findByIdempotency(actorEmail: string, key: string): Promise<IngestionRow | null> {
    const { data, error } = await this.client.from('opportunity_ingestions').select('*')
      .eq('requested_by_email', actorEmail).eq('idempotency_key', key).maybeSingle();
    if (error) throw translatePdfDatabaseError(error);
    return data as IngestionRow | null;
  }
}

export function translatePdfDatabaseError(cause: unknown) {
  const error = cause as DatabaseErrorLike | null;
  if (error?.code === 'P0002' || error?.message === 'ingestion_not_found') {
    return opportunityError('ingestion_not_found', 'PDF ingestion was not found.', cause);
  }
  if (error?.code === '23503') return opportunityError('not_found', 'Opportunity was not found.', cause);
  if (error?.code === '23505') return opportunityError('idempotency_conflict', 'The ingestion request conflicts with existing data.', cause);
  if (error?.code === '22023' && error.message?.includes('artifact')) {
    return opportunityError('artifact_conflict', 'Verified artifact conflicts with existing data.', cause);
  }
  if (error?.code === '22023') return opportunityError('invalid_upload_request', 'The PDF ingestion request is inconsistent with persisted data.', cause);
  return opportunityError('persistence', 'PDF ingestion persistence failed.', cause);
}

function reconcile(row: IngestionRow, expected: CreateOrRecoverPdfIngestionInput): PdfIngestionRecord {
  const mapped = mapRow(row);
  if (mapped.opportunityId !== expected.opportunityId || mapped.entryType !== expected.entryType ||
      mapped.requestedByEmail !== expected.requestedByEmail || mapped.idempotencyKey !== expected.idempotencyKey) {
    throw opportunityError('idempotency_conflict', 'The idempotency key conflicts with another ingestion request.');
  }
  return mapped;
}

function mapRow(row: IngestionRow): PdfIngestionRecord {
  if (!row.opportunity_id || row.entry_type !== 'pdf' || !row.idempotency_key) {
    throw opportunityError('integrity_conflict', 'Persisted PDF ingestion identity is invalid.');
  }
  return {
    ingestionId: row.id, opportunityId: row.opportunity_id, entryType: 'pdf',
    requestedByEmail: row.requested_by_email.toLowerCase(), idempotencyKey: row.idempotency_key,
    status: row.status, revision: row.revision,
    failureCode: row.failure_code, failureMessage: row.failure_message,
  };
}
