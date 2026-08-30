import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import { buildExtractionReviewModel, type ExtractionReviewCandidate, type ExtractionReviewDecision, type ExtractionReviewModel, type ExtractionReviewSelection } from './extraction-review';
import type { CandidateUnit, CandidateValueType, CandidateValidationState } from './contracts';
import { currentExtractionLogicalKey } from './extraction-control';

type RunRow = { id: string; attempt_number: number; completed_at: string | null; created_at: string; logical_extraction_key: string; extraction_version: string; schema_version: string };
type CandidateRow = { id: string; field_path: string; normalized_value_type: CandidateValueType; normalized_value: unknown; unit: CandidateUnit | null; group_key: string | null; assertion_basis: string; confidence: string | null; validation_state: CandidateValidationState; validation_issues: unknown; ordinal: number; candidate_fingerprint: string };
type EvidenceRow = { candidate_fact_id: string; page_number: number | null; snippet: string | null; bounding_box: unknown; section_label: string | null; extraction_method: string; extraction_version: string | null; ordinal: number };
type DecisionRow = { candidate_fact_id: string; decision_number: number; decision: 'accepted' | 'edited_and_accepted' | 'rejected'; decided_at: string };

export class SupabaseExtractionReviewRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getReviewSelection(opportunityId: string): Promise<ExtractionReviewSelection> {
    const opportunity = await this.client.from('acquisition_opportunities').select('id').eq('id', opportunityId).maybeSingle();
    if (opportunity.error) throw failure(opportunity.error);
    if (!opportunity.data) throw opportunityError('not_found', 'Opportunity was not found.');
    const ingestions = await this.client.from('opportunity_ingestions').select('id').eq('opportunity_id', opportunityId).eq('entry_type', 'pdf').order('created_at', { ascending: false });
    if (ingestions.error) throw failure(ingestions.error);
    const ingestionIds = (ingestions.data ?? []).map((row: { id: string }) => row.id);
    if (ingestionIds.length === 0) return { current: null, historical: [] };
    const artifact = await this.client.from('opportunity_source_artifacts').select('id,ingestion_id,sha256_digest').in('ingestion_id', ingestionIds).eq('validation_status', 'valid').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (artifact.error) throw failure(artifact.error);
    if (!artifact.data) return { current: null, historical: [] };
    const artifactRow = artifact.data as { id: string; ingestion_id: string; sha256_digest: string };
    const ingestionId = artifactRow.ingestion_id;
    const runs = await this.client.from('opportunity_extraction_runs').select('id,attempt_number,completed_at,created_at,logical_extraction_key,extraction_version,schema_version')
      .eq('ingestion_id', ingestionId).eq('artifact_id', artifactRow.id).eq('status', 'succeeded')
      .order('completed_at', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (runs.error) throw failure(runs.error);
    const rows = (runs.data ?? []) as RunRow[];
    const currentLogicalExtractionKey = currentExtractionLogicalKey(artifactRow.sha256_digest);
    const currentRun = rows.filter(row => row.logical_extraction_key === currentLogicalExtractionKey).sort((a, b) => b.attempt_number - a.attempt_number)[0] ?? null;
    const historicalRuns = rows.filter(row => row.logical_extraction_key !== currentLogicalExtractionKey);
    return { current: currentRun ? await this.buildReview(ingestionId, artifactRow.id, currentRun) : null,
      historical: await Promise.all(historicalRuns.map(run => this.buildReview(ingestionId, artifactRow.id, run))) };
  }

  private async buildReview(ingestionId: string, artifactId: string, run: RunRow): Promise<ExtractionReviewModel> {
    const candidatesResult = await this.client.from('opportunity_candidate_facts').select('id,field_path,normalized_value_type,normalized_value,unit,group_key,assertion_basis,confidence,validation_state,validation_issues,ordinal,candidate_fingerprint').eq('ingestion_id', ingestionId).eq('artifact_id', artifactId).eq('extraction_run_id', run.id).order('ordinal', { ascending: true });
    if (candidatesResult.error) throw failure(candidatesResult.error);
    const rows = (candidatesResult.data ?? []) as CandidateRow[];
    const ids = rows.map(row => row.id);
    const evidenceResult = ids.length === 0 ? { data: [] as EvidenceRow[], error: null } : await this.client.from('opportunity_candidate_fact_evidence').select('candidate_fact_id,page_number,snippet,bounding_box,section_label,extraction_method,extraction_version,ordinal').eq('ingestion_id', ingestionId).eq('artifact_id', artifactId).eq('extraction_run_id', run.id).in('candidate_fact_id', ids).order('ordinal', { ascending: true });
    if (evidenceResult.error) throw failure(evidenceResult.error);
    const decisionsResult = ids.length === 0 ? { data: [] as DecisionRow[], error: null } : await this.client.from('opportunity_candidate_fact_decisions').select('candidate_fact_id,decision_number,decision,decided_at').in('candidate_fact_id', ids).order('decision_number', { ascending: true });
    if (decisionsResult.error) throw failure(decisionsResult.error);
    const latestDecisions = new Map<string, ExtractionReviewDecision>();
    for (const decision of decisionsResult.data as DecisionRow[]) latestDecisions.set(decision.candidate_fact_id, { state: decision.decision === 'rejected' ? 'rejected' : 'approved', decisionNumber: decision.decision_number, decidedAt: decision.decided_at });
    const evidence = evidenceResult.data as EvidenceRow[];
    const candidates: ExtractionReviewCandidate[] = rows.map(row => ({ id: row.id, fieldPath: row.field_path, valueType: row.normalized_value_type, value: row.normalized_value, unit: row.unit, groupKey: row.group_key, assertionBasis: row.assertion_basis, confidence: row.confidence, validationState: row.validation_state, validationIssues: Array.isArray(row.validation_issues) ? row.validation_issues.filter((x): x is string => typeof x === 'string') : [], ordinal: row.ordinal, fingerprint: row.candidate_fingerprint, latestDecision: latestDecisions.get(row.id) ?? null, evidence: evidence.filter(item => item.candidate_fact_id === row.id).map(item => ({ pageNumber: item.page_number, snippet: item.snippet, sectionLabel: item.section_label, boundingBoxAvailable: item.bounding_box !== null && typeof item.bounding_box === 'object' && !Array.isArray(item.bounding_box), extractionMethod: item.extraction_method, extractionVersion: item.extraction_version })) }));
    return buildExtractionReviewModel({ attemptNumber: run.attempt_number, completedAt: run.completed_at, extractionVersion: run.extraction_version, schemaVersion: run.schema_version, candidates });
  }
}

function failure(cause: unknown) { return opportunityError('persistence_failure', 'Extraction review could not be loaded.', cause); }
