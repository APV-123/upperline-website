import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ actor: vi.fn(), repository: vi.fn() }));
vi.mock('../application', () => {
  class OpportunityApplicationError extends Error { constructor(readonly kind: string, message: string) { super(message); } }
  return { requireUpperlineUser: mocks.actor, SupabaseOpportunityRepository: mocks.repository, OpportunityApplicationError };
});
import { opportunityEndpoint } from './server';
import { PersistenceEnvelopeValidationError } from '../underwriting/retail-development-persistence';

describe('Opportunity route boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('rejects an unauthenticated mutation before invoking it', async () => {
    const { OpportunityApplicationError } = await import('../application');
    mocks.actor.mockRejectedValue(new OpportunityApplicationError('unauthorized' as never, 'Authentication is required.'));
    const operation = vi.fn(); const response = await opportunityEndpoint(operation);
    expect(response.status).toBe(401); expect(operation).not.toHaveBeenCalled(); expect(await response.json()).toEqual({ok:false,error:{kind:'unauthorized',message:'Authentication is required.'}});
  });
  it('rejects a non-Upperline actor before invoking it', async () => {
    const { OpportunityApplicationError } = await import('../application');
    mocks.actor.mockRejectedValue(new OpportunityApplicationError('forbidden' as never, 'Upperline access is required.'));
    const operation = vi.fn(); const response = await opportunityEndpoint(operation);
    expect(response.status).toBe(403); expect(operation).not.toHaveBeenCalled();
  });
  it('sanitizes unexpected persistence failures', async () => { mocks.actor.mockResolvedValue({email:'user@upperlineco.com',name:'User'}); mocks.repository.mockImplementation(function Repository(){ return {}; }); const response=await opportunityEndpoint(async()=>{throw new Error('postgresql://secret')}); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain('postgresql'); });
  it('maps persistence-envelope input failures to sanitized HTTP 400 validation', async () => { mocks.actor.mockResolvedValue({email:'user@upperlineco.com',name:'User'}); mocks.repository.mockImplementation(function Repository(){ return {}; }); const response=await opportunityEndpoint(async()=>{throw new PersistenceEnvelopeValidationError(['site.landAreaSf: Must be a finite value greater than or equal to zero.'])}); expect(response.status).toBe(400); expect(await response.json()).toEqual({ok:false,error:{kind:'validation',message:'Underwriting assumptions are invalid: site.landAreaSf: Must be a finite value greater than or equal to zero.'}}); });
});
