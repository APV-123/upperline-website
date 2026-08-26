import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = resolve(process.cwd(), 'supabase/migrations/20260826000100_create_property_intelligence_observations.sql');
const sql = readFileSync(migration, 'utf8');
const tables = [...sql.matchAll(/create table public\.([a-z0-9_]+)\s*\(/gi)].map((match) => match[1]);

describe('Phase 4C.2.3 observation persistence migration', () => {
  it('creates the approved 29-table inventory exactly once', () => {
    expect(tables).toHaveLength(29);
    expect(new Set(tables).size).toBe(29);
    expect(tables).toEqual(expect.arrayContaining([
      'intelligence_tenancies', 'intelligence_reported_spaces', 'intelligence_observations',
      'intelligence_observation_subjects', 'intelligence_observation_temporal_assertions',
      'intelligence_evidence_locations', 'intelligence_observation_admission_decisions',
      'intelligence_derivation_methods', 'intelligence_rent_observations',
      'intelligence_lease_term_observations', 'intelligence_area_observations',
    ]));
  });

  it('locks the tagged union and temporal boundary representation', () => {
    expect(sql).toContain('num_nonnulls(entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id)=1');
    expect(sql).toContain("boundary in ('point','closed','open')");
    expect(sql).toContain("boundary='open' and precision='unknown'");
    expect(sql).toContain("both_effective_boundary_roles_required");
    expect(sql).toContain("lone_known_boundary_proves_exact_instant");
    expect(sql).not.toMatch(/coalesce\([^\n]*effective_(start|end)/i);
  });

  it('binds executable derivations to immutable canonical contract digests', () => {
    expect(sql).toContain('contract_sha256');
    expect(sql).not.toContain('implementation_sha256');
    expect(sql).toContain('4135a2f3be9e9ef1a71ab4890871f3b0acfd1063aa0028b412fc0646f5ffa3dc');
    expect(sql).toContain('4d76c6d8354c1c2cf4a42d33c36d8162fce0dd6b851235ccd3c2aa38673388fe');
    expect(sql).toContain('identity_level_unique_confirmed_property_contains_premises_dates_ignored');
    expect(sql).toContain('rent_supplied_exact_premises_or_reported_space');
    expect(sql).toContain("output_amount:=round(rent_amount*12/area_amount,8)");
    expect(sql.indexOf('output_amount:=round(rent_amount*12/area_amount,8)')).toBeLessThan(
      sql.indexOf("message='intelligence_derivation_output_magnitude_invalid'"),
    );
    expect(sql).toContain("amount*43560,'square_feet'");
    expect(sql).not.toMatch(/::(real|double precision)|float[48]/i);
  });

  it('keeps derivation semantics server-fixed and preserves exact projection rules', () => {
    expect(sql).toContain("method_key='annualized_rent_per_square_foot' and method_version=1");
    expect(sql).toContain("select output_id,subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=p_rent_observation_id");
    expect(sql).toContain("where observation_id=p_rent_observation_id");
    expect(sql).toContain("intelligence_derived_observation_provenance_invalid");
  });

  it('uses invoker functions, fixed empty search paths, RLS, and service-role-only authority', () => {
    expect(sql).not.toMatch(/security definer|create policy|disable row level security|execute\s+format\([^)]*%s/i);
    expect(sql).toMatch(/security invoker set search_path = ''/i);
    for (const table of tables) expect(sql).toContain(`'${table}'`);
    expect(sql).toContain('revoke all on function public.decide_intelligence_observation_admission(uuid,text,integer,uuid,text,text) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.derive_intelligence_annualized_rent_per_square_foot_v1(uuid,uuid,text) to service_role');
  });

  it('makes durable history restrictive and append-only', () => {
    expect(sql).toMatch(/references public\.intelligence_[a-z_]+\([^)]*\) on delete restrict/);
    expect(sql).not.toMatch(/on delete cascade|on delete set null/i);
    expect(sql).toContain('intelligence_history_append_only_v2');
    expect(sql).toContain('intelligence_admission_stale_revision');
    expect(sql).toContain('intelligence_admission_transition_invalid');
  });

  it('locks resolved premises, provenance, relationship, and direct-write authority', () => {
    expect(sql).toContain("r.relationship_type='contains' and r.relationship_status='confirmed'");
    expect(sql).not.toMatch(/valid_(from|to).*premises_property_resolution/i);
    expect(sql).toContain('intelligence_reported_space_property_mismatch');
    expect(sql).toContain('intelligence_admission_provenance_incomplete');
    expect(sql).toContain("relationship_type text not null check (relationship_type in ('contradicts','restates'))");
    expect(sql).not.toContain("'option_period'" );
    expect(sql).toContain('intelligence_derivation_fingerprint_invalid');
    expect(sql).toContain('intelligence_derivation_method_registry_locked');
    expect(sql).toContain('intelligence_admission_idempotency_conflict');
  });

  it('requires one strict spreadsheet position and protects helper functions', () => {
    expect(sql).toContain('num_nonnulls(cell_reference,range_reference,row_number)=1');
    expect(sql).toContain("cell_reference ~ '^[A-Z]+[1-9][0-9]*$'");
    expect(sql).toContain('revoke all on function public.intelligence_validate_observation_admission_v1(uuid) from public,anon,authenticated');
    expect(sql).toContain('intelligence_lease_instrument_cross_lease_invalid');
  });
});
