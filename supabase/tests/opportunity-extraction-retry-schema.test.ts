import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260823000300_add_extraction_retry_semantics.sql'), 'utf8');

describe('explicit extraction retry migration contract', () => {
  it('models logical identity, retry command identity, and immutable retry ancestry separately', () => {
    expect(sql).toMatch(/add column logical_extraction_key text/i);
    expect(sql).toMatch(/add column retry_command_id uuid/i);
    expect(sql).toMatch(/add column retry_of_run_id uuid/i);
    expect(sql).toMatch(/foreign key \(retry_of_run_id, ingestion_id, artifact_id, logical_extraction_key\)/i);
    expect(sql).toMatch(/unique index opportunity_extraction_runs_retry_command_key/i);
    expect(sql).toMatch(/unique \(artifact_id, logical_extraction_key, attempt_number\)/i);
    expect(sql).toMatch(/extraction_retry_parent_invalid/i);
    expect(sql).toMatch(/v_parent\.attempt_number\+1<>new\.attempt_number/i);
  });

  it('keeps ordinary allocation stable and adds one service-role-only retry RPC', () => {
    expect(sql).toMatch(/create or replace function public\.allocate_opportunity_extraction_run/i);
    expect(sql).toMatch(/create function public\.allocate_opportunity_extraction_retry/i);
    expect(sql).toMatch(/retry_command_conflict/);
    expect(sql).toMatch(/extraction_retry_requires_failed_run/);
    expect(sql).toMatch(/extraction_retry_running/);
    expect(sql).not.toMatch(/p_attempt_number|p_provider_override|p_model_override/i);
    expect(sql).toMatch(/from public,anon,authenticated/i);
    expect(sql).toMatch(/to service_role/i);
    expect(sql).not.toMatch(/security\s+definer|execute\s+format|dynamic sql/i);
  });

  it('does not mutate authoritative Opportunity, source, underwriting, provenance, or Deal tables', () => {
    expect(sql).not.toMatch(/(insert into|update|delete from) public\.(acquisition_opportunities|opportunity_sources|opportunity_underwriting_versions|opportunity_field_provenance|deals)/i);
    expect(sql).not.toMatch(/disable\s+trigger|drop\s+(table|function|trigger)/i);
  });
});
