import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseExtractionReviewRepository } from './supabase-extraction-review-repository';
function fakeClient(results: Array<{ data: unknown; error: unknown }>) {
  const calls: Array<{ table: string; eq: Array<[string, unknown]> }> = [];
  const from = vi.fn((table: string) => { const result = results.shift() ?? { data: null, error: null };
    const call = { table, eq: [] as Array<[string, unknown]> }; calls.push(call);
    const chain: Record<string, unknown> = {}; for (const method of ['select','order','limit','in']) chain[method] = vi.fn(() => chain);
    chain.eq = vi.fn((key: string, value: unknown) => { call.eq.push([key, value]); return chain; });
    chain.maybeSingle = vi.fn(async () => result); chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain; }); return { client: { from } as unknown as SupabaseClient, calls };
}
describe('Supabase extraction review repository', () => {
  it('derives the latest succeeded run and scopes all child reads to Opportunity-owned identities', async () => {
    const fake = fakeClient([{ data:{id:'opp'},error:null },{data:[{id:'new-unverified'},{id:'ing'}],error:null},{data:{id:'art',ingestion_id:'ing'},error:null},
      {data:{id:'run-8',attempt_number:8,completed_at:'2026-08-24T00:00:00Z'},error:null},
      {data:[{id:'c1',field_path:'land.areaSf',normalized_value_type:'decimal',normalized_value:'1000',unit:'SF',assertion_basis:'source_stated',confidence:null,validation_state:'valid',validation_issues:[],ordinal:0,candidate_fingerprint:'a'.repeat(64)}],error:null},
      {data:[{candidate_fact_id:'c1',page_number:3,snippet:'safe',bounding_box:null,section_label:null,extraction_method:'provider',extraction_version:'v1',ordinal:0}],error:null},
      {data:[],error:null}]);
    const review = await new SupabaseExtractionReviewRepository(fake.client).getLatestReview('opp');
    expect(review).toMatchObject({ attemptNumber:8,factCount:1,unreviewedCount:1,approvedCount:0,rejectedCount:0 });
    expect(fake.calls.find(call => call.table === 'opportunity_extraction_runs')?.eq).toEqual(expect.arrayContaining([
      ['ingestion_id','ing'],['artifact_id','art'],['status','succeeded']]));
    for (const table of ['opportunity_candidate_facts','opportunity_candidate_fact_evidence']) {
      expect(fake.calls.find(call => call.table === table)?.eq).toEqual(expect.arrayContaining([
        ['ingestion_id','ing'],['artifact_id','art'],['extraction_run_id','run-8']]));
    }
  });
  it('recovers the complete rich proposition and durable family/version group key', async () => {
    const proposition = {kind:'traffic_count',schemaVersion:1,count:31942,unit:'vehicles_per_day',basis:{normalized:'VPD',sourceLiteral:'VPD'},roadway:{sourceLiteral:'Mason Road'},countLocation:null,direction:null,measurementTime:{role:'measurement',precision:'year',year:2025,month:null,day:null}};
    const fake = fakeClient([{data:{id:'opp'},error:null},{data:[{id:'ing'}],error:null},{data:{id:'art',ingestion_id:'ing'},error:null},
      {data:{id:'run',attempt_number:1,completed_at:null},error:null},{data:[{id:'c1',field_path:'traffic.vehiclesPerDay',normalized_value_type:'json',normalized_value:proposition,unit:'VEHICLES_PER_DAY',group_key:'traffic_count:1',assertion_basis:'source_stated',confidence:null,validation_state:'valid',validation_issues:[],ordinal:0,candidate_fingerprint:'a'.repeat(64)}],error:null},
      {data:[{candidate_fact_id:'c1',page_number:2,snippet:'31,942 VPD — Mason Road — 2025',bounding_box:null,section_label:null,extraction_method:'provider_text',extraction_version:'rich-v1',ordinal:0}],error:null},{data:[],error:null}]);
    const review = await new SupabaseExtractionReviewRepository(fake.client).getLatestReview('opp');
    expect(review?.groups[0].items[0]).toMatchObject({value:proposition,groupKey:'traffic_count:1',cardinality:'set',formattedValue:'31,942 VPD · Roadway: Mason Road · Measurement: 2025 · Location: Not reported · Direction: Not reported'});
  });
  it('selects the highest numbered decision for each current candidate', async () => {
    const fake = fakeClient([{ data:{id:'opp'},error:null },{data:[{id:'ing'}],error:null},{data:{id:'art',ingestion_id:'ing'},error:null},
      {data:{id:'run',attempt_number:8,completed_at:null},error:null},{data:[{id:'c1',field_path:'land.areaSf',normalized_value_type:'decimal',normalized_value:'1000',unit:'SF',assertion_basis:'source_stated',confidence:null,validation_state:'valid',validation_issues:[],ordinal:0,candidate_fingerprint:'a'.repeat(64)}],error:null},
      {data:[],error:null},{data:[{candidate_fact_id:'c1',decision_number:1,decision:'accepted',decided_at:'2026-08-24T00:00:00Z'},{candidate_fact_id:'c1',decision_number:2,decision:'rejected',decided_at:'2026-08-25T00:00:00Z'}],error:null}]);
    const review = await new SupabaseExtractionReviewRepository(fake.client).getLatestReview('opp');
    expect(review?.groups[0].items[0]).toMatchObject({ humanReviewStatus:'rejected',decisionNumber:2,decidedAt:'2026-08-25T00:00:00Z' });
    expect(review).toMatchObject({ unreviewedCount:0,approvedCount:0,rejectedCount:1 });
  });
  it('returns an empty state when no successful run exists and never reads failed partial candidates', async () => {
    const fake = fakeClient([{data:{id:'opp'},error:null},{data:[{id:'ing'}],error:null},{data:{id:'art',ingestion_id:'ing'},error:null},{data:null,error:null}]);
    await expect(new SupabaseExtractionReviewRepository(fake.client).getLatestReview('opp')).resolves.toBeNull();
    expect(fake.calls.some(call => call.table === 'opportunity_candidate_facts')).toBe(false);
  });
  it('supports a succeeded run with zero candidates', async () => {
    const fake = fakeClient([{data:{id:'opp'},error:null},{data:[{id:'ing'}],error:null},{data:{id:'art',ingestion_id:'ing'},error:null},
      {data:{id:'run',attempt_number:1,completed_at:null},error:null},{data:[],error:null}]);
    await expect(new SupabaseExtractionReviewRepository(fake.client).getLatestReview('opp')).resolves.toMatchObject({ factCount:0,missingDestinationCount:31 });
  });
});
