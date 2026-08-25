import { describe, expect, it, vi } from 'vitest';
import { parseCandidateDecisionRequest, recordCandidateDecision } from './candidate-decision';
const opportunityId = '11111111-1111-4111-8111-111111111111'; const candidateId = '22222222-2222-4222-8222-222222222222';
describe('candidate decision contract', () => {
  it('accepts only the two reviewed intents and a non-negative safe revision', () => {
    expect(parseCandidateDecisionRequest(opportunityId,candidateId,{decision:'approved',expectedDecisionNumber:0})).toEqual({decision:'approved',expectedDecisionNumber:0});
    expect(parseCandidateDecisionRequest(opportunityId,candidateId,{decision:'rejected',expectedDecisionNumber:3})).toEqual({decision:'rejected',expectedDecisionNumber:3});
  });
  it.each([{decision:'accepted',expectedDecisionNumber:0},{decision:'approved',expectedDecisionNumber:-1},{decision:'approved',expectedDecisionNumber:1.2},{decision:'approved',expectedDecisionNumber:0,reviewerEmail:'attacker@example.com'},{decision:'approved'},{decision:'approved',expectedDecisionNumber:0,value:'evil'}])('rejects malformed, expanded, or authority-bearing bodies', body => {
    expect(() => parseCandidateDecisionRequest(opportunityId,candidateId,body)).toThrow();
  });
  it('rejects malformed route identities', () => { expect(() => parseCandidateDecisionRequest('not-uuid',candidateId,{decision:'approved',expectedDecisionNumber:0})).toThrow(); });
  it('derives reviewer identity from the service caller and forwards no accepted value', async () => {
    const record = vi.fn().mockResolvedValue({candidateFactId:candidateId,reviewState:'approved',decisionNumber:1,decidedAt:'now',inserted:true});
    await recordCandidateDecision({opportunityId,candidateId,body:{decision:'approved',expectedDecisionNumber:0},reviewerEmail:'reviewer@upperlineco.com',repository:{record}});
    expect(record).toHaveBeenCalledWith({opportunityId,candidateId,decision:'approved',expectedDecisionNumber:0,reviewerEmail:'reviewer@upperlineco.com'});
  });
});
