import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalculationPolicy, RetailUnderwritingResult } from '../../underwriting/retail-development';
import type { RetailDevelopmentPersistenceEnvelope } from '../underwriting/retail-development-persistence';
import { translateOpportunityPersistenceError } from '../application/errors';
import { createOpportunitySupabaseClient } from './client';
import type {
  CloneRpcResult, DraftRpcResult, OpportunityRow, OpportunitySourceRow, OpportunityStage,
  ProvenanceRpcResult, ProvenanceType, UnderwritingRow, UnderwritingRpcResult,
} from './contracts';

export type OpportunityInsert = Pick<OpportunityRow, 'name' | 'created_by_email' | 'updated_by_email'> &
  Partial<Pick<OpportunityRow,
  'stage' | 'property_address_line_1' | 'property_address_line_2' | 'property_city' |
  'property_state' | 'property_postal_code' | 'property_county' | 'property_market' |
  'property_latitude' | 'property_longitude' | 'land_area_sf' | 'existing_building_area_sf' |
  'asking_price' | 'broker_name' | 'broker_company' | 'broker_email' | 'broker_phone' |
  'assigned_to_email' | 'notes' | 'dead_reason'>>;

export type OpportunityPatch = Partial<Pick<OpportunityRow,
  'name' | 'stage' | 'property_address_line_1' | 'property_address_line_2' | 'property_city' |
  'property_state' | 'property_postal_code' | 'property_county' | 'property_market' |
  'property_latitude' | 'property_longitude' | 'land_area_sf' | 'existing_building_area_sf' |
  'asking_price' | 'broker_name' | 'broker_company' | 'broker_email' | 'broker_phone' |
  'assigned_to_email' | 'notes' | 'dead_reason' | 'archived_at'>> & {
  revision: number; updated_by_email: string;
};

export type OpportunityListQuery = {
  stage?: OpportunityStage; screenResult?: UnderwritingRow['screen_result'];
  market?: string; assignedToEmail?: string; promoted?: boolean;
  createdFrom?: string; createdTo?: string; updatedFrom?: string; updatedTo?: string;
  askingPriceMin?: string; askingPriceMax?: string; glaMin?: string; glaMax?: string;
  returnOnCostMin?: string; returnOnCostMax?: string;
  developmentSpreadMin?: string; developmentSpreadMax?: string;
  page: number; pageSize: number;
};

export type OpportunityListResult = {
  rows: Array<{ opportunity: OpportunityRow; activeUnderwriting: UnderwritingRow | null }>;
  total: number;
};

export type SourceInsert = Pick<OpportunitySourceRow,
  'opportunity_id' | 'source_type' | 'created_by_email' | 'updated_by_email'> &
  Partial<Pick<OpportunitySourceRow,
  'provider' | 'external_id' | 'source_url' | 'storage_path' | 'title' |
  'observed_at' | 'is_primary' | 'metadata'>>;

export type CalculationSnapshot = {
  result_payload: RetailUnderwritingResult; calculation_policy: CalculationPolicy;
  calculation_version: string; input_hash: string; calculated_at: string;
  finalized_at: string | null; status: 'draft' | 'final'; revision: number;
  updated_by_email: string;
  building_area_sf: string | null; market_rent_per_sf_year: string | null;
  development_cost_before_financing: string | null; development_cost_per_sf: string | null;
  stabilized_noi: string | null; return_on_cost: string | null; exit_cap_rate: string | null;
  development_spread: string | null; unlevered_profit: string | null;
  net_equity_invested: string | null; equity_multiple: string | null;
  annualized_equity_return: string | null; screen_result: UnderwritingRow['screen_result'];
  is_complete: boolean; blocking_error_count: number; warning_count: number;
};

export type ProvenanceReplace = {
  opportunityId: string; domain: 'opportunity' | 'underwriting' | 'tenant'; fieldPath: string;
  provenanceType: ProvenanceType; actorEmail: string; underwritingVersionId?: string;
  tenantKey?: string; opportunitySourceId?: string; originalText?: string;
  originalValue?: unknown; normalizedValue?: unknown; unit?: string;
  sourceLocator?: string; confidence?: string; metadata?: Record<string, unknown>;
};

