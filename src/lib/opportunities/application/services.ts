import 'server-only';

import {
  calculateRetailDevelopmentUnderwriting, DEFAULT_CALCULATION_POLICY,
  type CalculationPolicy, type RetailUnderwritingResult,
} from '../../underwriting/retail-development';
import {
  parseRetailDevelopmentPersistenceEnvelope, toRetailUnderwritingInput,
} from '../underwriting/retail-development-persistence';
import type {
  OpportunityListQuery, OpportunityPatch, OpportunityRepository, ProvenanceReplace,
} from '../persistence/repository';
import type {
  OpportunityStage, ProvenanceType, SourceType, UnderwritingRow,
} from '../persistence/contracts';
import {
  toOpportunityDto, toSourceDto, toUnderwritingDto, type OpportunityDto,
  type OpportunitySourceDto, type ProvenanceDto, type UnderwritingVersionDto,
} from './dtos';
import type { OpportunityActor } from './actor';
import { opportunityError, OpportunityApplicationError } from './errors';
import {
  assertTenantInEnvelope, type ProvenanceIdentity,
} from './provenance';
import { canonicalEconomicHash } from '../underwriting/economic-hash';
import { projectUnderwritingSummary } from '../underwriting/summary-projection';

const nonEmpty = (value: string, label: string) => {
  const normalized = value.trim();
  if (!normalized) throw opportunityError('validation', `${label} is required.`);
  return normalized;
};
const OPPORTUNITY_STAGES = new Set<OpportunityStage>([
  'new', 'screening', 'diligence', 'loi_preparation', 'loi_submitted',
  'negotiation', 'under_contract', 'promoted_to_deal', 'dead',
]);
const SOURCE_TYPES = new Set<SourceType>(['manual', 'listing', 'document', 'api', 'email', 'other']);
const PROVENANCE_TYPES = new Set<ProvenanceType>([
  'manual', 'organization_default', 'listing_extraction', 'document_extraction',
  'api', 'prior_version', 'manual_override',
]);

function validateStage(stage: unknown): asserts stage is OpportunityStage {
  if (typeof stage !== 'string' || !OPPORTUNITY_STAGES.has(stage as OpportunityStage)) {
    throw opportunityError('validation', 'Opportunity stage is invalid.');
  }
  if (stage === 'promoted_to_deal') {
    throw opportunityError('validation', 'Deal promotion requires the future promotion service.');
  }
}

const decimalOrNull = (value: string | null | undefined, label: string) => {
  if (value == null || value.trim() === '') return null;
  const normalized = value.trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    throw opportunityError('validation', `${label} must be a non-negative decimal.`);
  }
  return normalized;
};

export type CreateOpportunityInput = {
  name: string; stage?: OpportunityStage;
  address?: { line1?: string | null; line2?: string | null; city?: string | null;
    state?: string | null; postalCode?: string | null; county?: string | null; market?: string | null };
  latitude?: string | null; longitude?: string | null; landAreaSf?: string | null;
  existingBuildingAreaSf?: string | null; askingPrice?: string | null;
  broker?: { name?: string | null; company?: string | null; email?: string | null; phone?: string | null };
  assignedToEmail?: string | null; notes?: string | null; deadReason?: string | null;
};

export type UpdateOpportunityInput = Partial<Omit<CreateOpportunityInput, 'stage'>> & {
  stage?: OpportunityStage; archivedAt?: string | null;
};

export type ListOpportunityInput = Partial<Omit<OpportunityListQuery, 'page' | 'pageSize'>> & {
  page?: number; pageSize?: number;
};

