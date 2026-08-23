import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ actor: vi.fn(), repository: vi.fn() }));
vi.mock('../application', () => {
  class OpportunityApplicationError extends Error { constructor(readonly kind: string, message: string) { super(message); } }
  return { requireUpperlineUser: mocks.actor, SupabaseOpportunityRepository: mocks.repository, OpportunityApplicationError };
});
import { authenticatedOpportunityEndpoint, opportunityEndpoint, translateOpportunityHttpError } from './server';
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
  it('resolves the authenticated actor server-side for actor-only acquisition routes', async () => {
    const actor = {email:'user@upperlineco.com',name:'User'};
    mocks.actor.mockResolvedValue(actor);
    const operation = vi.fn().mockResolvedValue({ ingestionId: 'safe' });
    const response = await authenticatedOpportunityEndpoint(operation);
    expect(response.status).toBe(200); expect(operation).toHaveBeenCalledWith(actor);
    expect(await response.json()).toEqual({ ok: true, data: { ingestionId: 'safe' } });
  });
  it('sanitizes unexpected persistence failures', async () => { mocks.actor.mockResolvedValue({email:'user@upperlineco.com',name:'User'}); mocks.repository.mockImplementation(function Repository(){ return {}; }); const response=await opportunityEndpoint(async()=>{throw new Error('postgresql://secret')}); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain('postgresql'); });
  it('maps persistence-envelope input failures to sanitized HTTP 400 validation', async () => { mocks.actor.mockResolvedValue({email:'user@upperlineco.com',name:'User'}); mocks.repository.mockImplementation(function Repository(){ return {}; }); const response=await opportunityEndpoint(async()=>{throw new PersistenceEnvelopeValidationError(['site.landAreaSf: Must be a finite value greater than or equal to zero.'])}); expect(response.status).toBe(400); expect(await response.json()).toEqual({ok:false,error:{kind:'validation',message:'Underwriting assumptions are invalid: site.landAreaSf: Must be a finite value greater than or equal to zero.'}}); });
});

describe('Opportunity acquisition HTTP translation', () => {
  it.each([
    ['invalid_upload_request', 400], ['unsupported_document', 415], ['upload_too_large', 413],
    ['ingestion_not_found', 404], ['upload_missing', 404], ['idempotency_conflict', 409],
    ['upload_conflict', 409], ['artifact_conflict', 409], ['invalid_pdf', 422],
    ['encrypted_pdf', 422], ['malformed_pdf', 422], ['pdf_page_limit', 422], ['storage_unavailable', 503],
    ['verification_failure', 500],
  ])('maps %s intentionally to %s', async (kind, status) => {
    const { OpportunityApplicationError } = await import('../application');
    expect(translateOpportunityHttpError(new OpportunityApplicationError(kind as never, 'Safe message.')))
      .toEqual({ status, error: { kind, message: 'Safe message.' } });
  });
  it('sanitizes unexpected internal failures', () => {
    const result = translateOpportunityHttpError(new Error('token=secret postgresql://internal'));
    expect(result).toEqual({ status: 500, error: { kind: 'unexpected',
      message: 'The Opportunity request could not be completed.' } });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