export interface OpportunityRepository {
  insertOpportunity(input: OpportunityInsert): Promise<OpportunityRow>;
  getOpportunity(id: string): Promise<OpportunityRow | null>;
  getActiveUnderwriting(opportunityId: string): Promise<UnderwritingRow | null>;
  listOpportunities(query: OpportunityListQuery): Promise<OpportunityListResult>;
  updateOpportunity(id: string, expectedRevision: number, patch: OpportunityPatch): Promise<OpportunityRow | null>;
  insertSource(input: SourceInsert): Promise<OpportunitySourceRow>;
  getSource(id: string, opportunityId: string): Promise<OpportunitySourceRow | null>;
  listSources(opportunityId: string): Promise<OpportunitySourceRow[]>;
  createDraft(opportunityId: string, envelope: RetailDevelopmentPersistenceEnvelope,
    policy: CalculationPolicy, actorEmail: string, makeActive: boolean): Promise<DraftRpcResult>;
  cloneVersion(sourceVersionId: string, expectedRevision: number, actorEmail: string): Promise<CloneRpcResult>;
  getUnderwriting(id: string): Promise<UnderwritingRow | null>;
  listUnderwritings(opportunityId: string): Promise<UnderwritingRow[]>;
  updateDraftInput(id: string, expectedRevision: number, envelope: RetailDevelopmentPersistenceEnvelope,
    actorEmail: string): Promise<UnderwritingRow | null>;
  saveCalculation(id: string, expectedRevision: number, snapshot: CalculationSnapshot): Promise<UnderwritingRow | null>;
  setActive(opportunityId: string, versionId: string, expectedRevision: number,
    actorEmail: string): Promise<UnderwritingRpcResult>;
  replaceProvenance(input: ProvenanceReplace): Promise<ProvenanceRpcResult>;
}

const unwrap = <T>(data: unknown, error: unknown): T => {
  if (error) throw translateOpportunityPersistenceError(error);
  return data as T;
};

export class SupabaseOpportunityRepository implements OpportunityRepository {
  constructor(private readonly client: SupabaseClient = createOpportunitySupabaseClient()) {}

  async insertOpportunity(input: OpportunityInsert): Promise<OpportunityRow> {
    const { data, error } = await this.client.from('acquisition_opportunities')
      .insert(input).select('*').single();
    return unwrap<OpportunityRow>(data, error);
  }

  async getOpportunity(id: string): Promise<OpportunityRow | null> {
    const { data, error } = await this.client.from('acquisition_opportunities')
      .select('*').eq('id', id).maybeSingle();
    return unwrap<OpportunityRow | null>(data, error);
  }

  async getActiveUnderwriting(opportunityId: string): Promise<UnderwritingRow | null> {
    const { data, error } = await this.client.from('opportunity_underwriting_versions')
      .select('*').eq('opportunity_id', opportunityId).eq('underwriting_type', 'retail_development')
      .eq('is_active', true).maybeSingle();
    return unwrap<UnderwritingRow | null>(data, error);
  }

