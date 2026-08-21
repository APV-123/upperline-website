import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { canonicalInput, marketInput } from '../../underwriting/retail-development/tests/fixtures/canonical';
import {
  calculateRetailDevelopmentUnderwriting, DEFAULT_CALCULATION_POLICY,
} from '../../underwriting/retail-development';
import * as retailEngine from '../../underwriting/retail-development';
import { authOptions } from '../../auth/options';
import {
  RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
  toRetailUnderwritingInput,
  type RetailDevelopmentPersistenceEnvelope,
} from '../underwriting/retail-development-persistence';
import type {
  CalculationSnapshot, OpportunityInsert, OpportunityListQuery, OpportunityListResult,
  OpportunityPatch, OpportunityRepository, ProvenanceReplace, SourceInsert,
} from '../persistence/repository';
import type {
  CloneRpcResult, DraftRpcResult, OpportunityRow, OpportunitySourceRow,
  ProvenanceRpcResult, UnderwritingRow,
} from '../persistence/contracts';
import { resolveUpperlineUser, type OpportunityActor } from './actor-core';
import { OpportunityApplicationError, translateOpportunityPersistenceError } from './errors';
import { canonicalEconomicHash } from '../underwriting/economic-hash';
import { projectUnderwritingSummary } from '../underwriting/summary-projection';
import {
  calculateRetailDevelopmentUnderwritingVersion, cloneRetailDevelopmentUnderwritingVersion,
  createOpportunity, createRetailDevelopmentUnderwritingDraft, finalizeRetailDevelopmentUnderwriting,
  listOpportunities, replaceFieldProvenance, setActiveUnderwriting,
  setPrimaryOpportunitySource, updateOpportunity, updateRetailDevelopmentUnderwritingDraft,
} from './services';
import { opportunityField, tenantUnderwritingField, underwritingField } from './provenance';

const actor: OpportunityActor = { email: 'analyst@upperlineco.com', name: 'Analyst' };
if (marketInput.leasing.mode !== 'market') throw new Error('Expected market fixture.');
const envelope: RetailDevelopmentPersistenceEnvelope = {
  schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
  engineInput: { ...marketInput, leasing: marketInput.leasing },
};

const opportunityRow = (overrides: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id: '10000000-0000-0000-0000-000000000001', name: 'Early look', stage: 'new',
  asset_class: 'retail', property_address_line_1: null, property_address_line_2: null,
  property_city: null, property_state: null, property_postal_code: null, property_county: null,
  property_market: null, property_latitude: null, property_longitude: null,
  land_area_sf: null, existing_building_area_sf: null, asking_price: null,
  broker_name: null, broker_company: null, broker_email: null, broker_phone: null,
  assigned_to_email: null, notes: null, dead_reason: null, promoted_deal_id: null,
  archived_at: null, revision: 1, created_by_email: actor.email, updated_by_email: actor.email,
  created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z',
  ...overrides,
});

const underwritingRow = (overrides: Partial<UnderwritingRow> = {}): UnderwritingRow => ({
  id: '20000000-0000-0000-0000-000000000001', opportunity_id: opportunityRow().id,
  underwriting_type: 'retail_development', version_number: 1, status: 'draft',
  is_active: false, based_on_version_id: null, input_payload: envelope, result_payload: null,
  calculation_policy: DEFAULT_CALCULATION_POLICY, calculation_version: null, input_hash: null,
  calculated_at: null, finalized_at: null, building_area_sf: null, market_rent_per_sf_year: null,
  development_cost_before_financing: null, development_cost_per_sf: null, stabilized_noi: null,
  return_on_cost: null, exit_cap_rate: null, development_spread: null, unlevered_profit: null,
  net_equity_invested: null, equity_multiple: null, annualized_equity_return: null,
  screen_result: null, is_complete: null, blocking_error_count: 0, warning_count: 0,
  revision: 1, created_by_email: actor.email, updated_by_email: actor.email,
  created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z',
  ...overrides,
});

