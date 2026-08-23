import { describe, expect, it, vi } from 'vitest';
import { uploadPrivateDealDocument } from './private-document-upload';

const DEAL_ID = '11111111-1111-4111-8111-111111111111';

describe('private Deal document browser upload', () => {
  it('requests server-derived identity and uploads only through the exact signed authorization', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: {
        authorization: 'https://storage.invalid/exact?token=secret',
        objectPath: `deals/${DEAL_ID}/private-documents/investment_memorandum/22222222-2222-4222-8222-222222222222.pdf`,
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const file = new File(['pdf'], 'memo.pdf', { type: 'application/pdf' });
    const path = await uploadPrivateDealDocument(DEAL_ID, 'investment_memorandum', file, fetcher);
    expect(path).toContain('/investment_memorandum/');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ documentType: 'investment_memorandum', filename: 'memo.pdf' });
    expect(fetcher.mock.calls[1][0]).toBe('https://storage.invalid/exact?token=secret');
    expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'PUT', headers: { 'x-upsert': 'false' } });
  });

  it('does not return a new reference when authorization or byte upload fails', async () => {
    const denied = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { message: 'Authentication is required.' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await expect(uploadPrivateDealDocument(DEAL_ID, 'investment_memorandum', new File(['x'], 'memo.pdf'), denied))
      .rejects.toThrow('Authentication is required.');
    const uploadFailure = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { authorization: 'https://storage.invalid/exact', objectPath: 'safe/path.pdf' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(uploadPrivateDealDocument(DEAL_ID, 'investment_memorandum', new File(['x'], 'memo.pdf'), uploadFailure))
      .rejects.toThrow('Private document upload failed.');
  });
});
