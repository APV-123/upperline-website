import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260827000100_create_property_intelligence_provenance_resolution.sql'), 'utf8');
const tables = [
  'intelligence_provenance_commands',
  'intelligence_provenance_resolution_proposals',
  'intelligence_source_resolution_proposals',
  'intelligence_edition_resolution_proposals',
  'intelligence_representation_resolution_proposals',
  'intelligence_upstream_attribution_proposals',
  'intelligence_upstream_attribution_evidence',
  'intelligence_provenance_resolution_decisions',
] as const;

describe('Phase 4C.3.2B.1 migration contract', () => {
  it('creates exactly the approved eight durable tables', () => {
    const created = [...migration.matchAll(/create table public\.(intelligence_[a-z_]+)/g)].map(match => match[1]);
    expect(created).toEqual(tables);
  });

  it.each(tables)('keeps %s private and service-role-only', table => {
    expect(migration).toContain(`alter table public.%I enable row level security`);
    expect(migration).toContain(`revoke all on table public.%I from public,anon,authenticated`);
    expect(migration).toContain(`grant select,insert on table public.%I to service_role`);
    expect(migration).toContain(`'${table}'`);
  });

  it('derives authority and readiness without mutable current-state tables', () => {
    expect(migration).toContain('intelligence_provenance_current_state_v1');
    expect(migration).toContain('intelligence_provenance_readiness_v1');
    expect(migration).not.toMatch(/create table public\.[a-z_]*(?:readiness|current_authority)/);
  });

  it('uses fixed empty search paths and invoker security', () => {
    const functions = [...migration.matchAll(/create function public\./g)].length;
    expect(migration.match(/security invoker set search_path=''/g)).toHaveLength(functions);
    expect(migration).not.toContain('security definer');
  });

  it('locks canonical fingerprint and command digest authority in PostgreSQL', () => {
    expect(migration).toContain('intelligence_provenance_payload_canonical_v1');
    expect(migration).toContain("extensions.digest(convert_to(public.intelligence_provenance_payload_canonical_v1(p.id),'UTF8'),'sha256')");
    expect(migration).toContain("extensions.digest(convert_to(new.canonical_request,'UTF8'),'sha256')");
  });

  it('serializes evidence with proposal finalization and revalidates the fingerprint', () => {
    expect(migration).toContain('where id=new.proposal_id\n  for update');
    expect(migration).toContain('intelligence_upstream_evidence_proposal_finalized');
    expect(migration).toContain('create constraint trigger intelligence_upstream_evidence_fingerprint_validate');
    expect(migration).toContain('deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1()');
  });

  it('contains no persisted dynamic SQL outside identifier-safe migration DDL', () => {
    const executeOccurrences = [...migration.matchAll(/execute format\(/g)].length;
    expect(executeOccurrences).toBe(4);
    expect(migration).not.toMatch(/execute\s+(?:new\.|[a-z_]+\s*\|\|)/i);
  });

  it('has stable golden canonical SHA-256 fixtures', () => {
    const fixtures = [
      ['source_identity|select_existing|10000000-0000-4000-8000-000000000001|null|4d61736f6e20464c796572|offering_memorandum|null|matching_evidence|true|false|true|true|false', '6d1cea7d5dcb3bb87520977092509c439b3d1764c14e173e86b0dd6fa058d6a8'],
      ['source_edition|20000000-0000-4000-8000-000000000001|create_new|null|32303236204d61736f6e|month|2026|3|null|human_confirmed', 'b1fa4db309af6b3c6fe9633986d56237418d80f63cf50fbd8909cf3f8c84deb0'],
      ['artifact_representation|30000000-0000-4000-8000-000000000001|40000000-0000-4000-8000-000000000001|primary|true|same_bytes|database_derived', 'c86c340325fe3d1bb8504a10cdcfa470f5d1a42f39f84f887de08a540d55fdd3'],
      ['upstream_attribution|30000000-0000-4000-8000-000000000001|no_upstream_required|null|null|null|null|null|68756d616e207265766965776564|null', 'cedb0f09d7827ed7ca829b1e01b901c3a5efae1f9e32d46322b5fa0c2204ae06'],
    ] as const;
    for (const [canonical, digest] of fixtures) {
      expect(createHash('sha256').update(canonical, 'utf8').digest('hex')).toBe(digest);
    }
  });
});