class FakeRepository implements OpportunityRepository {
  opportunity: OpportunityRow | null = opportunityRow();
  underwriting: UnderwritingRow | null = underwritingRow();
  savedSnapshot: CalculationSnapshot | null = null;
  draftInputCall: Parameters<OpportunityRepository['updateDraftInput']> | null = null;
  provenanceCall: ProvenanceReplace | null = null;
  listQuery: OpportunityListQuery | null = null;
  returnConditionalMiss = false;

  async insertOpportunity(input: OpportunityInsert) {
    this.opportunity = opportunityRow(input);
    return this.opportunity;
  }
  async getOpportunity() { return this.opportunity; }
  async getActiveUnderwriting() { return this.underwriting?.is_active ? this.underwriting : null; }
  async listOpportunities(query: OpportunityListQuery): Promise<OpportunityListResult> {
    this.listQuery = query;
    return { rows: this.opportunity ? [{ opportunity: this.opportunity, activeUnderwriting: this.underwriting }] : [], total: this.opportunity ? 1 : 0 };
  }
  async updateOpportunity(_id: string, _revision: number, patch: OpportunityPatch) {
    if (this.returnConditionalMiss || !this.opportunity) return null;
    this.opportunity = { ...this.opportunity, ...patch };
    return this.opportunity;
  }
  async insertSource(input: SourceInsert): Promise<OpportunitySourceRow> {
    return { id: '30000000-0000-0000-0000-000000000001', provider: null, external_id: null,
      source_url: null, storage_path: null, title: null, observed_at: null, is_primary: false,
      metadata: {}, revision: 1, created_at: 'now', updated_at: 'now', ...input };
  }
  async getSource() { return null; }
  async listSources() { return []; }
  async createDraft(): Promise<DraftRpcResult> {
    return { version_id: underwritingRow().id, opportunity_id: opportunityRow().id,
      underwriting_type: 'retail_development', version_number: 1, status: 'draft',
      is_active: false, revision: 1 };
  }
  async cloneVersion(): Promise<CloneRpcResult> {
    return { ...(await this.createDraft()), version_id: underwritingRow().id,
      based_on_version_id: 'source', copied_provenance_count: 2 };
  }
  async getUnderwriting() { return this.underwriting; }
  async listUnderwritings() { return this.underwriting ? [this.underwriting] : []; }
  async updateDraftInput(...args: Parameters<OpportunityRepository['updateDraftInput']>) {
    this.draftInputCall = args;
    if (this.returnConditionalMiss || !this.underwriting) return null;
    this.underwriting = { ...this.underwriting, input_payload: args[2], result_payload: null,
      calculation_version: null, input_hash: null, calculated_at: null, screen_result: null,
      is_complete: null, revision: args[1] + 1 };
    return this.underwriting;
  }
  async saveCalculation(_id: string, _revision: number, snapshot: CalculationSnapshot) {
    this.savedSnapshot = snapshot;
    if (this.returnConditionalMiss || !this.underwriting) return null;
    this.underwriting = { ...this.underwriting, ...snapshot };
    return this.underwriting;
  }
  async setActive(): Promise<DraftRpcResult> {
    if (this.underwriting) this.underwriting = { ...this.underwriting, is_active: true, revision: 2 };
    return { ...(await this.createDraft()), is_active: true, revision: 2 };
  }
  async replaceProvenance(input: ProvenanceReplace): Promise<ProvenanceRpcResult> {
    this.provenanceCall = input;
    return { provenance_id: '40000000-0000-0000-0000-000000000001',
      supersedes_provenance_id: null, opportunity_id: input.opportunityId,
      scope: input.domain === 'opportunity' ? 'opportunity' : 'underwriting',
      underwriting_version_id: input.underwritingVersionId ?? null,
      tenant_key: input.tenantKey ?? null, field_path: input.fieldPath, created_at: 'now' };
  }
}

