import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260830000100_admit_rich_traffic_extraction_candidates.sql'), 'utf8');

describe('rich traffic extraction persistence migration', () => {
  it('replaces only the existing completion boundary with fixed security posture', () => {
    expect(sql).toMatch(/create or replace function public\.complete_opportunity_extraction_run\(/i);
    expect(sql).toMatch(/language plpgsql set search_path = ''/i);
    expect(sql).not.toMatch(/security\s+definer|execute\s+format|dynamic sql/i);
    expect(sql).toMatch(/revoke execute on function public\.complete_opportunity_extraction_run[\s\S]+from public,anon,authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.complete_opportunity_extraction_run[\s\S]+to service_role/i);
    expect(sql).not.toMatch(/grant\s+.+\s+on\s+table|alter\s+default\s+privileges|disable\s+row\s+level\s+security/i);
  });

  it('preserves scalar traffic and admits only the versioned rich family', () => {
    expect(sql).toContain("v_candidate->>'normalizedValueType'='integer'");
    expect(sql).toContain("v_candidate->>'normalizedValueType'='json'");
    expect(sql).toContain("v_candidate->>'groupKey'='traffic_count:1'");
    expect(sql).toContain("v_value->>'kind'='traffic_count'");
    expect(sql).toContain("v_value->'schemaVersion'='1'::jsonb");
    expect(sql).toContain("v_value->>'unit'='vehicles_per_day'");
    expect(sql).toContain("v_candidate->>'unit'='VEHICLES_PER_DAY'");
  });

  it('requires the complete durable proposition structure and rejects generic JSON admission', () => {
    for (const key of ['kind', 'schemaVersion', 'count', 'unit', 'basis', 'roadway',
      'countLocation', 'direction', 'measurementTime']) expect(sql).toContain(`'${key}'`);
    expect(sql).toContain("v_basis->>'normalized' in ('VPD','ADT','AADT','unknown')");
    expect(sql).toContain("v_time->>'role'='measurement'");
    expect(sql).toContain("v_time->>'precision' in ('year','month','day','unknown')");
    expect(sql).not.toMatch(/normalizedValueType'='json'[\s\S]{0,100}then/i);
  });

  it('does not modify downstream authority or historical migrations', () => {
    expect(sql).not.toMatch(/intelligence_observation|admission|derivation|candidate_fact_decisions/i);
    expect(sql).not.toMatch(/(insert into|update|delete from) public\.(acquisition_opportunities|opportunity_sources|opportunity_underwriting_versions|deals)/i);
  });
});
