import type { CalculationPolicy, RetailUnderwritingResult } from '../../underwriting/retail-development';
import type { RetailDevelopmentPersistenceEnvelope } from '../underwriting/retail-development-persistence';

/** Temporary application-owned contracts derived from the two committed migrations.
 * Replace these with generated Supabase types when generation is established.
 */
export type OpportunityStage =
  | 'new' | 'screening' | 'diligence' | 'loi_preparation' | 'loi_submitted'
  | 'negotiation' | 'under_contract' | 'promoted_to_deal' | 'dead';
export type SourceType = 'manual' | 'listing' | 'document' | 'api' | 'email' | 'other';
export type ProvenanceType =
  | 'manual' | 'organization_default' | 'listing_extraction' | 'document_extraction'
  | 'api' | 'prior_version' | 'manual_override';
export type DatabaseNumeric = string | number;

export type OpportunityRow = {
  id: string; name: string; stage: OpportunityStage; asset_class: string;
  property_address_line_1: string | null; property_address_line_2: string | null;
  property_city: string | null; property_state: string | null; property_postal_code: string | null;
  property_county: string | null; property_market: string | null;
  property_latitude: DatabaseNumeric | null; property_longitude: DatabaseNumeric | null;
  land_area_sf: DatabaseNumeric | null; existing_building_area_sf: DatabaseNumeric | null;
  asking_price: DatabaseNumeric | null;
  broker_name: string | null; broker_company: string | null; broker_email: string | null;
  broker_phone: string | null; assigned_to_email: string | null; notes: string | null;
  dead_reason: string | null; promoted_deal_id: string | null; archived_at: string | null;
  revision: number; created_by_email: string; updated_by_email: string;
  created_at: string; updated_at: string;
};

export type OpportunitySourceRow = {
  id: string; opportunity_id: string; source_type: SourceType; provider: string | null;
  external_id: string | null; source_url: string | null; storage_path: string | null;
  title: string | null; observed_at: string | null; is_primary: boolean;
  metadata: Record<string, unknown>; revision: number; created_by_email: string;
  updated_by_email: string; created_at: string; updated_at: string;
};

export type UnderwritingRow = {
  id: string; opportunity_id: string; underwriting_type: 'retail_development';
  version_number: number; status: 'draft' | 'final'; is_active: boolean;
  based_on_version_id: string | null; input_payload: RetailDevelopmentPersistenceEnvelope;
  result_payload: RetailUnderwritingResult | null; calculation_policy: CalculationPolicy;
  calculation_version: string | null; input_hash: string | null;
  calculated_at: string | null; finalized_at: string | null;
  building_area_sf: DatabaseNumeric | null; market_rent_per_sf_year: DatabaseNumeric | null;
  development_cost_before_financing: DatabaseNumeric | null; development_cost_per_sf: DatabaseNumeric | null;
  stabilized_noi: DatabaseNumeric | null; return_on_cost: DatabaseNumeric | null;
  exit_cap_rate: DatabaseNumeric | null; development_spread: DatabaseNumeric | null;
  unlevered_profit: DatabaseNumeric | null; net_equity_invested: DatabaseNumeric | null;
  equity_multiple: DatabaseNumeric | null; annualized_equity_return: DatabaseNumeric | null;
  screen_result: 'PASS' | 'REVIEW' | 'PURSUE' | null;
  is_complete: boolean | null; blocking_error_count: number; warning_count: number;
  revision: number; created_by_email: string; updated_by_email: string;
  created_at: string; updated_at: string;
};

export type ProvenanceRow = {
  id: string; opportunity_id: string; underwriting_version_id: string | null;
  opportunity_source_id: string | null; scope: 'opportunity' | 'underwriting';
  field_path: string; tenant_key: string | null; provenance_type: ProvenanceType;
  original_text: string | null; original_value: unknown; normalized_value: unknown;
  unit: string | null; source_locator: string | null; confidence: DatabaseNumeric | null;
  supersedes_provenance_id: string | null; superseded_at: string | null;
  metadata: Record<string, unknown>; created_by_email: string; created_at: string;
};

export type DraftRpcResult = {
  version_id: string; opportunity_id: string; underwriting_type: 'retail_development';
  version_number: number; status: 'draft'; is_active: boolean; revision: number;
};
export type UnderwritingRpcResult = Omit<DraftRpcResult, 'status'> & { status: 'draft' | 'final' };
export type CloneRpcResult = DraftRpcResult & {
  based_on_version_id: string; copied_provenance_count: number;
};
export type ProvenanceRpcResult = {
  provenance_id: string; supersedes_provenance_id: string | null; opportunity_id: string;
  scope: 'opportunity' | 'underwriting'; underwriting_version_id: string | null;
  tenant_key: string | null; field_path: string; created_at: string;
};
