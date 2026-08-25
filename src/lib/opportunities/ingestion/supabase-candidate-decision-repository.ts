import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import type { CandidateDecisionRepository, CandidateDecisionResult } from './candidate-decision';

type RpcRow = { candidate_fact_id: string; review_state: 'approved' | 'rejected'; decision_number: number; decided_at: string; inserted: boolean };
export class SupabaseCandidateDecisionRepository implements CandidateDecisionRepository {
  constructor(private readonly client: SupabaseClient) {}
  async record(input: Parameters<CandidateDecisionRepository['record']>[0]): Promise<CandidateDecisionResult> {
    const result = await this.client.rpc('record_opportunity_candidate_fact_decision', {
      p_opportunity_id: input.opportunityId, p_candidate_fact_id: input.candidateId,
      p_decision: input.decision, p_expected_decision_number: input.expectedDecisionNumber,
      p_reviewer_email: input.reviewerEmail,
    }).single();
    if (result.error || !result.data) throw translateDecisionError(result.error);
    const row = result.data as RpcRow;
    return { candidateFactId: row.candidate_fact_id, reviewState: row.review_state,
      decisionNumber: row.decision_number, decidedAt: row.decided_at, inserted: row.inserted };
  }
}
function translateDecisionError(cause: unknown) {
  const error = cause as { code?: string; message?: string } | null;
  if (error?.message === 'candidate_decision_revision_conflict') return opportunityError('revision_conflict', 'This candidate decision changed; refresh and retry.', cause);
  if (error?.message === 'candidate_not_currently_reviewable') return opportunityError('revision_conflict', 'This candidate is no longer available for review.', cause);
  if (error?.message === 'candidate_decision_invalid' || error?.message === 'candidate_decision_revision_invalid' || error?.message === 'candidate_not_approvable') return opportunityError('validation', 'The candidate decision is invalid.', cause);
  if (error?.message === 'candidate_decision_reviewer_required') return opportunityError('forbidden', 'A reviewer identity is required.', cause);
  return opportunityError('persistence_failure', 'The candidate decision could not be saved.', cause);
}
