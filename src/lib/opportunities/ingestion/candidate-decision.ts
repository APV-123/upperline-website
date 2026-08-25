import { opportunityError } from '../application/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CandidateDecisionIntent = 'approved' | 'rejected';
export type CandidateDecisionRequest = { decision: CandidateDecisionIntent; expectedDecisionNumber: number };
export type CandidateDecisionResult = { candidateFactId: string; reviewState: CandidateDecisionIntent; decisionNumber: number; decidedAt: string; inserted: boolean };
export interface CandidateDecisionRepository { record(input: { opportunityId: string; candidateId: string; decision: CandidateDecisionIntent; expectedDecisionNumber: number; reviewerEmail: string }): Promise<CandidateDecisionResult> }

export function parseCandidateDecisionRequest(opportunityId: string, candidateId: string, body: unknown): CandidateDecisionRequest {
  if (!UUID.test(opportunityId) || !UUID.test(candidateId)) throw opportunityError('validation', 'Opportunity and candidate IDs must be valid UUIDs.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw opportunityError('validation', 'Decision request must be an object.');
  const record = body as Record<string, unknown>; const allowed = new Set(['decision', 'expectedDecisionNumber']);
  if (Object.keys(record).some(key => !allowed.has(key)) || Object.keys(record).length !== 2) throw opportunityError('validation', 'Decision request contains invalid properties.');
  if (record.decision !== 'approved' && record.decision !== 'rejected') throw opportunityError('validation', 'Decision must be approved or rejected.');
  if (!Number.isSafeInteger(record.expectedDecisionNumber) || (record.expectedDecisionNumber as number) < 0) throw opportunityError('validation', 'Expected decision number must be a non-negative integer.');
  return { decision: record.decision, expectedDecisionNumber: record.expectedDecisionNumber as number };
}

export async function recordCandidateDecision(input: { opportunityId: string; candidateId: string; body: unknown; reviewerEmail: string; repository: CandidateDecisionRepository }): Promise<CandidateDecisionResult> {
  if (!input.reviewerEmail.trim()) throw opportunityError('forbidden', 'A reviewer identity is required.');
  const request = parseCandidateDecisionRequest(input.opportunityId, input.candidateId, input.body);
  return input.repository.record({ opportunityId: input.opportunityId, candidateId: input.candidateId, reviewerEmail: input.reviewerEmail, ...request });
}