  async listOpportunities(input: OpportunityListQuery): Promise<OpportunityListResult> {
    const summaryFilter = input.screenResult !== undefined || input.glaMin !== undefined ||
      input.glaMax !== undefined || input.returnOnCostMin !== undefined ||
      input.returnOnCostMax !== undefined || input.developmentSpreadMin !== undefined ||
      input.developmentSpreadMax !== undefined;
    const relation = summaryFilter ? 'active_underwriting:opportunity_underwriting_versions!inner(*)' :
      'active_underwriting:opportunity_underwriting_versions(*)';
    let query = this.client.from('acquisition_opportunities')
      .select(`*, ${relation}`, { count: 'exact' })
      .eq('active_underwriting.is_active', true)
      .eq('active_underwriting.underwriting_type', 'retail_development');
    if (input.stage) query = query.eq('stage', input.stage);
    if (input.market) query = query.eq('property_market', input.market);
    if (input.assignedToEmail) query = query.eq('assigned_to_email', input.assignedToEmail);
    if (input.promoted === true) query = query.not('promoted_deal_id', 'is', null);
    if (input.promoted === false) query = query.is('promoted_deal_id', null);
    if (input.createdFrom) query = query.gte('created_at', input.createdFrom);
    if (input.createdTo) query = query.lte('created_at', input.createdTo);
    if (input.updatedFrom) query = query.gte('updated_at', input.updatedFrom);
    if (input.updatedTo) query = query.lte('updated_at', input.updatedTo);
    if (input.askingPriceMin) query = query.gte('asking_price', input.askingPriceMin);
    if (input.askingPriceMax) query = query.lte('asking_price', input.askingPriceMax);
    if (input.glaMin) query = query.gte('active_underwriting.building_area_sf', input.glaMin);
    if (input.glaMax) query = query.lte('active_underwriting.building_area_sf', input.glaMax);
    if (input.screenResult) query = query.eq('active_underwriting.screen_result', input.screenResult);
    if (input.returnOnCostMin) query = query.gte('active_underwriting.return_on_cost', input.returnOnCostMin);
    if (input.returnOnCostMax) query = query.lte('active_underwriting.return_on_cost', input.returnOnCostMax);
    if (input.developmentSpreadMin) query = query.gte('active_underwriting.development_spread', input.developmentSpreadMin);
    if (input.developmentSpreadMax) query = query.lte('active_underwriting.development_spread', input.developmentSpreadMax);
    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.order('updated_at', { ascending: false })
      .order('id', { ascending: true }).range(from, from + input.pageSize - 1);
    const records = unwrap<Array<OpportunityRow & {
      active_underwriting?: UnderwritingRow[];
    }>>(data, error);
    return {
      rows: records.map(({ active_underwriting: versions, ...opportunity }) => ({
        opportunity, activeUnderwriting: versions?.[0] ?? null,
      })),
      total: count ?? 0,
    };
  }

  async updateOpportunity(id: string, expectedRevision: number, patch: OpportunityPatch): Promise<OpportunityRow | null> {
    const { data, error } = await this.client.from('acquisition_opportunities').update(patch)
      .eq('id', id).eq('revision', expectedRevision).select('*').maybeSingle();
    return unwrap<OpportunityRow | null>(data, error);
  }

  async insertSource(input: SourceInsert): Promise<OpportunitySourceRow> {
    const { data, error } = await this.client.from('opportunity_sources').insert(input).select('*').single();
    return unwrap<OpportunitySourceRow>(data, error);
  }

  async getSource(id: string, opportunityId: string): Promise<OpportunitySourceRow | null> {
    const { data, error } = await this.client.from('opportunity_sources').select('*')
      .eq('id', id).eq('opportunity_id', opportunityId).maybeSingle();
    return unwrap<OpportunitySourceRow | null>(data, error);
  }

  async listSources(opportunityId: string): Promise<OpportunitySourceRow[]> {
    const { data, error } = await this.client.from('opportunity_sources').select('*')
      .eq('opportunity_id', opportunityId).order('is_primary', { ascending: false })
      .order('created_at', { ascending: false }).order('id', { ascending: true });
    return unwrap<OpportunitySourceRow[]>(data, error);
  }

  async createDraft(opportunityId: string, envelope: RetailDevelopmentPersistenceEnvelope,
    policy: CalculationPolicy, actorEmail: string, makeActive: boolean): Promise<DraftRpcResult> {
    const { data, error } = await this.client.rpc('create_opportunity_underwriting_draft', {
      p_opportunity_id: opportunityId, p_input_payload: envelope, p_calculation_policy: policy,
      p_actor_email: actorEmail, p_make_active: makeActive,
    }).single();
    return unwrap<DraftRpcResult>(data, error);
  }

