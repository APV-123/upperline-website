import {
  validateInput,
  type RetailUnderwritingInput,
  type TenantInput,
} from '../../underwriting/retail-development';

export const RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION =
  'retail-development-persistence-v1' as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PersistedTenantInput = TenantInput & {
  /** Durable persistence identity; deliberately excluded from the economic engine. */
  tenantKey: string;
};

type PersistedLeasingInput =
  | Extract<RetailUnderwritingInput['leasing'], { mode: 'market' }>
  | { mode: 'tenantRoster'; tenants: PersistedTenantInput[] };

export type PersistedRetailUnderwritingInput = Omit<RetailUnderwritingInput, 'leasing'> & {
  leasing: PersistedLeasingInput;
};

export type RetailDevelopmentPersistenceEnvelope = {
  schemaVersion: typeof RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION;
  engineInput: PersistedRetailUnderwritingInput;
};

export class PersistenceEnvelopeValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid retail-development persistence envelope: ${issues.join('; ')}`);
    this.name = 'PersistenceEnvelopeValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function mapValidatedEnvelope(
  envelope: RetailDevelopmentPersistenceEnvelope,
): RetailUnderwritingInput {
  const { engineInput } = envelope;
  if (engineInput.leasing.mode !== 'tenantRoster') return engineInput;

  return {
    ...engineInput,
    leasing: {
      mode: 'tenantRoster',
      tenants: engineInput.leasing.tenants.map((persistedTenant) => {
        const { tenantKey, ...tenant } = persistedTenant;
        void tenantKey;
        return tenant;
      }),
    },
  };
}

/** Runtime boundary for JSON loaded from persistence or received by server code. */
export function parseRetailDevelopmentPersistenceEnvelope(
  value: unknown,
): RetailDevelopmentPersistenceEnvelope {
  const issues: string[] = [];
  if (!isRecord(value)) {
    throw new PersistenceEnvelopeValidationError(['envelope must be an object']);
  }
  if (value.schemaVersion !== RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION) {
    issues.push(`unsupported schemaVersion: ${String(value.schemaVersion)}`);
  }
  if (!isRecord(value.engineInput)) {
    issues.push('engineInput must be an object');
    throw new PersistenceEnvelopeValidationError(issues);
  }

  if (typeof value.engineInput.analysisDate !== 'string') {
    issues.push('engineInput.analysisDate must be a string');
  }
  for (const section of [
    'site', 'development', 'timeline', 'financing', 'leaseUp', 'operations', 'disposition',
  ]) {
    if (!isRecord(value.engineInput[section])) {
      issues.push(`engineInput.${section} must be an object`);
    }
  }

  const leasing = value.engineInput.leasing;
  if (!isRecord(leasing) || (leasing.mode !== 'market' && leasing.mode !== 'tenantRoster')) {
    issues.push('engineInput.leasing must be market or tenantRoster');
  } else if (leasing.mode === 'tenantRoster') {
    if (!Array.isArray(leasing.tenants)) {
      issues.push('engineInput.leasing.tenants must be an array');
    } else {
      const seenKeys = new Set<string>();
      leasing.tenants.forEach((tenant, index) => {
        if (!isRecord(tenant)) {
          issues.push(`tenant ${index} must be an object`);
          return;
        }
        const tenantKey = tenant.tenantKey;
        if (typeof tenantKey !== 'string' || tenantKey.trim().length === 0) {
          issues.push(`tenant ${index} tenantKey must be non-empty`);
        } else if (!UUID_PATTERN.test(tenantKey)) {
          issues.push(`tenant ${index} tenantKey must be a UUID`);
        } else {
          const normalizedKey = tenantKey.toLowerCase();
          if (seenKeys.has(normalizedKey)) issues.push(`duplicate tenantKey: ${tenantKey}`);
          seenKeys.add(normalizedKey);
        }
      });
    }
  }

  if (issues.length > 0) throw new PersistenceEnvelopeValidationError(issues);

  const envelope = value as RetailDevelopmentPersistenceEnvelope;
  try {
    const engineDiagnostics = validateInput(mapValidatedEnvelope(envelope));
    for (const diagnostic of engineDiagnostics.filter(({ severity }) => severity === 'error')) {
      issues.push(`${diagnostic.path}: ${diagnostic.message}`);
    }
  } catch {
    issues.push('engineInput does not have the required retail-development structure');
  }

  if (issues.length > 0) throw new PersistenceEnvelopeValidationError(issues);
  return envelope;
}

/** Validates persistence identity, then returns the Phase 1 identity-agnostic input. */
export function toRetailUnderwritingInput(value: unknown): RetailUnderwritingInput {
  return mapValidatedEnvelope(parseRetailDevelopmentPersistenceEnvelope(value));
}

/** Tenant provenance paths are tenant-relative; tenantKey is stored separately. */
export function tenantProvenanceFieldPath(fieldPath: string): string {
  const normalized = fieldPath.trim();
  if (normalized.length === 0) throw new Error('Tenant provenance field path must be non-empty');
  return normalized;
}
