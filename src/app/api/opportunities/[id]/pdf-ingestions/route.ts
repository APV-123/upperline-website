import { beginPdfAcquisitionApi, getPdfAcquisitionStateApi } from '@/lib/opportunities/ingestion/pdf-api';
import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return authenticatedOpportunityEndpoint(actor => getPdfAcquisitionStateApi(id, actor));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return authenticatedOpportunityEndpoint(async actor => {
    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    return beginPdfAcquisitionApi(id, actor, body);
  });
}
