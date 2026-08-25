import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { recordCandidateDecision } from '@/lib/opportunities/ingestion/candidate-decision';
import { SupabaseCandidateDecisionRepository } from '@/lib/opportunities/ingestion/supabase-candidate-decision-repository';
import { SupabaseExtractionReviewRepository } from '@/lib/opportunities/ingestion/supabase-extraction-review-repository';
import { opportunityError } from '@/lib/opportunities/application/errors';

export async function PUT(request: Request, context: { params: Promise<{ opportunityId: string; candidateId: string }> }) {
  return authenticatedOpportunityEndpoint(async actor => {
    const { opportunityId, candidateId } = await context.params; let body: unknown;
    try { body = await request.json(); } catch { throw opportunityError('validation', 'Decision request must contain valid JSON.'); }
    const client = createOpportunitySupabaseClient();
    await recordCandidateDecision({ opportunityId, candidateId, body, reviewerEmail: actor.email,
      repository: new SupabaseCandidateDecisionRepository(client) });
    return new SupabaseExtractionReviewRepository(client).getLatestReview(opportunityId);
  });
}
