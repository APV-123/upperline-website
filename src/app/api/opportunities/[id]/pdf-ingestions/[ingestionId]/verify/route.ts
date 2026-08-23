import { verifyPdfAcquisitionApi } from '@/lib/opportunities/ingestion/pdf-api';
import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: {
  params: Promise<{ id: string; ingestionId: string }>;
}) {
  const { id, ingestionId } = await params;
  return authenticatedOpportunityEndpoint(async actor => {
    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    return verifyPdfAcquisitionApi(id, ingestionId, actor, body);
  });
}
