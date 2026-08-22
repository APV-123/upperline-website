import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { from, syncHubspotCommunications, syncGraphCommunications } = vi.hoisted(() => ({
  from: vi.fn(),
  syncHubspotCommunications: vi.fn(),
  syncGraphCommunications: vi.fn(),
}));

vi.mock('@/lib/SupabaseServer', () => ({ supabaseServer: { from } }));
vi.mock('@/lib/communications/SyncCommunications', () => ({ syncHubspotCommunications }));
vi.mock('@/lib/communications/SyncGraphCommunications', () => ({ syncGraphCommunications }));

import { GET } from './route';

const call = (authorization?: string) => GET(new Request('https://example.test/api/internal/sync', {
  ...(authorization && { headers: { authorization } }),
}));

describe('communications cron route authentication', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'replacement-secret');
    from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    syncGraphCommunications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('runs with the valid Vercel Bearer credential', async () => {
    const response = await call('Bearer replacement-secret');

    expect(response.status).toBe(200);
    expect(syncGraphCommunications).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing authentication', undefined],
    ['invalid authentication', 'Bearer invalid'],
  ])('rejects %s with a sanitized response', async (_label, authorization) => {
    const response = await call(authorization);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: 'Unauthorized' });
    expect(from).not.toHaveBeenCalled();
  });

  it('fails closed when CRON_SECRET is missing', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const response = await call('Bearer replacement-secret');

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('never includes supplied credentials in an authentication response', async () => {
    const supplied = 'credential-that-must-not-leak';
    const response = await call(`Bearer ${supplied}`);

    expect(await response.text()).not.toContain(supplied);
  });
});
