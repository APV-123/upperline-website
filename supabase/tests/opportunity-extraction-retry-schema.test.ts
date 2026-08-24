import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260823000300_add_extraction_retry_semantics.sql'), 'utf8');

describe('explicit extraction retry migration contract', () => {
  it('limits the migration-only trigger exception to the deterministic identity backfill', () => {
    expect(sql).toMatch(/disable trigger opportunity_extraction_runs_protect[\s\S]*disable trigger opportunity_extraction_runs_set_updated_at/i);
    expect(sql).toMatch(/update public\.opportunity_extraction_runs\s+set logical_extraction_key = run_idempotency_key/i);
    expect(sql).toMatch(/enable trigger opportunity_extraction_runs_protect[\s\S]*enable trigger opportunity_extraction_runs_set_updated_at/i);
    expect(sql.indexOf('disable trigger')).toBeLessThan(sql.indexOf('set logical_extraction_key = run_idempotency_key'));
    expect(sql.indexOf('set logical_extraction_key = run_idempotency_key')).toBeLessThan(sql.indexOf('enable trigger'));
    expect(sql).not.toMatch(/session_replication_role|current_setting|set_config|security\s+definer/i);
  });

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
    expect(sql).toMatch(/pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(p_retry_command_id::text,0\)\)/i);
    expect(sql.indexOf('where retry_command_id=p_retry_command_id for update')).toBeLessThan(
      sql.lastIndexOf('where id=p_ingestion_id for update'),
    );
    expect(sql).not.toMatch(/p_attempt_number|p_provider_override|p_model_override/i);
    expect(sql).toMatch(/from public,anon,authenticated/i);
    expect(sql).toMatch(/to service_role/i);
    expect(sql).not.toMatch(/security\s+definer|execute\s+format|dynamic sql/i);
  });

  it('does not mutate authoritative Opportunity, source, underwriting, provenance, or Deal tables', () => {
    expect(sql).not.toMatch(/(insert into|update|delete from) public\.(acquisition_opportunities|opportunity_sources|opportunity_underwriting_versions|opportunity_field_provenance|deals)/i);
    expect(sql.match(/disable\s+trigger/gi)).toHaveLength(2);
    expect(sql.match(/enable\s+trigger/gi)).toHaveLength(2);
    expect(sql).not.toMatch(/drop\s+(table|function|trigger)/i);
  });
});
