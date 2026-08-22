import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260822000200_create_opportunity_ingestion_transaction_rpcs.sql'), 'utf8');

describe('ingestion transaction migration contract', () => {
  it('adds array diagnostics without changing Phase 4A.1 objects', () => {
    expect(sql).toMatch(/add column diagnostics jsonb not null default '\[\]'::jsonb/i);
    expect(sql).toMatch(/jsonb_typeof\(diagnostics\) = 'array'/i);
    expect(sql).not.toMatch(/drop\s+(table|trigger|function)|disable\s+trigger/i);
  });

  it('defines exactly the four narrow transaction functions', () => {
    expect([...sql.matchAll(/create function public\.(\w+)/gi)].map(x => x[1])).toEqual([
      'finalize_opportunity_verified_artifact', 'allocate_opportunity_extraction_run',
      'complete_opportunity_extraction_run', 'fail_opportunity_extraction_run',
    ]);
    expect(sql).not.toMatch(/security\s+definer|execute\s+format|dynamic sql/i);
    expect(sql.match(/set search_path = ''/gi)).toHaveLength(4);
  });

  it('keeps RPCs server-only and authoritative tables untouched', () => {
    expect(sql.match(/from public,anon,authenticated/gi)).toHaveLength(4);
    expect(sql.match(/to service_role/gi)).toHaveLength(4);
    expect(sql).not.toMatch(/(insert into|update|delete from) public\.(acquisition_opportunities|opportunity_sources|opportunity_underwriting_versions|opportunity_field_provenance|deals)/i);
  });

  it('enforces lifecycle locks, allowlisted destinations, and atomic nested writes', () => {
    expect(sql.match(/for update/gi)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(sql).toContain('candidate_destination_not_allowed');
    expect(sql).toMatch(/jsonb_array_elements\(p_candidates\)/);
    expect(sql).toMatch(/jsonb_array_elements\(coalesce\(v_candidate->'evidence'/);
    expect(sql).toContain("status='succeeded'");
    expect(sql).toContain("status='failed'");
  });
});
