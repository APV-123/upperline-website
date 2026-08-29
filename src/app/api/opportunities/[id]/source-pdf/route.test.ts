import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireUpperlineUser, createOpportunitySourcePdfAccess } = vi.hoisted(() => ({
  requireUpperlineUser: vi.fn(), createOpportunitySourcePdfAccess: vi.fn(),
}));
vi.mock('@/lib/opportunities/application', () => ({ requireUpperlineUser }));
vi.mock('@/lib/opportunities/persistence/client', () => ({ createOpportunitySupabaseClient: () => ({ server: true }) }));
vi.mock('@/lib/opportunities/ingestion/source-pdf-access', () => ({ createOpportunitySourcePdfAccess }));
vi.mock('@/lib/opportunities/ui/server', () => ({ translateOpportunityHttpError: (cause: { kind?: string }) => ({
  status: cause.kind === 'unauthorized' ? 401 : cause.kind === 'forbidden' ? 403 : 500,
  error: { kind: cause.kind ?? 'unexpected', message: 'Sanitized failure.' },
}) }));

import { GET } from './route';

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET Opportunity source PDF', () => {
  beforeEach(() => {
    requireUpperlineUser.mockReset().mockResolvedValue({ email: 'reviewer@upperlineco.com' });
    createOpportunitySourcePdfAccess.mockReset().mockResolvedValue('https://storage.invalid/read?token=opaque');
  });
  it.each([['unauthorized', 401], ['forbidden', 403]] as const)('denies %s access before resolving any object', async (kind, status) => {
    requireUpperlineUser.mockRejectedValue({ kind });
    const response = await GET(new Request('https://portal.invalid/api/opportunities/11111111-1111-4111-8111-111111111111/source-pdf'), context('11111111-1111-4111-8111-111111111111'));
    expect(response.status).toBe(status);
    expect(createOpportunitySourcePdfAccess).not.toHaveBeenCalled();
  });
  it('passes only the path Opportunity and page-navigation value to the server resolver', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const response = await GET(new Request(`https://portal.invalid/api/opportunities/${id}/source-pdf?page=2&artifactId=22222222-2222-4222-8222-222222222222&storagePath=hostile`), context(id));
    expect(response.status).toBe(307);
    expect(createOpportunitySourcePdfAccess).toHaveBeenCalledWith({ server: true }, id, 2);
  });
});
