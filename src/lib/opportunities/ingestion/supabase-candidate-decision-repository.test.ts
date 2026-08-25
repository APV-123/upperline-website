import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseCandidateDecisionRepository } from './supabase-candidate-decision-repository';
const input = {opportunityId:'11111111-1111-4111-8111-111111111111',candidateId:'22222222-2222-4222-8222-222222222222',decision:'approved' as const,expectedDecisionNumber:0,reviewerEmail:'reviewer@upperlineco.com'};
function client(result:{data:unknown;error:unknown}) { const single=vi.fn().mockResolvedValue(result); const rpc=vi.fn(()=>({single})); return {value:{rpc} as unknown as SupabaseClient,rpc}; }
describe('candidate decision Supabase repository', () => {
  it('invokes only the installed transactional RPC with server-derived authority', async () => { const fake=client({data:{candidate_fact_id:input.candidateId,review_state:'approved',decision_number:1,decided_at:'now',inserted:true},error:null}); await expect(new SupabaseCandidateDecisionRepository(fake.value).record(input)).resolves.toMatchObject({reviewState:'approved',decisionNumber:1}); expect(fake.rpc).toHaveBeenCalledWith('record_opportunity_candidate_fact_decision',{p_opportunity_id:input.opportunityId,p_candidate_fact_id:input.candidateId,p_decision:'approved',p_expected_decision_number:0,p_reviewer_email:input.reviewerEmail}); });
  it.each([['candidate_decision_revision_conflict','revision_conflict'],['candidate_not_currently_reviewable','revision_conflict'],['candidate_decision_invalid','validation'],['candidate_not_approvable','validation'],['candidate_decision_reviewer_required','forbidden'],['raw database detail','persistence_failure']])('sanitizes database failure %s', async (message,kind) => { const fake=client({data:null,error:{code:'XX000',message,details:'secret'}}); await expect(new SupabaseCandidateDecisionRepository(fake.value).record(input)).rejects.toMatchObject({kind}); });
});
