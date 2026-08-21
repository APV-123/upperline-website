import { tenantProvenanceFieldPath, type RetailDevelopmentPersistenceEnvelope } from '../underwriting/retail-development-persistence';
import { opportunityError } from './errors';

export type OpportunityProvenanceIdentity = { domain: 'opportunity'; fieldPath: string };
export type UnderwritingProvenanceIdentity = {
  domain: 'underwriting'; underwritingVersionId: string; fieldPath: string;
};
export type TenantProvenanceIdentity = {
  domain: 'tenant'; underwritingVersionId: string; tenantKey: string; fieldPath: string;
};
export type ProvenanceIdentity =
  | OpportunityProvenanceIdentity | UnderwritingProvenanceIdentity | TenantProvenanceIdentity;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD_PATH_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;
const TENANT_FIELDS = new Set([
  'name', 'useType', 'displayOrder', 'sizeSf', 'rentalRatePerSfYear', 'annualRentBump',
  'leaseCommencementDate', 'leaseTermMonths', 'freeRentMonths',
  'tenantImprovementPerSf', 'leasingCommissionRate',
]);

const normalizedPath = (path: string) => {
  if (typeof path !== 'string') throw opportunityError('validation', 'Provenance field path is required.');
  const result = path.trim();
  if (!FIELD_PATH_PATTERN.test(result)) {
    throw opportunityError('validation', 'Provenance field path must use canonical dotted application fields.');
  }
  return result;
};

export const opportunityField = (fieldPath: string): OpportunityProvenanceIdentity =>
  ({ domain: 'opportunity', fieldPath: normalizedPath(fieldPath) });
export const underwritingField = (underwritingVersionId: string, fieldPath: string): UnderwritingProvenanceIdentity =>
  ({ domain: 'underwriting', underwritingVersionId, fieldPath: normalizedPath(fieldPath) });
export const tenantUnderwritingField = (
  underwritingVersionId: string, tenantKey: string, fieldPath: string,
): TenantProvenanceIdentity => {
  if (!UUID_PATTERN.test(tenantKey)) throw opportunityError('validation', 'Tenant provenance key must be a UUID.');
  const normalized = normalizedPath(tenantProvenanceFieldPath(fieldPath));
  if (!TENANT_FIELDS.has(normalized)) {
    throw opportunityError('validation', 'Tenant provenance field is not supported.');
  }
  return { domain: 'tenant', underwritingVersionId, tenantKey, fieldPath: normalized };
};

export function assertTenantInEnvelope(envelope: RetailDevelopmentPersistenceEnvelope, tenantKey: string): void {
  const leasing = envelope.engineInput.leasing;
  if (leasing.mode !== 'tenantRoster' ||
    !leasing.tenants.some((tenant) => tenant.tenantKey.toLowerCase() === tenantKey.toLowerCase())) {
    throw opportunityError('validation', 'Tenant provenance key is not present in the draft underwriting.');
  }
}
