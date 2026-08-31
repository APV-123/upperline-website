import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const path='supabase/migrations/20260831000100_admit_rich_traffic_extraction_candidates_v2.sql';
const sql=readFileSync(path,'utf8');

describe('rich traffic V2 persistence migration',()=>{
  it('adds only the exact V2 family while retaining historical families',()=>{
    expect(sql).toContain("v_candidate->>'groupKey'='traffic_count:1'");
    expect(sql).toContain("v_candidate->>'groupKey'='traffic_count:2'");
    expect(sql).toContain("v_value->'schemaVersion'='1'::jsonb");
    expect(sql).toContain("v_value->'schemaVersion'='2'::jsonb");
    for(const key of ['sourceVolumeType','crossStreet','crossStreetOffset','sourceRelativeSubjectDistance'])expect(sql).toContain(key);
    expect(sql).not.toMatch(/alter default privileges/i);
    expect(sql).not.toMatch(/create table/i);
  });
  it('fails closed on required shape and preserves the function authority boundary',()=>{
    expect(sql).toContain("v_value ?& array['kind','schemaVersion','count','unit','basis','sourceVolumeType','roadway','crossStreet','crossStreetOffset','sourceRelativeSubjectDistance','measurementTime']");
    expect(sql).toMatch(/revoke execute on function public\.complete_opportunity_extraction_run[\s\S]*from public,anon,authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.complete_opportunity_extraction_run[\s\S]*to service_role/i);
    expect(sql).toContain("set search_path = ''");
  });
  it('has a stable reportable digest',()=>expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toMatch(/^[0-9a-f]{64}$/));
});