const createFields = (input: CreateOpportunityInput, actor: OpportunityActor) => ({
  name: nonEmpty(input.name, 'Opportunity name'),
  ...(input.stage !== undefined && (validateStage(input.stage), { stage: input.stage })),
  ...(input.address?.line1 !== undefined && { property_address_line_1: input.address.line1 }),
  ...(input.address?.line2 !== undefined && { property_address_line_2: input.address.line2 }),
  ...(input.address?.city !== undefined && { property_city: input.address.city }),
  ...(input.address?.state !== undefined && { property_state: input.address.state }),
  ...(input.address?.postalCode !== undefined && { property_postal_code: input.address.postalCode }),
  ...(input.address?.county !== undefined && { property_county: input.address.county }),
  ...(input.address?.market !== undefined && { property_market: input.address.market }),
  ...(input.latitude !== undefined && { property_latitude: input.latitude }),
  ...(input.longitude !== undefined && { property_longitude: input.longitude }),
  ...(input.landAreaSf !== undefined && { land_area_sf: decimalOrNull(input.landAreaSf, 'Land area') }),
  ...(input.existingBuildingAreaSf !== undefined && {
    existing_building_area_sf: decimalOrNull(input.existingBuildingAreaSf, 'Existing building area'),
  }),
  ...(input.askingPrice !== undefined && { asking_price: decimalOrNull(input.askingPrice, 'Asking price') }),
  ...(input.broker?.name !== undefined && { broker_name: input.broker.name }),
  ...(input.broker?.company !== undefined && { broker_company: input.broker.company }),
  ...(input.broker?.email !== undefined && { broker_email: input.broker.email }),
  ...(input.broker?.phone !== undefined && { broker_phone: input.broker.phone }),
  ...(input.assignedToEmail !== undefined && { assigned_to_email: input.assignedToEmail }),
  ...(input.notes !== undefined && { notes: input.notes }),
  ...(input.deadReason !== undefined && { dead_reason: input.deadReason }),
  created_by_email: actor.email, updated_by_email: actor.email,
});

export async function createOpportunity(
  input: CreateOpportunityInput, actor: OpportunityActor, repository: OpportunityRepository,
): Promise<OpportunityDto> {
  return toOpportunityDto(await repository.insertOpportunity(createFields(input, actor)));
}

export async function getOpportunity(
  id: string, _actor: OpportunityActor, repository: OpportunityRepository,
): Promise<OpportunityDto> {
  const row = await repository.getOpportunity(id);
  if (!row) throw opportunityError('not_found', 'Opportunity was not found.');
  return toOpportunityDto(row, await repository.getActiveUnderwriting(id));
}

export async function listOpportunities(
  input: ListOpportunityInput, _actor: OpportunityActor, repository: OpportunityRepository,
): Promise<{ items: OpportunityDto[]; page: number; pageSize: number; total: number }> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw opportunityError('validation', 'Pagination must use page >= 1 and pageSize between 1 and 100.');
  }
  const result = await repository.listOpportunities({ ...input, page, pageSize });
  return { items: result.rows.map(({ opportunity, activeUnderwriting }) =>
    toOpportunityDto(opportunity, activeUnderwriting)), page, pageSize, total: result.total };
}

const allowedPatchKeys = new Set([
  'name', 'stage', 'address', 'latitude', 'longitude', 'landAreaSf', 'existingBuildingAreaSf',
  'askingPrice', 'broker', 'assignedToEmail', 'notes', 'deadReason', 'archivedAt',
]);

function updateFields(input: UpdateOpportunityInput, actor: OpportunityActor, expectedRevision: number): OpportunityPatch {
  for (const key of Object.keys(input)) {
    if (!allowedPatchKeys.has(key)) throw opportunityError('validation', `Opportunity field ${key} is not mutable.`);
  }
  const fields = createFields({ ...input, name: input.name ?? '__unchanged__' }, actor);
  const { created_by_email: _created, name, ...rest } = fields;
  void _created;
  const patch: OpportunityPatch = { ...rest, revision: expectedRevision + 1, updated_by_email: actor.email };
  if (input.name !== undefined) patch.name = nonEmpty(input.name, 'Opportunity name');
  else void name;
  if (input.archivedAt !== undefined) patch.archived_at = input.archivedAt;
  if (Object.keys(patch).every((key) => key === 'revision' || key === 'updated_by_email')) {
    throw opportunityError('validation', 'At least one mutable Opportunity field is required.');
  }
  return patch;
}

async function classifyConditionalMiss(
  id: string, repository: OpportunityRepository, resource: 'opportunity' | 'underwriting',
): Promise<never> {
  const row = resource === 'opportunity' ? await repository.getOpportunity(id) : await repository.getUnderwriting(id);
  if (!row) throw opportunityError('not_found', `${resource === 'opportunity' ? 'Opportunity' : 'Underwriting'} was not found.`);
  if (resource === 'underwriting' && (row as UnderwritingRow).status === 'final') {
    throw opportunityError('immutable', 'Final underwriting is immutable.');
  }
  throw opportunityError('revision_conflict', 'The resource changed; refresh and retry.');
}

