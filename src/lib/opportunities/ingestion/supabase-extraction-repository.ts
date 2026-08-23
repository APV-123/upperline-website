import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import type {
  ExtractionCompletionCandidate, ExtractionRepositoryPort, ExtractionRunRecord,
  VerifiedExtractionArtifact,
} from './extraction-contracts';

type ArtifactRow = { id: string; ingestion_id: string; storage_path: string; sha256_digest: string;
  byte_size: number; page_count: number; detected_mime_type: string; validation_status: string };
type IngestionRow = { id: string; opportunity_id: string; status: string };
type RunRow = { id: string; attempt_number: number; status: ExtractionRunRecord['status'] };

export class SupabaseExtractionRepository implements ExtractionRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async resolveEligibleArtifact(opportunityId: string): Promise<VerifiedExtractionArtifact | null> {
    const ingestionResult = await this.client.from('opportunity_ingestions').select('id,opportunity_id,status')
      .eq('opportunity_id', opportunityId).eq('entry_type', 'pdf')
      .in('status', ['ready', 'extracting', 'review_ready', 'failed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (ingestionResult.error) throw persistenceFailure(ingestionResult.error);
    if (!ingestionResult.data) return null;
    const ingestion = ingestionResult.data as IngestionRow;
    const artifactResult = await this.client.from('opportunity_source_artifacts')
      .select('id,ingestion_id,storage_path,sha256_digest,byte_size,page_count,detected_mime_type,validation_status')
      .eq('ingestion_id', ingestion.id).eq('validation_status', 'valid').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (artifactResult.error) throw persistenceFailure(artifactResult.error);
    if (!artifactResult.data) return null;
    const artifact = artifactResult.data as ArtifactRow;
    if (artifact.detected_mime_type !== 'application/pdf' || !artifact.page_count || !artifact.byte_size) return null;
    return { opportunityId: ingestion.opportunity_id, ingestionId: ingestion.id, artifactId: artifact.id,
      storagePath: artifact.storage_path, sha256Digest: artifact.sha256_digest,
      byteSize: artifact.byte_size, pageCount: artifact.page_count, detectedMediaType: 'application/pdf' };
  }

  async allocateRun(input: Parameters<ExtractionRepositoryPort['allocateRun']>[0]): Promise<Awaited<ReturnType<ExtractionRepositoryPort['allocateRun']>>> {
    const result = await this.client.rpc('allocate_opportunity_extraction_run', {
      p_ingestion_id: input.artifact.ingestionId, p_artifact_id: input.artifact.artifactId,
      p_run_id: input.runId, p_run_idempotency_key: input.idempotencyKey,
      p_extraction_strategy: input.configuration.extractionStrategy,
      p_extraction_version: input.configuration.extractionVersion, p_provider: input.configuration.provider,
      p_model: input.configuration.model, p_parser_version: input.configuration.parserVersion,
      p_prompt_version: input.configuration.promptVersion, p_schema_version: input.configuration.schemaVersion,
      p_input_digest: input.artifact.sha256Digest, p_actor_email: input.actorEmail,
    }).single();
    if (result.error || !result.data) throw persistenceFailure(result.error);
    const row = result.data as { run_id: string; attempt_number: number; run_status: ExtractionRunRecord['status'] };
    return { run: { runId: row.run_id, attemptNumber: row.attempt_number, status: row.run_status },
      disposition: row.run_id === input.runId ? 'allocated' : 'recovered' };
  }

  async completeRun(input: Parameters<ExtractionRepositoryPort['completeRun']>[0]): Promise<ExtractionRunRecord> {
    const result = await this.client.rpc('complete_opportunity_extraction_run', {
      p_ingestion_id: input.artifact.ingestionId, p_artifact_id: input.artifact.artifactId,
      p_run_id: input.runId, p_candidates: input.candidates, p_diagnostics: input.diagnostics,
    }).single();
    if (result.error || !result.data) throw persistenceFailure(result.error);
    const row = result.data as { run_id: string; candidate_count: number; evidence_count: number; run_status: ExtractionRunRecord['status'] };
    return { runId: row.run_id, attemptNumber: await this.readAttempt(row.run_id), status: row.run_status,
      candidateCount: row.candidate_count, evidenceCount: row.evidence_count };
  }

  async failRun(input: Parameters<ExtractionRepositoryPort['failRun']>[0]): Promise<void> {
    const result = await this.client.rpc('fail_opportunity_extraction_run', {
      p_ingestion_id: input.artifact.ingestionId, p_artifact_id: input.artifact.artifactId,
      p_run_id: input.runId, p_failure_code: input.failureCode,
      p_failure_message: input.failureMessage, p_diagnostics: input.diagnostics,
    });
    if (result.error) throw persistenceFailure(result.error);
  }

  async recoverSucceededRun(runId: string): Promise<ExtractionRunRecord> {
    const runResult = await this.client.from('opportunity_extraction_runs').select('id,attempt_number,status').eq('id', runId).single();
    if (runResult.error || !runResult.data) throw persistenceFailure(runResult.error);
    const row = runResult.data as RunRow;
    if (row.status !== 'succeeded') throw opportunityError('persistence_failure', 'Succeeded extraction could not be recovered.');
    const candidateResult = await this.client.from('opportunity_candidate_facts').select('id', { count: 'exact', head: true }).eq('extraction_run_id', runId);
    const evidenceResult = await this.client.from('opportunity_candidate_fact_evidence').select('id', { count: 'exact', head: true }).eq('extraction_run_id', runId);
    if (candidateResult.error || evidenceResult.error) throw persistenceFailure(candidateResult.error ?? evidenceResult.error);
    return { runId, attemptNumber: row.attempt_number, status: 'succeeded', candidateCount: candidateResult.count ?? 0, evidenceCount: evidenceResult.count ?? 0 };
  }
  private async readAttempt(runId: string): Promise<number> {
    const result = await this.client.from('opportunity_extraction_runs').select('attempt_number').eq('id', runId).single();
    if (result.error || !result.data) throw persistenceFailure(result.error);
    return (result.data as { attempt_number: number }).attempt_number;
  }
}

function persistenceFailure(cause: unknown) { return opportunityError('persistence_failure', 'Extraction persistence failed.', cause); }

export type { ExtractionCompletionCandidate };
