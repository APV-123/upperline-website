import type {
  OpportunityRow, OpportunitySourceRow, ProvenanceRow, UnderwritingRow,
} from '../persistence/contracts';

const decimalString = (value: string | number | null): string | null =>
  value === null ? null : String(value);

export type UnderwritingSummaryDto = {
  id: string; versionNumber: number; status: 'draft' | 'final'; isActive: boolean;
  screenResult: 'PASS' | 'REVIEW' | 'PURSUE' | null; complete: boolean | null;
  returnOnCost: string | null; developmentSpread: string | null; revision: number;
};

export type OpportunityDto = {
  id: string; name: string; stage: OpportunityRow['stage']; assetClass: string;
  address: { line1: string | null; line2: string | null; city: string | null;
    state: string | null; postalCode: string | null; county: string | null; market: string | null };
  location: { latitude: string | null; longitude: string | null };
  landAreaSf: string | null; existingBuildingAreaSf: string | null; askingPrice: string | null;
  broker: { name: string | null; company: string | null; email: string | null; phone: string | null };
  assignedToEmail: string | null; notes: string | null; deadReason: string | null;
  promotedDealId: string | null; archivedAt: string | null; revision: number;
  createdAt: string; updatedAt: string; activeUnderwriting: UnderwritingSummaryDto | null;
};

export type OpportunitySourceDto = {
  id: string; opportunityId: string; type: OpportunitySourceRow['source_type'];
  provider: string | null; externalId: string | null; sourceUrl: string | null;
  storagePath: string | null; title: string | null; observedAt: string | null;
  primary: boolean; metadata: Record<string, unknown>; revision: number;
  createdAt: string; updatedAt: string;
};

export type UnderwritingVersionDto = {
  id: string; opportunityId: string; versionNumber: number; status: 'draft' | 'final';
  active: boolean; basedOnVersionId: string | null; revision: number;
  calculatedAt: string | null; finalizedAt: string | null; screenResult: UnderwritingRow['screen_result'];
  complete: boolean | null; blockingErrorCount: number; warningCount: number;
  summaries: {
    buildingAreaSf: string | null; marketRentPerSfYear: string | null;
    developmentCostBeforeFinancing: string | null; developmentCostPerSf: string | null;
    stabilizedNoi: string | null; returnOnCost: string | null; exitCapRate: string | null;
    developmentSpread: string | null; unleveredProfit: string | null;
    netEquityInvested: string | null; equityMultiple: string | null;
    annualizedEquityReturn: string | null;
  };
  input: UnderwritingRow['input_payload']; result: UnderwritingRow['result_payload'];
  calculationPolicy: UnderwritingRow['calculation_policy']; calculationVersion: string | null;
  inputHash: string | null; createdAt: string; updatedAt: string;
};

export type ProvenanceDto = {
  id: string; opportunityId: string; underwritingVersionId: string | null;
  tenantKey: string | null; fieldPath: string; scope: ProvenanceRow['scope'];
  supersedesProvenanceId: string | null; createdAt: string;
};

const summary = (row: UnderwritingRow): UnderwritingSummaryDto => ({
  id: row.id, versionNumber: row.version_number, status: row.status, isActive: row.is_active,
  screenResult: row.screen_result, complete: row.is_complete,
  returnOnCost: decimalString(row.return_on_cost),
  developmentSpread: decimalString(row.development_spread), revision: row.revision,
});

export function toOpportunityDto(row: OpportunityRow, active: UnderwritingRow | null = null): OpportunityDto {
  return {
    id: row.id, name: row.name, stage: row.stage, assetClass: row.asset_class,
    address: { line1: row.property_address_line_1, line2: row.property_address_line_2,
      city: row.property_city, state: row.property_state, postalCode: row.property_postal_code,
      county: row.property_county, market: row.property_market },
    location: { latitude: decimalString(row.property_latitude), longitude: decimalString(row.property_longitude) },
    landAreaSf: decimalString(row.land_area_sf),
    existingBuildingAreaSf: decimalString(row.existing_building_area_sf),
    askingPrice: decimalString(row.asking_price),
    broker: { name: row.broker_name, company: row.broker_company,
      email: row.broker_email, phone: row.broker_phone },
    assignedToEmail: row.assigned_to_email, notes: row.notes, deadReason: row.dead_reason,
    promotedDealId: row.promoted_deal_id, archivedAt: row.archived_at, revision: row.revision,
    createdAt: row.created_at, updatedAt: row.updated_at,
    activeUnderwriting: active ? summary(active) : null,
  };
}

export const toSourceDto = (row: OpportunitySourceRow): OpportunitySourceDto => ({
  id: row.id, opportunityId: row.opportunity_id, type: row.source_type, provider: row.provider,
  externalId: row.external_id, sourceUrl: row.source_url, storagePath: row.storage_path,
  title: row.title, observedAt: row.observed_at, primary: row.is_primary, metadata: row.metadata,
  revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
});

export const toUnderwritingDto = (row: UnderwritingRow): UnderwritingVersionDto => ({
  id: row.id, opportunityId: row.opportunity_id, versionNumber: row.version_number,
  status: row.status, active: row.is_active, basedOnVersionId: row.based_on_version_id,
  revision: row.revision, calculatedAt: row.calculated_at, finalizedAt: row.finalized_at,
  screenResult: row.screen_result, complete: row.is_complete,
  blockingErrorCount: row.blocking_error_count, warningCount: row.warning_count,
  summaries: { buildingAreaSf: decimalString(row.building_area_sf),
    marketRentPerSfYear: decimalString(row.market_rent_per_sf_year),
    developmentCostBeforeFinancing: decimalString(row.development_cost_before_financing),
    developmentCostPerSf: decimalString(row.development_cost_per_sf),
    stabilizedNoi: decimalString(row.stabilized_noi),
    returnOnCost: decimalString(row.return_on_cost), exitCapRate: decimalString(row.exit_cap_rate),
    developmentSpread: decimalString(row.development_spread),
    unleveredProfit: decimalString(row.unlevered_profit),
    netEquityInvested: decimalString(row.net_equity_invested),
    equityMultiple: decimalString(row.equity_multiple),
    annualizedEquityReturn: decimalString(row.annualized_equity_return) },
  input: row.input_payload, result: row.result_payload, calculationPolicy: row.calculation_policy,
  calculationVersion: row.calculation_version, inputHash: row.input_hash,
  createdAt: row.created_at, updatedAt: row.updated_at,
});
