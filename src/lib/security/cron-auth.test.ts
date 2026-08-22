import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from './cron-auth';

const request = (authorization?: string) => new Request('https://example.test/api/internal/sync', {
  ...(authorization && { headers: { authorization } }),
});

describe('cron authentication', () => {
  it('accepts the configured Bearer credential', () => {
    expect(isAuthorizedCronRequest(request('Bearer replacement-secret'), 'replacement-secret')).toBe(true);
  });

  it('rejects a missing Authorization header', () => {
    expect(isAuthorizedCronRequest(request(), 'replacement-secret')).toBe(false);
  });

  it('rejects an invalid Bearer credential', () => {
    expect(isAuthorizedCronRequest(request('Bearer invalid'), 'replacement-secret')).toBe(false);
  });

  it.each([undefined, '', '   '])('fails closed when server configuration is %p', (secret) => {
    expect(isAuthorizedCronRequest(request('Bearer replacement-secret'), secret)).toBe(false);
  });

  it('does not expose credential values through its result', () => {
    const supplied = 'credential-that-must-not-leak';
    expect(String(isAuthorizedCronRequest(request(`Bearer ${supplied}`), 'different-secret')))
      .not.toContain(supplied);
  });
});
