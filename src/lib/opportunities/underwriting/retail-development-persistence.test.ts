import { describe, expect, it } from 'vitest';
import {
  canonicalInput,
  marketInput,
} from '../../underwriting/retail-development/tests/fixtures/canonical';
import {
  PersistenceEnvelopeValidationError,
  RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
  parseRetailDevelopmentPersistenceEnvelope,
  tenantProvenanceFieldPath,
  toRetailUnderwritingInput,
  type PersistedTenantInput,
  type RetailDevelopmentPersistenceEnvelope,
} from './retail-development-persistence';

const FIRST_KEY = '99a384c6-b3f9-4198-9a8d-28621dd07652';
const SECOND_KEY = '1a331232-4e8b-42a0-82e5-177fb5b353cc';

const persistedTenant = (tenantKey: string, name = 'Anchor Tenant'): PersistedTenantInput => ({
  tenantKey,
  name,
  useType: 'retail',
  displayOrder: 1,
  sizeSf: '15000',
  rentalRatePerSfYear: '30',
  annualRentBump: '0.02',
  leaseCommencementDate: '2028-01-01',
  leaseTermMonths: 120,
  freeRentMonths: '3',
  tenantImprovementPerSf: '45',
  leasingCommissionRate: '0.06',
});

const rosterEnvelope = (tenants: PersistedTenantInput[]): RetailDevelopmentPersistenceEnvelope => ({
  schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
  engineInput: { ...canonicalInput, leasing: { mode: 'tenantRoster', tenants } },
});

describe('retail development persistence envelope', () => {
  it('accepts a supported market-mode envelope', () => {
    if (marketInput.leasing.mode !== 'market') throw new Error('Expected market fixture');
    const envelope: RetailDevelopmentPersistenceEnvelope = {
      schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
      engineInput: { ...marketInput, leasing: marketInput.leasing },
    };
    expect(parseRetailDevelopmentPersistenceEnvelope(envelope)).toBe(envelope);
    expect(toRetailUnderwritingInput(envelope)).toStrictEqual(marketInput);
  });

  it('accepts valid UUID keys and strips them while preserving economic order', () => {
    const envelope = rosterEnvelope([
      persistedTenant(FIRST_KEY, 'First'),
      { ...persistedTenant(SECOND_KEY, 'Second'), displayOrder: 2 },
    ]);
    const engineInput = toRetailUnderwritingInput(envelope);
    expect(engineInput.leasing.mode === 'tenantRoster'
      && engineInput.leasing.tenants.map(({ name }) => name)).toEqual(['First', 'Second']);
    expect(engineInput.leasing.mode === 'tenantRoster' && engineInput.leasing.tenants)
      .toEqual([
        expect.not.objectContaining({ tenantKey: expect.anything() }),
        expect.not.objectContaining({ tenantKey: expect.anything() }),
      ]);
  });

  it.each([
    ['', 'non-empty'],
    ['not-a-uuid', 'UUID'],
  ])('rejects tenant key %j', (tenantKey, expectedMessage) => {
    expect(() => parseRetailDevelopmentPersistenceEnvelope(
      rosterEnvelope([persistedTenant(tenantKey)]),
    )).toThrow(expectedMessage);
  });

  it('rejects duplicate tenant keys case-insensitively', () => {
    expect(() => parseRetailDevelopmentPersistenceEnvelope(rosterEnvelope([
      persistedTenant(FIRST_KEY),
      persistedTenant(FIRST_KEY.toUpperCase(), 'Duplicate'),
    ]))).toThrow('duplicate tenantKey');
  });

  it('rejects unsupported versions, missing input, and malformed engine structure', () => {
    expect(() => parseRetailDevelopmentPersistenceEnvelope({
      schemaVersion: 'future', engineInput: marketInput,
    })).toThrow(PersistenceEnvelopeValidationError);
    expect(() => parseRetailDevelopmentPersistenceEnvelope({
      schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
    })).toThrow('engineInput must be an object');
    expect(() => parseRetailDevelopmentPersistenceEnvelope({
      schemaVersion: RETAIL_DEVELOPMENT_PERSISTENCE_SCHEMA_VERSION,
      engineInput: { leasing: { mode: 'market' } },
    })).toThrow('engineInput.site must be an object');
  });

  it('reordering and cloning preserve tenant keys without mapper-side generation', () => {
    const original = rosterEnvelope([
      persistedTenant(FIRST_KEY, 'First'),
      persistedTenant(SECOND_KEY, 'Second'),
    ]);
    if (original.engineInput.leasing.mode !== 'tenantRoster') throw new Error('Expected roster');
    const reordered = rosterEnvelope(original.engineInput.leasing.tenants.slice().reverse());
    const cloned = structuredClone(original);

    expect(reordered.engineInput.leasing.mode === 'tenantRoster'
      && reordered.engineInput.leasing.tenants.map(({ tenantKey }) => tenantKey))
      .toEqual([SECOND_KEY, FIRST_KEY]);
    expect(cloned).toStrictEqual(original);
    expect(toRetailUnderwritingInput(cloned)).not.toHaveProperty('leasing.tenants.0.tenantKey');
  });

  it('uses tenant-relative provenance paths without duplicating tenant identity', () => {
    expect(tenantProvenanceFieldPath(' rentalRatePerSfYear ')).toBe('rentalRatePerSfYear');
    expect(tenantProvenanceFieldPath('rentalRatePerSfYear')).not.toContain(FIRST_KEY);
    expect(() => tenantProvenanceFieldPath('   ')).toThrow('non-empty');
  });
});
