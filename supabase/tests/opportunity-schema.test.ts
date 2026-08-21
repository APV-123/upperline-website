import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260821000100_create_acquisition_opportunities.sql'),
  'utf8',
);

describe('acquisition Opportunity migration contract', () => {
  it('creates exactly the approved tables with private-by-default RLS', () => {
    const tables = [...migration.matchAll(/create table public\.(\w+)/gi)].map((match) => match[1]);
    expect(tables).toEqual([
      'acquisition_opportunities', 'opportunity_sources',
      'opportunity_underwriting_versions', 'opportunity_field_provenance',
    ]);
    expect(migration.match(/enable row level security/gi)).toHaveLength(4);
    expect(migration).not.toMatch(/create\s+policy/i);
  });

  it('uses Deal UUID identity and the asymmetric promotion rule', () => {
    expect(migration).toMatch(/promoted_deal_id uuid/);
    expect(migration).toMatch(/unique \(promoted_deal_id\)/);
    expect(migration).toMatch(/references public\.deals\(id\) on delete restrict/);
    expect(migration).toMatch(/stage <> 'promoted_to_deal' or promoted_deal_id is not null/);
    expect(migration).not.toMatch(/promoted_deal_id is null or stage = 'promoted_to_deal'/);
  });

  it('encodes lifecycle, source, version, and active-version integrity', () => {
    for (const stage of ['new', 'screening', 'diligence', 'loi_preparation',
      'loi_submitted', 'negotiation', 'under_contract', 'promoted_to_deal', 'dead']) {
      expect(migration).toContain(`'${stage}'`);
    }
    expect(migration).toMatch(/opportunity_sources_one_primary_idx[\s\S]*where is_primary/);
    expect(migration).toMatch(/unique \(opportunity_id, underwriting_type, version_number\)/);
    expect(migration).toMatch(/opportunity_underwriting_versions_one_active_idx[\s\S]*where is_active/);
  });

  it('allows incomplete final snapshots but requires fresh calculation artifacts', () => {
    expect(migration).toMatch(
      /status <> 'final' or \([\s\S]*result_payload is not null[\s\S]*is_complete is not null/,
    );
    expect(migration).not.toMatch(/status <> 'final'[^;]*is_complete = true/);
  });

  it('protects final economic state and final-version provenance', () => {
    expect(migration).toContain('protect_final_underwriting_version');
    expect(migration).toContain('Final underwriting economic state is immutable');
    expect(migration).toContain('protect_final_underwriting_provenance');
    expect(migration).toContain('Provenance associated with a final underwriting version is immutable');
    expect(migration).toMatch(
      /opportunity_underwriting_versions_protect_final[\s\S]*before update or delete/,
    );
    expect(migration).toContain('Final underwriting versions are historical and cannot be deleted');
    expect(migration).not.toMatch(/parent.*visib|cascade escape/i);
  });

  it('blocks deletion of historical Opportunities while leaving draft cleanup cascades intact', () => {
    expect(migration).toContain('protect_historical_opportunity');
    expect(migration).toMatch(
      /where opportunity_id = old\.id and status = 'final'/,
    );
    expect(migration).toContain('before delete on public.acquisition_opportunities');
    expect(migration.match(/references public\.acquisition_opportunities\(id\) on delete cascade/g))
      .toHaveLength(3);
  });

  it('constrains lineage to the same Opportunity and underwriting type', () => {
    expect(migration).toMatch(
      /foreign key \(based_on_version_id, opportunity_id, underwriting_type\)[\s\S]*references public\.opportunity_underwriting_versions\(id, opportunity_id, underwriting_type\)/,
    );
    expect(migration).toMatch(/unique \(id, opportunity_id, underwriting_type\)/);
    expect(migration).toMatch(/based_on_version_id is null or based_on_version_id <> id/);
  });

  it('enforces provenance scope, current uniqueness, and stable tenant keys', () => {
    expect(migration).toMatch(/scope = 'opportunity' and underwriting_version_id is null and tenant_key is null/);
    expect(migration).toMatch(/scope = 'underwriting' and underwriting_version_id is not null/);
    expect(migration).toContain('opportunity_field_provenance_current_opportunity_idx');
    expect(migration).toContain('opportunity_field_provenance_current_underwriting_idx');
    expect(migration).toContain('opportunity_field_provenance_current_tenant_idx');
    expect(migration).toMatch(/tenant_key uuid/);
    expect(migration).toContain('tenant-relative path such as rentalRatePerSfYear');
    expect(migration).toContain("input_payload->>'schemaVersion' = 'retail-development-persistence-v1'");
  });

  it('encodes concurrency and cascade/restrict behavior', () => {
    expect(migration.match(/revision integer not null default 1/g)).toHaveLength(3);
    expect(migration.match(/references public\.acquisition_opportunities\(id\) on delete cascade/g))
      .toHaveLength(3);
    expect(migration).toMatch(/opportunity_field_provenance_source_fkey[\s\S]*on delete no action/);
  });

  it('prevents cross-Opportunity provenance supersession', () => {
    expect(migration).toMatch(
      /foreign key \(supersedes_provenance_id, opportunity_id\)[\s\S]*references public\.opportunity_field_provenance\(id, opportunity_id\)/,
    );
    expect(migration).toMatch(/unique \(id, opportunity_id\)/);
  });

  it('protects referenced final provenance from INSERT and UPDATE supersession races', () => {
    expect(migration).toMatch(
      /new\.supersedes_provenance_id is not null[\s\S]*referenced\.underwriting_version_id[\s\S]*status = 'final'/,
    );
    expect(migration).toContain('cannot be superseded');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('enforce_no_final_provenance_supersession');
    expect(migration).toContain('enforce_final_underwriting_not_superseded');
    expect(migration.match(/deferrable initially deferred/g)).toHaveLength(2);
  });
});
