import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { recordCandidateDecision } from '@/lib/opportunities/ingestion/candidate-decision';
import { SupabaseCandidateDecisionRepository } from '@/lib/opportunities/ingestion/supabase-candidate-decision-repository';
import { SupabaseExtractionReviewRepository } from '@/lib/opportunities/ingestion/supabase-extraction-review-repository';
import { opportunityError } from '@/lib/opportunities/application/errors';

export async function PUT(request: Request, context: { params: Promise<{ id: string; candidateId: string }> }) {
  return authenticatedOpportunityEndpoint(async actor => {
    const { id, candidateId } = await context.params; let body: unknown;
    try { body = await request.json(); } catch { throw opportunityError('validation', 'Decision request must contain valid JSON.'); }
    const client = createOpportunitySupabaseClient();
    const reviewRepository = new SupabaseExtractionReviewRepository(client);
    const selection = await reviewRepository.getReviewSelection(id);
    const currentCandidateIds = new Set(selection.current?.groups.flatMap(group => group.items.map(item => item.candidateId)) ?? []);
    if (!currentCandidateIds.has(candidateId)) throw opportunityError('not_found', 'Current extraction candidate was not found.');
    await recordCandidateDecision({ opportunityId: id, candidateId, body, reviewerEmail: actor.email,
      repository: new SupabaseCandidateDecisionRepository(client) });
    return reviewRepository.getReviewSelection(id);
  });
}
