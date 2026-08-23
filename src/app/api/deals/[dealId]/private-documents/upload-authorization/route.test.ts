import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { actor, createSignedUploadUrl, maybeSingle } = vi.hoisted(() => ({
  actor: vi.fn(), createSignedUploadUrl: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('../../../../../../lib/opportunities/application/actor', () => ({ requireUpperlineUser: actor }));
vi.mock('../../../../../../lib/SupabaseServer', () => ({ supabaseServer: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  storage: { from: () => ({ createSignedUploadUrl }) },
} }));

import { POST } from './route';

const DEAL_ID = '11111111-1111-4111-8111-111111111111';
const context = { params: Promise.resolve({ dealId: DEAL_ID }) };
const request = (body: unknown) => new Request('https://app.invalid/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('private Deal upload authorization route', () => {
  beforeEach(() => {
    vi.clearAllMocks(); actor.mockResolvedValue({ email: 'admin@upperlineco.com', name: 'Admin' });
    maybeSingle.mockResolvedValue({ data: { id: DEAL_ID }, error: null });
    createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.invalid/exact' }, error: null });
  });

  it.each([
    ['unauthorized', 401, 'Authentication is required.'],
    ['forbidden', 403, 'Upperline access is required.'],
  ])('rejects %s actors before Storage', async (kind, status, message) => {
    actor.mockRejectedValue(Object.assign(new Error('internal'), { kind }));
    const response = await POST(request({ documentType: 'investment_memorandum', filename: 'memo.pdf' }), context);
    expect(response.status).toBe(status); expect(await response.json()).toEqual({ ok: false, error: { message } });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects actor, bucket, or path spoofing as a sanitized validation error', async () => {
    const response = await POST(request({ documentType: 'investment_memorandum', filename: 'memo.pdf',
      actor: 'attacker@example.com', bucket: 'other', path: 'other/path' }), context);
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ ok: false,
      error: { message: 'Private document upload request is invalid.' } });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('returns only exact signed authorization and server-derived object path', async () => {
    const response = await POST(request({ documentType: 'investment_memorandum', filename: 'memo.pdf' }), context);
    const payload = await response.json(); expect(response.status).toBe(200);
    expect(payload.ok).toBe(true); expect(payload.data.authorization).toBe('https://storage.invalid/exact');
    expect(payload.data.objectPath).toMatch(new RegExp(`^deals/${DEAL_ID}/private-documents/investment_memorandum/.+\\.pdf$`));
    expect(payload.data).not.toHaveProperty('bucket'); expect(payload.data).not.toHaveProperty('actor');
  });
});
