import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260824000100_create_candidate_decision_rpc.sql'), 'utf8');

describe('candidate decision RPC migration contract', () => {
  it('defines one narrow fixed-search-path invoker RPC', () => {
    expect([...sql.matchAll(/create function public\.(\w+)/gi)].map(x => x[1]))
      .toEqual(['record_opportunity_candidate_fact_decision']);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).not.toMatch(/security definer|execute\s+format|dynamic sql/i);
    expect(sql).toContain("set search_path = ''");
  });

  it('accepts only intent, optimistic state, candidate, Opportunity, and trusted reviewer', () => {
    const signature = sql.slice(sql.indexOf('create function'), sql.indexOf('returns table'));
    expect(signature).toMatch(/p_opportunity_id uuid/);
    expect(signature).toMatch(/p_candidate_fact_id uuid/);
    expect(signature).toMatch(/p_decision text/);
    expect(signature).toMatch(/p_expected_decision_number integer/);
    expect(signature).toMatch(/p_reviewer_email text/);
    expect(signature).not.toMatch(/p_(ingestion|artifact|run|destination|field|tenant|value|unit|fingerprint|evidence|application|conflict)/i);
  });

  it('derives the exact current review scope and serializes on the candidate row', () => {
    expect(sql).toMatch(/ingestion\.opportunity_id = p_opportunity_id/);
    expect(sql).toMatch(/ingestion\.entry_type = 'pdf'/);
    expect(sql).toMatch(/artifact\.validation_status = 'valid'/);
    expect(sql).toMatch(/order by artifact\.created_at desc\s+limit 1/i);
    expect(sql).toMatch(/run\.status = 'succeeded'/);
    expect(sql).toMatch(/order by run\.attempt_number desc\s+limit 1/i);
    expect(sql).toMatch(/candidate\.ingestion_id = v_ingestion_id/);
    expect(sql).toMatch(/candidate\.artifact_id = v_artifact_id/);
    expect(sql).toMatch(/candidate\.extraction_run_id = v_run_id/);
    expect(sql).toMatch(/from public\.opportunity_candidate_facts candidate[\s\S]*for update/i);
  });

  it('implements append-only replay and optimistic reversal semantics', () => {
    expect(sql).toContain("p_decision is null or p_decision not in ('approved', 'rejected')");
    expect(sql).toContain("when 'edited_and_accepted' then 'approved'");
    expect(sql).toMatch(/if v_current_state = p_decision[\s\S]*v_current\.decided_at, false/i);
    expect(sql).toMatch(/p_expected_decision_number <> v_current_number/);
    expect(sql).toContain('candidate_decision_revision_conflict');
    expect(sql).toMatch(/v_current_number \+ 1/);
    expect(sql).not.toMatch(/update public\.opportunity_candidate_fact_decisions|delete from public\.opportunity_candidate_fact_decisions/i);
  });

  it('copies authority from the candidate and keeps application state absent', () => {
    expect(sql).toMatch(/v_candidate\.normalized_value_type/);
    expect(sql).toMatch(/v_candidate\.normalized_value/);
    expect(sql).toMatch(/v_candidate\.unit/);
    expect(sql).toMatch(/v_candidate\.destination_domain/);
    expect(sql).toMatch(/v_candidate\.field_path/);
    expect(sql).toMatch(/v_candidate\.candidate_tenant_key/);
    expect(sql).toMatch(/'deferred', null, '\{\}'::jsonb/);
    expect(sql.match(/edited_and_accepted/g)).toHaveLength(1);
    expect(sql).not.toMatch(/p_decision[^\n]*edited_and_accepted|v_database_decision[^\n]*edited_and_accepted/);
  });

  it('is service-role-only and returns no candidate/provider authority', () => {
    expect(sql).toMatch(/from public, anon, authenticated/);
    expect(sql).toMatch(/to service_role/);
    const returned = sql.slice(sql.indexOf('returns table'), sql.indexOf('language plpgsql'));
    expect(returned).toMatch(/candidate_fact_id uuid/);
    expect(returned).toMatch(/review_state text/);
    expect(returned).toMatch(/decision_number integer/);
    expect(returned).toMatch(/decided_at timestamptz/);
    expect(returned).toMatch(/inserted boolean/);
    expect(returned).not.toMatch(/value|evidence|reviewer|fingerprint|artifact|run_id|ingestion/i);
  });
});
