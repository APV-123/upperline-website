import { beforeEach, describe, expect, it, vi } from 'vitest';

const createExactReadAccess = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('./supabase-pdf-object-store', () => ({
  SupabasePrivatePdfObjectStore: class { createExactReadAccess = createExactReadAccess; },
}));
vi.mock('./pdf-storage-config', () => ({ readPdfStorageConfig: () => ({ bucket: 'private-pdfs' }) }));

import { createOpportunitySourcePdfAccess } from './source-pdf-access';

function query(result: unknown) {
  const value: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) value[method] = vi.fn(() => value);
  value.then = (resolve: (result: unknown) => void) => resolve(result);
  return value;
}

function client(artifact = { storage_bucket: 'private-pdfs', storage_path: 'opportunities/11111111-1111-4111-8111-111111111111/ingestions/22222222-2222-4222-8222-222222222222/artifacts/22222222-2222-4222-8222-222222222222/source.pdf', page_count: 4 }) {
  return { from: vi.fn((table: string) => table === 'opportunity_ingestions'
    ? query({ data: [{ id: '22222222-2222-4222-8222-222222222222' }], error: null })
    : query({ data: [artifact], error: null })) };
}

describe('authenticated source PDF resolution', () => {
  beforeEach(() => { createExactReadAccess.mockReset().mockResolvedValue({ url: 'https://storage.invalid/object?token=secret' }); });
  it('derives the exact private object from the Opportunity and returns short-lived access', async () => {
    const db = client();
    await expect(createOpportunitySourcePdfAccess(db as never, '11111111-1111-4111-8111-111111111111', null))
      .resolves.toBe('https://storage.invalid/object?token=secret');
    expect(db.from).toHaveBeenCalledWith('opportunity_ingestions');
    expect(db.from).toHaveBeenCalledWith('opportunity_source_artifacts');
    expect(createExactReadAccess).toHaveBeenCalledWith(expect.stringMatching(/source\.pdf$/), 300);
  });
  it('uses an admitted page only as a PDF fragment without changing object authority', async () => {
    await expect(createOpportunitySourcePdfAccess(client() as never, '11111111-1111-4111-8111-111111111111', 3))
      .resolves.toBe('https://storage.invalid/object?token=secret#page=3');
    expect(createExactReadAccess).toHaveBeenCalledTimes(1);
  });
  it.each([0, 5, 1.5, Number.NaN])('rejects invalid page navigation %s before signing', async page => {
    await expect(createOpportunitySourcePdfAccess(client() as never, '11111111-1111-4111-8111-111111111111', page)).rejects.toMatchObject({ kind: 'validation' });
    expect(createExactReadAccess).not.toHaveBeenCalled();
  });
  it('fails closed on a storage-bucket mismatch', async () => {
    await expect(createOpportunitySourcePdfAccess(client({ storage_bucket: 'substituted', storage_path: 'arbitrary', page_count: 4 }) as never, '11111111-1111-4111-8111-111111111111', null))
      .rejects.toMatchObject({ kind: 'integrity_conflict' });
  });
});
