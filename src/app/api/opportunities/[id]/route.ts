import { getOpportunity, updateOpportunity } from '@/lib/opportunities/application';
import { opportunityEndpoint } from '@/lib/opportunities/ui/server';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return opportunityEndpoint(({ actor, repository }) => getOpportunity(id, actor, repository)); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return opportunityEndpoint(async ({ actor, repository }) => { const body = await request.json(); return updateOpportunity(id, body.revision, body.patch, actor, repository); }); }