let repository: FakeRepository;
beforeEach(() => { repository = new FakeRepository(); });

describe('Opportunity authorization', () => {
  it('preserves the existing NextAuth strategy, page, scopes, and token/session callbacks', async () => {
    expect(authOptions.session).toEqual({ strategy: 'jwt' });
    expect(authOptions.pages).toEqual({ signIn: '/login' });
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers[0].options?.authorization?.params?.scope)
      .toBe('openid profile email offline_access User.Read Mail.ReadWrite Mail.Send');
    await expect(authOptions.callbacks!.signIn!({
      profile: { email: 'analyst@upperlineco.com' },
    } as never)).resolves.toBe(true);
    await expect(authOptions.callbacks!.redirect!({
      baseUrl: 'https://portal.upperlineco.com',
    } as never)).resolves.toBe('https://portal.upperlineco.com/admin');
    const token = await authOptions.callbacks!.jwt!({
      token: {}, account: { access_token: 'graph-token' },
      profile: { email: 'Analyst@upperlineco.com', name: 'Analyst' },
    } as never);
    expect(token).toMatchObject({ accessToken: 'graph-token',
      email: 'Analyst@upperlineco.com', name: 'Analyst' });
    const session = await authOptions.callbacks!.session!({
      session: { user: {} }, token,
    } as never);
    expect(session).toMatchObject({ user: { email: 'Analyst@upperlineco.com', name: 'Analyst' },
      accessToken: 'graph-token' });
  });
  it('normalizes an authenticated Upperline identity', async () => {
    await expect(resolveUpperlineUser(async () => ({ user: {
      email: ' Analyst@UpperlineCo.com ', name: ' Analyst ',
    } }))).resolves.toEqual({ email: 'analyst@upperlineco.com', name: 'Analyst' });
  });
  it.each([
    [null, 'unauthorized'],
    [{ user: {} }, 'unauthorized'],
    [{ user: { email: '' } }, 'unauthorized'],
    [{ user: { email: 'person@example.com' } }, 'forbidden'],
    [{ user: { email: 'person@upperlineco.com.attacker.com' } }, 'forbidden'],
    [{ user: { email: 'person@sub.upperlineco.com' } }, 'forbidden'],
    [{ user: { email: '@upperlineco.com' } }, 'forbidden'],
    [{ user: { email: 42 as never } }, 'unauthorized'],
  ])('rejects an invalid session', async (session, kind) => {
    await expect(resolveUpperlineUser(async () => session)).rejects.toMatchObject({ kind });
  });
});

