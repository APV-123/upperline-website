import { createRetailDevelopmentUnderwritingDraft, listUnderwritingVersions } from '@/lib/opportunities/application';
import { opportunityEndpoint } from '@/lib/opportunities/ui/server';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return opportunityEndpoint(({ actor, repository }) => listUnderwritingVersions(id, actor, repository)); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return opportunityEndpoint(async ({ actor, repository }) => { const body = await request.json(); return createRetailDevelopmentUnderwritingDraft(id, body.envelope, actor, repository, { makeActive: true }); }); }
