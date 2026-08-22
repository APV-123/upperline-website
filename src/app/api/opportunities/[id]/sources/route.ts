import { addOpportunitySource, listOpportunitySources } from '@/lib/opportunities/application';
import { opportunityEndpoint } from '@/lib/opportunities/ui/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return opportunityEndpoint(({ actor, repository }) => listOpportunitySources(id, actor, repository));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return opportunityEndpoint(async ({ actor, repository }) => {
    const body = await request.json();
    return addOpportunitySource(id, { type: 'manual', sourceUrl: body.sourceUrl, primary: false }, actor, repository);
  });
}