describe('Opportunity services', () => {
  it('creates a partial early-look using an explicit field map and actor audit', async () => {
    const result = await createOpportunity({ name: '  Site  ', askingPrice: '1250000' }, actor, repository);
    expect(result).toMatchObject({ name: 'Site', askingPrice: '1250000', revision: 1 });
    expect(repository.opportunity).toMatchObject({ created_by_email: actor.email, promoted_deal_id: null });
    await expect(createOpportunity({ name: 'Invalid', stage: 'invalid' as never }, actor, repository))
      .rejects.toMatchObject({ kind: 'validation' });
    await expect(createOpportunity({ name: 'Promotion', stage: 'promoted_to_deal' }, actor, repository))
      .rejects.toMatchObject({ kind: 'validation' });
  });
  it('applies pagination and deterministic repository query parameters', async () => {
    const result = await listOpportunities({ page: 2, pageSize: 10, stage: 'screening' }, actor, repository);
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1 });
    expect(repository.listQuery).toMatchObject({ page: 2, pageSize: 10, stage: 'screening' });
  });
  it('updates with an atomic revision and rejects forbidden runtime fields', async () => {
    const result = await updateOpportunity(opportunityRow().id, 1, { notes: 'review' }, actor, repository);
    expect(result.revision).toBe(2);
    await expect(updateOpportunity(opportunityRow().id, 2,
      { promotedDealId: 'deal' } as never, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
    await expect(updateOpportunity(opportunityRow().id, 2,
      { notes: undefined }, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
    await expect(updateOpportunity(opportunityRow().id, 2,
      JSON.parse('{"__proto__":{"polluted":true}}'), actor, repository))
      .rejects.toMatchObject({ kind: 'validation' });
  });
  it('classifies stale and missing conditional updates', async () => {
    repository.returnConditionalMiss = true;
    await expect(updateOpportunity(opportunityRow().id, 1, { notes: 'x' }, actor, repository))
      .rejects.toMatchObject({ kind: 'revision_conflict' });
    repository.opportunity = null;
    await expect(updateOpportunity(opportunityRow().id, 1, { notes: 'x' }, actor, repository))
      .rejects.toMatchObject({ kind: 'not_found' });
  });
  it('reports the missing atomic primary-source switching primitive', async () => {
    await expect(setPrimaryOpportunitySource()).rejects.toMatchObject({ kind: 'persistence' });
  });
  it('rejects invalid runtime source contracts before persistence', async () => {
    const { addOpportunitySource } = await import('./services');
    await expect(addOpportunitySource(opportunityRow().id, {
      type: 'scraped' as never,
    }, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
    await expect(addOpportunitySource(opportunityRow().id, {
      type: 'manual', metadata: [] as never,
    }, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('Underwriting services and hashing', () => {
  it('creates and clones through RPC adapters, then reloads stable DTOs', async () => {
    await expect(createRetailDevelopmentUnderwritingDraft(opportunityRow().id, envelope, actor, repository))
      .resolves.toMatchObject({ versionNumber: 1, calculationPolicy: DEFAULT_CALCULATION_POLICY });
    await expect(cloneRetailDevelopmentUnderwritingVersion(underwritingRow().id, 1, actor, repository))
      .resolves.toMatchObject({ id: underwritingRow().id });
  });
  it('rejects malformed and duplicate-tenant envelopes before persistence', async () => {
    await expect(createRetailDevelopmentUnderwritingDraft(opportunityRow().id, {}, actor, repository))
      .rejects.toThrow('engineInput');
    const duplicate = structuredClone(envelope);
    const tenant = { name: 'Tenant', useType: 'retail', displayOrder: 1, sizeSf: '1',
      rentalRatePerSfYear: '1', annualRentBump: '0', leaseCommencementDate: null,
      leaseTermMonths: 12, freeRentMonths: '0', tenantImprovementPerSf: '0',
      leasingCommissionRate: '0', tenantKey: '50000000-0000-0000-0000-000000000001' };
    duplicate.engineInput.leasing = { mode: 'tenantRoster', tenants: [tenant, { ...tenant }] };
    await expect(createRetailDevelopmentUnderwritingDraft(opportunityRow().id, duplicate, actor, repository))
      .rejects.toThrow('duplicate tenantKey');
  });
  it('edits drafts and delegates stale artifact clearing to one repository update', async () => {
    repository.underwriting = underwritingRow({ result_payload: {} as never, calculation_version: 'old',
      input_hash: 'old', calculated_at: 'old', screen_result: 'PASS', is_complete: true });
    const result = await updateRetailDevelopmentUnderwritingDraft(underwritingRow().id, 1, envelope, actor, repository);
    expect(result).toMatchObject({ revision: 2, result: null, inputHash: null, screenResult: null });
    expect(repository.draftInputCall?.[1]).toBe(1);
  });
  it('rejects editing final underwriting', async () => {
    repository.underwriting = underwritingRow({ status: 'final' });
    repository.returnConditionalMiss = true;
    await expect(updateRetailDevelopmentUnderwritingDraft(underwritingRow().id, 1, envelope, actor, repository))
      .rejects.toMatchObject({ kind: 'immutable' });
  });
  it('hashes canonical economics and policy independent of key order and tenant identity', () => {
    const reordered = { ...canonicalInput, site: {
      landCostPerLandSf: canonicalInput.site.landCostPerLandSf,
      targetFar: canonicalInput.site.targetFar, landAreaSf: canonicalInput.site.landAreaSf,
    } };
    expect(canonicalEconomicHash(canonicalInput, DEFAULT_CALCULATION_POLICY))
      .toBe(canonicalEconomicHash(reordered, { ...DEFAULT_CALCULATION_POLICY }));
    expect(canonicalEconomicHash(canonicalInput, DEFAULT_CALCULATION_POLICY))
      .not.toBe(canonicalEconomicHash({ ...canonicalInput, site: {
        ...canonicalInput.site, landAreaSf: '999999',
      } }, DEFAULT_CALCULATION_POLICY));
    expect(canonicalEconomicHash(canonicalInput, DEFAULT_CALCULATION_POLICY))
      .not.toBe(canonicalEconomicHash(canonicalInput, {
        ...DEFAULT_CALCULATION_POLICY, reviewSpread: '0.009',
      }));
  });
  it('preserves economically meaningful array order and rejects undefined values', () => {
    const first = { ...canonicalInput, leasing: { ...canonicalInput.leasing } };
    if (first.leasing.mode !== 'tenantRoster') throw new Error('Expected roster fixture.');
    const reversed = { ...first, leasing: { ...first.leasing,
      tenants: first.leasing.tenants.slice().reverse() } };
    expect(canonicalEconomicHash(first, DEFAULT_CALCULATION_POLICY))
      .not.toBe(canonicalEconomicHash(reversed, DEFAULT_CALCULATION_POLICY));
    expect(() => canonicalEconomicHash({ ...marketInput, unexpected: undefined } as never,
      DEFAULT_CALCULATION_POLICY)).toThrow('unsupported value');
  });
  it('tenant UUIDs do not enter the economic hash', () => {
    const tenant = { name: 'Tenant', useType: 'retail', displayOrder: 1, sizeSf: '1000',
      rentalRatePerSfYear: '30', annualRentBump: '0.02', leaseCommencementDate: null,
      leaseTermMonths: 120, freeRentMonths: '0', tenantImprovementPerSf: '0',
      leasingCommissionRate: '0' };
    const economic = { ...marketInput, leasing: { mode: 'tenantRoster' as const, tenants: [tenant] } };
    const firstEnvelope = { schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
      engineInput: { ...economic, leasing: { mode: 'tenantRoster' as const,
        tenants: [{ ...tenant, tenantKey: '50000000-0000-0000-0000-000000000001' }] } } };
    const secondEnvelope = { ...firstEnvelope, engineInput: { ...firstEnvelope.engineInput,
      leasing: { ...firstEnvelope.engineInput.leasing, tenants: [{
        ...firstEnvelope.engineInput.leasing.tenants[0],
        tenantKey: '60000000-0000-0000-0000-000000000001',
      }] } } };
    expect(canonicalEconomicHash(toRetailUnderwritingInput(firstEnvelope), DEFAULT_CALCULATION_POLICY))
      .toBe(canonicalEconomicHash(toRetailUnderwritingInput(secondEnvelope), DEFAULT_CALCULATION_POLICY));
  });
  it('calculates with the actual engine and persists one authoritative snapshot', async () => {
    const result = await calculateRetailDevelopmentUnderwritingVersion(underwritingRow().id, 1, actor, repository);
    expect(result.result?.calculationVersion).toBe(DEFAULT_CALCULATION_POLICY.calculationVersion);
    expect(repository.savedSnapshot).toMatchObject({ status: 'draft', revision: 2,
      input_hash: expect.stringMatching(/^[a-f0-9]{64}$/), result_payload: expect.any(Object) });
    expect(repository.savedSnapshot?.blocking_error_count).toBe(0);
  });
  it('uses the complete stored policy and rejects implicit default substitution', async () => {
    repository.underwriting = underwritingRow({
      calculation_policy: { calculationVersion: 'incomplete' } as never,
    });
    await expect(calculateRetailDevelopmentUnderwritingVersion(underwritingRow().id, 1, actor, repository))
      .rejects.toMatchObject({ kind: 'validation' });
  });
  it('finalization freshly replaces stale stored results and permits incomplete output', async () => {
    repository.underwriting = underwritingRow({ result_payload: { stale: true } as never });
    const actualCalculator = calculateRetailDevelopmentUnderwriting;
    vi.spyOn(retailEngine, 'calculateRetailDevelopmentUnderwriting').mockImplementationOnce((input, options) => {
      const result = actualCalculator(input, options);
      return { ...result, complete: false, diagnostics: [...result.diagnostics, {
        code: 'REVIEW_BLOCKER', severity: 'error', path: 'site', message: 'Needs review.',
      }] };
    });
    const result = await finalizeRetailDevelopmentUnderwriting(underwritingRow().id, 1, actor, repository);
    expect(result).toMatchObject({ status: 'final', complete: false, revision: 2 });
    expect(repository.savedSnapshot).toMatchObject({ status: 'final', finalized_at: expect.any(String) });
    expect(repository.savedSnapshot?.result_payload).not.toHaveProperty('stale');
  });
  it('rejects stale calculations and final resources', async () => {
    repository.underwriting = underwritingRow({ revision: 2 });
    await expect(calculateRetailDevelopmentUnderwritingVersion(underwritingRow().id, 1, actor, repository))
      .rejects.toMatchObject({ kind: 'revision_conflict' });
    repository.underwriting = underwritingRow({ status: 'final' });
    await expect(finalizeRetailDevelopmentUnderwriting(underwritingRow().id, 1, actor, repository))
      .rejects.toMatchObject({ kind: 'immutable' });
  });
  it('uses the active-selection RPC adapter', async () => {
    await expect(setActiveUnderwriting(opportunityRow().id, underwritingRow().id, 1, actor, repository))
      .resolves.toMatchObject({ active: true, revision: 2 });
  });
});

describe('Summary and provenance', () => {
  it('maps the canonical result to one summary projection preserving strings and nulls', async () => {
    await calculateRetailDevelopmentUnderwritingVersion(underwritingRow().id, 1, actor, repository);
    const projection = projectUnderwritingSummary(repository.savedSnapshot!.result_payload);
    const result = repository.savedSnapshot!.result_payload;
    expect(projection).toEqual({
      building_area_sf: result.geometry?.buildingAreaSf ?? null,
      market_rent_per_sf_year: result.resolvedLeasing?.rentalRatePerSfYear ?? null,
      development_cost_before_financing: result.developmentCosts?.developmentCostBeforeFinancing ?? null,
      development_cost_per_sf: result.developmentCosts?.developmentCostPerBuildingSf ?? null,
      stabilized_noi: result.stabilizedOperations?.netOperatingIncome ?? null,
      return_on_cost: result.unleveredReturns?.returnOnCost ?? null,
      exit_cap_rate: result.disposition?.exitCapRate ?? null,
      development_spread: result.unleveredReturns?.developmentSpread ?? null,
      unlevered_profit: result.unleveredReturns?.unleveredProfit ?? null,
      net_equity_invested: result.equityReturns?.netEquityInvested ?? null,
      equity_multiple: result.equityReturns?.equityMultiple ?? null,
      annualized_equity_return: result.equityReturns?.annualizedEquityReturn ?? null,
      screen_result: result.opportunityScreen, is_complete: result.complete,
      blocking_error_count: result.diagnostics.filter(({ severity }) => severity === 'error').length,
      warning_count: result.diagnostics.filter(({ severity }) => severity === 'warning').length,
    });
    expect(projection.building_area_sf).toBe('21780');
  });
  it('normalizes PostgREST numeric values to decimal-string DTOs', async () => {
    repository.opportunity = opportunityRow({ asking_price: 1250000.5, property_latitude: 32.75 });
    repository.underwriting = underwritingRow({ is_active: true, return_on_cost: 0.0875,
      development_spread: 0.02 });
    const result = await listOpportunities({}, actor, repository);
    expect(result.items[0]).toMatchObject({ askingPrice: '1250000.5',
      location: { latitude: '32.75' },
      activeUnderwriting: { returnOnCost: '0.0875', developmentSpread: '0.02' } });
  });
  it.each([
    opportunityField('askingPrice'),
    underwritingField(underwritingRow().id, 'acquisition.landCost'),
  ])('sends canonical $domain provenance through the RPC adapter', async (identity) => {
    await replaceFieldProvenance(opportunityRow().id,
      { identity, provenanceType: 'manual' }, actor, repository);
    expect(repository.provenanceCall).toMatchObject({ domain: identity.domain, fieldPath: identity.fieldPath });
  });
  it('validates tenant identity against the current draft envelope', async () => {
    const tenantKey = '50000000-0000-0000-0000-000000000001';
    const tenantEnvelope = structuredClone(envelope);
    tenantEnvelope.engineInput.leasing = { mode: 'tenantRoster', tenants: [{
      tenantKey, name: 'Tenant', useType: 'retail', displayOrder: 1, sizeSf: '1000',
      rentalRatePerSfYear: '30', annualRentBump: '0.02', leaseCommencementDate: null,
      leaseTermMonths: 120, freeRentMonths: '0', tenantImprovementPerSf: '0',
      leasingCommissionRate: '0',
    }] };
    repository.underwriting = underwritingRow({ input_payload: tenantEnvelope });
    await replaceFieldProvenance(opportunityRow().id, {
      identity: tenantUnderwritingField(underwritingRow().id, tenantKey, 'rentalRatePerSfYear'),
      provenanceType: 'manual',
    }, actor, repository);
    expect(repository.provenanceCall).toMatchObject({ domain: 'tenant', tenantKey,
      fieldPath: 'rentalRatePerSfYear' });
    await expect(replaceFieldProvenance(opportunityRow().id, {
      identity: tenantUnderwritingField(underwritingRow().id,
        '60000000-0000-0000-0000-000000000001', 'rentalRatePerSfYear'),
      provenanceType: 'manual',
    }, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
    expect(() => tenantUnderwritingField(underwritingRow().id, 'not-a-uuid', 'rentalRatePerSfYear'))
      .toThrow('UUID');
    expect(() => tenantUnderwritingField(underwritingRow().id, tenantKey, 'unknownField'))
      .toThrow('not supported');
  });
  it('translates finalized and integrity database errors without exposing raw details', () => {
    expect(translateOpportunityPersistenceError({ code: '55000', message: 'raw' }))
      .toMatchObject({ kind: 'immutable', message: 'The finalized resource cannot be changed.' });
    expect(translateOpportunityPersistenceError({ code: '23505', message: 'raw' }))
      .toMatchObject({ kind: 'integrity_conflict' });
    expect(translateOpportunityPersistenceError({
      code: 'P0001', message: 'Cannot finalize underwriting whose provenance has been superseded',
    })).toMatchObject({ kind: 'integrity_conflict' });
    expect(translateOpportunityPersistenceError({ code: 'P0001', message: 'unexpected raw detail' }))
      .toMatchObject({ kind: 'persistence', message: 'Opportunity persistence failed.' });
    expect(new OpportunityApplicationError('persistence', 'safe', new Error('raw')).cause).toBeInstanceOf(Error);
  });
  it('rejects invalid runtime provenance types before invoking the RPC', async () => {
    await expect(replaceFieldProvenance(opportunityRow().id, {
      identity: opportunityField('askingPrice'), provenanceType: 'unknown' as never,
    }, actor, repository)).rejects.toMatchObject({ kind: 'validation' });
    expect(repository.provenanceCall).toBeNull();
  });
});