  async cloneVersion(sourceVersionId: string, expectedRevision: number, actorEmail: string): Promise<CloneRpcResult> {
    const { data, error } = await this.client.rpc('clone_opportunity_underwriting_version', {
      p_source_version_id: sourceVersionId, p_expected_revision: expectedRevision,
      p_actor_email: actorEmail,
    }).single();
    return unwrap<CloneRpcResult>(data, error);
  }

  async getUnderwriting(id: string): Promise<UnderwritingRow | null> {
    const { data, error } = await this.client.from('opportunity_underwriting_versions')
      .select('*').eq('id', id).maybeSingle();
    return unwrap<UnderwritingRow | null>(data, error);
  }

  async listUnderwritings(opportunityId: string): Promise<UnderwritingRow[]> {
    const { data, error } = await this.client.from('opportunity_underwriting_versions').select('*')
      .eq('opportunity_id', opportunityId).eq('underwriting_type', 'retail_development')
      .order('version_number', { ascending: false }).order('id', { ascending: true });
    return unwrap<UnderwritingRow[]>(data, error);
  }

  async updateDraftInput(id: string, expectedRevision: number,
    envelope: RetailDevelopmentPersistenceEnvelope, actorEmail: string): Promise<UnderwritingRow | null> {
    const { data, error } = await this.client.from('opportunity_underwriting_versions').update({
      input_payload: envelope, revision: expectedRevision + 1, updated_by_email: actorEmail,
      result_payload: null, calculation_version: null, input_hash: null, calculated_at: null,
      finalized_at: null, building_area_sf: null, market_rent_per_sf_year: null,
      development_cost_before_financing: null, development_cost_per_sf: null,
      stabilized_noi: null, return_on_cost: null, exit_cap_rate: null, development_spread: null,
      unlevered_profit: null, net_equity_invested: null, equity_multiple: null,
      annualized_equity_return: null, screen_result: null, is_complete: null,
      blocking_error_count: 0, warning_count: 0,
    }).eq('id', id).eq('revision', expectedRevision).eq('status', 'draft').select('*').maybeSingle();
    return unwrap<UnderwritingRow | null>(data, error);
  }

  async saveCalculation(id: string, expectedRevision: number,
    snapshot: CalculationSnapshot): Promise<UnderwritingRow | null> {
    const { data, error } = await this.client.from('opportunity_underwriting_versions')
      .update(snapshot).eq('id', id).eq('revision', expectedRevision).eq('status', 'draft')
      .select('*').maybeSingle();
    return unwrap<UnderwritingRow | null>(data, error);
  }

  async setActive(opportunityId: string, versionId: string, expectedRevision: number,
    actorEmail: string): Promise<UnderwritingRpcResult> {
    const { data, error } = await this.client.rpc('set_active_opportunity_underwriting', {
      p_opportunity_id: opportunityId, p_version_id: versionId,
      p_expected_revision: expectedRevision, p_actor_email: actorEmail,
    }).single();
    return unwrap<UnderwritingRpcResult>(data, error);
  }

  async replaceProvenance(input: ProvenanceReplace): Promise<ProvenanceRpcResult> {
    const { data, error } = await this.client.rpc('replace_opportunity_field_provenance', {
      p_opportunity_id: input.opportunityId, p_domain: input.domain, p_field_path: input.fieldPath,
      p_provenance_type: input.provenanceType, p_actor_email: input.actorEmail,
      p_underwriting_version_id: input.underwritingVersionId ?? null,
      p_tenant_key: input.tenantKey ?? null, p_opportunity_source_id: input.opportunitySourceId ?? null,
      p_original_text: input.originalText ?? null, p_original_value: input.originalValue ?? null,
      p_normalized_value: input.normalizedValue ?? null, p_unit: input.unit ?? null,
      p_source_locator: input.sourceLocator ?? null, p_confidence: input.confidence ?? null,
      p_metadata: input.metadata ?? {},
    }).single();
    return unwrap<ProvenanceRpcResult>(data, error);
  }
}