export async function updateOpportunity(
  id: string, expectedRevision: number, patch: UpdateOpportunityInput,
  actor: OpportunityActor, repository: OpportunityRepository,
): Promise<OpportunityDto> {
  const updated = await repository.updateOpportunity(id, expectedRevision, updateFields(patch, actor, expectedRevision));
  if (!updated) return classifyConditionalMiss(id, repository, 'opportunity');
  return toOpportunityDto(updated, await repository.getActiveUnderwriting(id));
}

export type AddSourceInput = {
  type: SourceType; provider?: string | null; externalId?: string | null;
  sourceUrl?: string | null; storagePath?: string | null; title?: string | null;
  observedAt?: string | null; primary?: boolean; metadata?: Record<string, unknown>;
};

export async function addOpportunitySource(
  opportunityId: string, input: AddSourceInput, actor: OpportunityActor,
  repository: OpportunityRepository,
): Promise<OpportunitySourceDto> {
  if (typeof input.type !== 'string' || !SOURCE_TYPES.has(input.type as SourceType)) {
    throw opportunityError('validation', 'Opportunity source type is invalid.');
  }
  if (input.metadata !== undefined &&
    (typeof input.metadata !== 'object' || input.metadata === null || Array.isArray(input.metadata))) {
    throw opportunityError('validation', 'Opportunity source metadata must be an object.');
  }
  if (!(await repository.getOpportunity(opportunityId))) throw opportunityError('not_found', 'Opportunity was not found.');
  return toSourceDto(await repository.insertSource({
    opportunity_id: opportunityId, source_type: input.type,
    ...(input.provider !== undefined && { provider: input.provider }),
    ...(input.externalId !== undefined && { external_id: input.externalId }),
    ...(input.sourceUrl !== undefined && { source_url: input.sourceUrl }),
    ...(input.storagePath !== undefined && { storage_path: input.storagePath }),
    ...(input.title !== undefined && { title: input.title }),
    ...(input.observedAt !== undefined && { observed_at: input.observedAt }),
    ...(input.primary !== undefined && { is_primary: input.primary }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    created_by_email: actor.email, updated_by_email: actor.email,
  }));
}

export async function listOpportunitySources(
  opportunityId: string, _actor: OpportunityActor, repository: OpportunityRepository,
): Promise<OpportunitySourceDto[]> {
  if (!(await repository.getOpportunity(opportunityId))) throw opportunityError('not_found', 'Opportunity was not found.');
  return (await repository.listSources(opportunityId)).map(toSourceDto);
}

export async function getOpportunitySource(
  opportunityId: string, sourceId: string, _actor: OpportunityActor,
  repository: OpportunityRepository,
): Promise<OpportunitySourceDto> {
  const source = await repository.getSource(sourceId, opportunityId);
  if (!source) throw opportunityError('not_found', 'Opportunity source was not found.');
  return toSourceDto(source);
}

export async function setPrimaryOpportunitySource(): Promise<never> {
  throw opportunityError('persistence',
    'Primary-source switching requires an approved transactional database primitive.');
}

const POLICY_KEYS = [
  'calculationVersion', 'pursueSpread', 'reviewSpread', 'reconciliationTolerance',
] as const;
const DECIMAL_POLICY_KEYS = ['pursueSpread', 'reviewSpread', 'reconciliationTolerance'] as const;

function completePolicy(value: unknown, source: 'caller' | 'stored'): CalculationPolicy {
  if (typeof value !== 'object' || value === null) {
    throw opportunityError('validation', `${source === 'stored' ? 'Stored' : 'Calculation'} policy is invalid.`);
  }
  const policy = value as Record<string, unknown>;
  if (Object.keys(policy).some((key) => !POLICY_KEYS.includes(key as typeof POLICY_KEYS[number])) ||
    typeof policy.calculationVersion !== 'string' || !policy.calculationVersion.trim()) {
    throw opportunityError('validation', 'Calculation policy must contain only the complete V1 policy.');
  }
  for (const key of DECIMAL_POLICY_KEYS) {
    const item = policy[key];
    const valid = typeof item === 'number' ? Number.isFinite(item) :
      typeof item === 'string' && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(item.trim());
    if (!valid) throw opportunityError('validation', `Calculation policy ${key} must be a finite decimal.`);
  }
  const tolerance = policy.reconciliationTolerance;
  if ((typeof tolerance === 'number' && tolerance < 0) ||
    (typeof tolerance === 'string' && tolerance.trim().startsWith('-'))) {
    throw opportunityError('validation', 'Calculation policy reconciliationTolerance must be non-negative.');
  }
  return value as CalculationPolicy;
}

function resolvedPolicy(overrides?: Partial<CalculationPolicy>): CalculationPolicy {
  if (overrides && Object.keys(overrides).some((key) =>
    !POLICY_KEYS.includes(key as typeof POLICY_KEYS[number]))) {
    throw opportunityError('validation', 'Calculation policy contains an unsupported field.');
  }
  return completePolicy({ ...DEFAULT_CALCULATION_POLICY, ...overrides }, 'caller');
}

export async function createRetailDevelopmentUnderwritingDraft(
  opportunityId: string, envelopeValue: unknown, actor: OpportunityActor,
  repository: OpportunityRepository, options?: { makeActive?: boolean; policy?: Partial<CalculationPolicy> },
): Promise<UnderwritingVersionDto> {
  const envelope = parseRetailDevelopmentPersistenceEnvelope(envelopeValue);
  const result = await repository.createDraft(opportunityId, envelope, resolvedPolicy(options?.policy),
    actor.email, options?.makeActive ?? false);
  const row = await repository.getUnderwriting(result.version_id);
  if (!row) throw opportunityError('persistence', 'Created underwriting could not be reloaded.');
  return toUnderwritingDto(row);
}

export async function cloneRetailDevelopmentUnderwritingVersion(
  sourceVersionId: string, expectedRevision: number, actor: OpportunityActor,
  repository: OpportunityRepository,
): Promise<UnderwritingVersionDto> {
  const result = await repository.cloneVersion(sourceVersionId, expectedRevision, actor.email);
  const row = await repository.getUnderwriting(result.version_id);
  if (!row) throw opportunityError('persistence', 'Cloned underwriting could not be reloaded.');
  return toUnderwritingDto(row);
}

export async function getUnderwritingVersion(
  id: string, _actor: OpportunityActor, repository: OpportunityRepository,
): Promise<UnderwritingVersionDto> {
  const row = await repository.getUnderwriting(id);
  if (!row) throw opportunityError('not_found', 'Underwriting was not found.');
  return toUnderwritingDto(row);
}

export async function listUnderwritingVersions(
  opportunityId: string, _actor: OpportunityActor, repository: OpportunityRepository,
): Promise<UnderwritingVersionDto[]> {
  return (await repository.listUnderwritings(opportunityId)).map(toUnderwritingDto);
}

export async function updateRetailDevelopmentUnderwritingDraft(
  versionId: string, expectedRevision: number, envelopeValue: unknown,
  actor: OpportunityActor, repository: OpportunityRepository,
): Promise<UnderwritingVersionDto> {
  const envelope = parseRetailDevelopmentPersistenceEnvelope(envelopeValue);
  const updated = await repository.updateDraftInput(versionId, expectedRevision, envelope, actor.email);
  if (!updated) return classifyConditionalMiss(versionId, repository, 'underwriting');
  return toUnderwritingDto(updated);
}

function calculate(row: UnderwritingRow): {
  result: RetailUnderwritingResult; policy: CalculationPolicy; inputHash: string;
} {
  const envelope = parseRetailDevelopmentPersistenceEnvelope(row.input_payload);
  const input = toRetailUnderwritingInput(envelope);
  const policy = completePolicy(row.calculation_policy, 'stored');
  const result = calculateRetailDevelopmentUnderwriting(input, { policy });
  if (result.diagnostics.some(({ code }) => code === 'CALCULATION_FAILURE')) {
    throw opportunityError('calculation', 'Retail-development calculation failed.');
  }
  return { result, policy, inputHash: canonicalEconomicHash(input, policy) };
}

async function calculateAndPersist(
  versionId: string, expectedRevision: number, actor: OpportunityActor,
  repository: OpportunityRepository, final: boolean,
): Promise<UnderwritingVersionDto> {
  const row = await repository.getUnderwriting(versionId);
  if (!row) throw opportunityError('not_found', 'Underwriting was not found.');
  if (row.status === 'final') throw opportunityError('immutable', 'Final underwriting is immutable.');
  if (row.revision !== expectedRevision) throw opportunityError('revision_conflict', 'The resource changed; refresh and retry.');
  let calculation: ReturnType<typeof calculate>;
  try {
    calculation = calculate(row);
  } catch (cause) {
    if (cause instanceof OpportunityApplicationError) throw cause;
    throw opportunityError('calculation', 'Retail-development calculation failed.', cause);
  }
  const now = new Date().toISOString();
  const saved = await repository.saveCalculation(versionId, expectedRevision, {
    result_payload: calculation.result, calculation_policy: calculation.policy,
    calculation_version: calculation.result.calculationVersion, input_hash: calculation.inputHash,
    calculated_at: now, finalized_at: final ? now : null, status: final ? 'final' : 'draft',
    revision: expectedRevision + 1, updated_by_email: actor.email,
    ...projectUnderwritingSummary(calculation.result),
  });
  if (!saved) return classifyConditionalMiss(versionId, repository, 'underwriting');
  return toUnderwritingDto(saved);
}

export const calculateRetailDevelopmentUnderwritingVersion = (
  versionId: string, expectedRevision: number, actor: OpportunityActor, repository: OpportunityRepository,
) => calculateAndPersist(versionId, expectedRevision, actor, repository, false);

export const finalizeRetailDevelopmentUnderwriting = (
  versionId: string, expectedRevision: number, actor: OpportunityActor, repository: OpportunityRepository,
) => calculateAndPersist(versionId, expectedRevision, actor, repository, true);

export async function setActiveUnderwriting(
  opportunityId: string, versionId: string, expectedRevision: number,
  actor: OpportunityActor, repository: OpportunityRepository,
): Promise<UnderwritingVersionDto> {
  const result = await repository.setActive(opportunityId, versionId, expectedRevision, actor.email);
  const row = await repository.getUnderwriting(result.version_id);
  if (!row) throw opportunityError('persistence', 'Active underwriting could not be reloaded.');
  return toUnderwritingDto(row);
}

export type ReplaceProvenanceInput = {
  identity: ProvenanceIdentity; provenanceType: ProvenanceType;
  opportunitySourceId?: string; originalText?: string; originalValue?: unknown;
  normalizedValue?: unknown; unit?: string; sourceLocator?: string;
  confidence?: string; metadata?: Record<string, unknown>;
};

export async function replaceFieldProvenance(
  opportunityId: string, input: ReplaceProvenanceInput, actor: OpportunityActor,
  repository: OpportunityRepository,
): Promise<ProvenanceDto> {
  if (typeof input.provenanceType !== 'string' ||
    !PROVENANCE_TYPES.has(input.provenanceType as ProvenanceType)) {
    throw opportunityError('validation', 'Provenance type is invalid.');
  }
  if (input.identity.domain === 'tenant') {
    const row = await repository.getUnderwriting(input.identity.underwritingVersionId);
    if (!row) throw opportunityError('not_found', 'Underwriting was not found.');
    if (row.status === 'final') throw opportunityError('immutable', 'Final underwriting provenance is immutable.');
    assertTenantInEnvelope(parseRetailDevelopmentPersistenceEnvelope(row.input_payload), input.identity.tenantKey);
  }
  const request: ProvenanceReplace = {
    opportunityId, domain: input.identity.domain, fieldPath: input.identity.fieldPath,
    provenanceType: input.provenanceType, actorEmail: actor.email,
    ...(input.identity.domain !== 'opportunity' && {
      underwritingVersionId: input.identity.underwritingVersionId,
    }),
    ...(input.identity.domain === 'tenant' && { tenantKey: input.identity.tenantKey }),
    ...(input.opportunitySourceId !== undefined && { opportunitySourceId: input.opportunitySourceId }),
    ...(input.originalText !== undefined && { originalText: input.originalText }),
    ...(input.originalValue !== undefined && { originalValue: input.originalValue }),
    ...(input.normalizedValue !== undefined && { normalizedValue: input.normalizedValue }),
    ...(input.unit !== undefined && { unit: input.unit }),
    ...(input.sourceLocator !== undefined && { sourceLocator: input.sourceLocator }),
    ...(input.confidence !== undefined && { confidence: input.confidence }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
  };
  const row = await repository.replaceProvenance(request);
  return {
    id: row.provenance_id, opportunityId: row.opportunity_id,
    underwritingVersionId: row.underwriting_version_id, tenantKey: row.tenant_key,
    fieldPath: row.field_path, scope: row.scope,
    supersedesProvenanceId: row.supersedes_provenance_id, createdAt: row.created_at,
  };
}
