\set ON_ERROR_STOP on

-- Production-shape predecessor rows must exist before the retry migration.
insert into public.opportunity_ingestions(id,entry_type,requested_by_email)
select ('f1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'pdf','migration-test'
from generate_series(1,5) n;

select public.finalize_opportunity_verified_artifact(
  ('f1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  ('f2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'private','fixture.pdf','fixture.pdf','application/pdf','application/pdf',1,
  repeat(substr('abcde',n,1),64),1,'{}','migration-test')
from generate_series(1,5) n;

select public.allocate_opportunity_extraction_run(
  ('f1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  ('f2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  ('f3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'predecessor-'||n,'land-flyer','v1','provider','model','parser','prompt','schema',
  repeat(substr('abc',n,1),64),'migration-test')
from generate_series(1,3) n;

select public.fail_opportunity_extraction_run(
  'f1000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001','PROVIDER_FAILURE','Sanitized failure.','[]');
select public.complete_opportunity_extraction_run(
  'f1000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002',
  'f3000000-0000-4000-8000-000000000002','[]','[]');

-- Pending and cancelled are predecessor-schema statuses even though no V1 allocator creates them.
insert into public.opportunity_extraction_runs
  (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,status,extraction_strategy,
   extraction_version,provider,model,parser_version,prompt_version,schema_version,input_digest,
   started_at,completed_at,created_by_email)
values
  ('f3000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000004',
   'f2000000-0000-4000-8000-000000000004',1,'predecessor-4','pending','land-flyer','v1',
   'provider','model','parser','prompt','schema',repeat('d',64),null,null,'migration-test'),
  ('f3000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000005',
   'f2000000-0000-4000-8000-000000000005',1,'predecessor-5','cancelled','land-flyer','v1',
   'provider','model','parser','prompt','schema',repeat('e',64),'2026-08-23 00:00:00+00',
   '2026-08-23 00:01:00+00','migration-test');

create table public.retry_migration_predecessor_snapshot as
select id, to_jsonb(r) as original
from public.opportunity_extraction_runs r
where id::text like 'f3000000-0000-4000-8000-%';

do $$ begin
  if (select count(*) from public.retry_migration_predecessor_snapshot)<>5 then
    raise exception 'predecessor fixture incomplete';
  end if;
end $$;
