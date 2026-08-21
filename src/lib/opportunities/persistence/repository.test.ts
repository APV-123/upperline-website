import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { DEFAULT_CALCULATION_POLICY } from '../../underwriting/retail-development';
import { marketInput } from '../../underwriting/retail-development/tests/fixtures/canonical';
import { RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION } from '../underwriting/retail-development-persistence';
import { SupabaseOpportunityRepository } from './repository';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

if (marketInput.leasing.mode !== 'market') throw new Error('Expected market fixture.');
const envelope = {
  schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
  engineInput: { ...marketInput, leasing: marketInput.leasing },
};

describe('Supabase Opportunity RPC repository', () => {
  it('keeps adapter names and high-risk parameters anchored to the committed SQL', () => {
    const sql = readFileSync(join(process.cwd(),
      'supabase/migrations/20260821000200_create_opportunity_transaction_rpcs.sql'), 'utf8');
    for (const contract of [
      ['create_opportunity_underwriting_draft', 'p_opportunity_id uuid', 'p_make_active boolean'],
      ['clone_opportunity_underwriting_version', 'p_source_version_id uuid', 'p_expected_revision integer'],
      ['set_active_opportunity_underwriting', 'p_opportunity_id uuid', 'p_version_id uuid'],
      ['replace_opportunity_field_provenance', 'p_domain text', 'p_tenant_key uuid'],
    ]) {
      const [name, ...parameters] = contract;
      const start = sql.indexOf(`create function public.${name}(`);
      expect(start).toBeGreaterThan(-1);
      const signature = sql.slice(start, sql.indexOf(')', start) + 1);
      for (const parameter of parameters) expect(signature).toContain(parameter);
    }
  });
  it('uses the four exact committed RPC names and parameter contracts', async () => {
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
    const client = {
      rpc(name: string, parameters: Record<string, unknown>) {
        calls.push({ name, parameters });
        const dataByName: Record<string, Record<string, unknown>> = {
          create_opportunity_underwriting_draft: { version_id: 'version' },
          clone_opportunity_underwriting_version: { version_id: 'clone' },
          set_active_opportunity_underwriting: { version_id: 'active' },
          replace_opportunity_field_provenance: { provenance_id: 'provenance' },
        };
        return { single: async () => ({ data: dataByName[name], error: null }) };
      },
    };
    const repository = new SupabaseOpportunityRepository(client as never);

    await repository.createDraft('opportunity', envelope, DEFAULT_CALCULATION_POLICY,
      'actor@upperlineco.com', true);
    await repository.cloneVersion('version', 3, 'actor@upperlineco.com');
    await repository.setActive('opportunity', 'version', 4, 'actor@upperlineco.com');
    await repository.replaceProvenance({
      opportunityId: 'opportunity', domain: 'tenant', fieldPath: 'rentalRatePerSfYear',
      provenanceType: 'manual', actorEmail: 'actor@upperlineco.com',
      underwritingVersionId: 'version', tenantKey: 'tenant',
    });

    expect(calls.map(({ name }) => name)).toEqual([
      'create_opportunity_underwriting_draft',
      'clone_opportunity_underwriting_version',
      'set_active_opportunity_underwriting',
      'replace_opportunity_field_provenance',
    ]);
    expect(calls[0].parameters).toMatchObject({
      p_opportunity_id: 'opportunity', p_make_active: true,
      p_actor_email: 'actor@upperlineco.com',
    });
    expect(calls[3].parameters).toMatchObject({
      p_domain: 'tenant', p_underwriting_version_id: 'version',
      p_tenant_key: 'tenant', p_field_path: 'rentalRatePerSfYear',
    });
  });

  it('builds an active-underwriting inner join for summary filters with stable pagination', async () => {
    let requestedUrl = '';
    const client = createClient('http://127.0.0.1:54321', 'test-key', {
      global: { fetch: async (input, init) => {
        requestedUrl = String(input);
        void init;
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json', 'content-range': '*/0' },
        });
      } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const repository = new SupabaseOpportunityRepository(client);
    await repository.listOpportunities({
      page: 2, pageSize: 10, glaMin: '10000.50', returnOnCostMin: '0.075',
      developmentSpreadMax: '0.03',
    });
    const decoded = decodeURIComponent(requestedUrl);
    expect(decoded).toContain('active_underwriting:opportunity_underwriting_versions!inner(*)');
    expect(decoded).toContain('active_underwriting.is_active=eq.true');
    expect(decoded).toContain('active_underwriting.building_area_sf=gte.10000.50');
    expect(decoded).toContain('active_underwriting.return_on_cost=gte.0.075');
    expect(decoded).toContain('active_underwriting.development_spread=lte.0.03');
    expect(decoded).toContain('order=updated_at.desc,id.asc');
    expect(decoded).toContain('offset=10');
    expect(decoded).toContain('limit=10');
  });

  it('keeps draft edits and finalization guarded by ID, revision, and draft status', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const client = createClient('http://127.0.0.1:54321', 'test-key', {
      global: { fetch: async (input, init) => {
        requests.push({ url: decodeURIComponent(String(input)),
          body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
      } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const repository = new SupabaseOpportunityRepository(client);
    await repository.updateDraftInput('version', 7, envelope, 'actor@upperlineco.com');
    await repository.saveCalculation('version', 8, {
      status: 'final', revision: 9, updated_by_email: 'actor@upperlineco.com',
    } as never);
    for (const [request, revision] of requests.map((item, index) => [item, index === 0 ? 7 : 8] as const)) {
      expect(request.url).toContain('id=eq.version');
      expect(request.url).toContain(`revision=eq.${revision}`);
      expect(request.url).toContain('status=eq.draft');
    }
    expect(requests[0].body).toMatchObject({
      result_payload: null, calculation_version: null, input_hash: null,
      calculated_at: null, finalized_at: null, building_area_sf: null,
      market_rent_per_sf_year: null, development_cost_before_financing: null,
      development_cost_per_sf: null, stabilized_noi: null, return_on_cost: null,
      exit_cap_rate: null, development_spread: null, unlevered_profit: null,
      net_equity_invested: null, equity_multiple: null, annualized_equity_return: null,
      screen_result: null, is_complete: null, blocking_error_count: 0, warning_count: 0,
    });
  });
});
