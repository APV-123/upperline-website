import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { SupabaseExtractionReviewRepository } from '@/lib/opportunities/ingestion/supabase-extraction-review-repository';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return authenticatedOpportunityEndpoint(async () => new SupabaseExtractionReviewRepository(createOpportunitySupabaseClient()).getReviewSelection(id)); }
