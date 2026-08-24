\set ON_ERROR_STOP on

insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email)
values ('a0000000-0000-4000-8000-000000000001','Retry A','retry@upperlineco.com','retry@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,requested_by_email)
values ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','pdf','retry@upperlineco.com');
select * from public.finalize_opportunity_verified_artifact(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'private','retry/a.pdf','a.pdf','application/pdf','application/pdf',100,repeat('a',64),2,'{}','retry@upperlineco.com');

select * from public.allocate_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001','logical-a','land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');
select * from public.fail_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001','PROVIDER_FAILURE','Provider failed safely.','[]');

-- Ordinary replay recovers terminal attempt 1 and never allocates attempt 2.
select * from public.allocate_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000099','logical-a','land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');

-- Explicit command A allocates attempt 2; replay recovers it despite a different proposed run ID.
select * from public.allocate_opportunity_extraction_retry(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','logical-a','aa000000-0000-4000-8000-000000000001',
  'land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');
select * from public.allocate_opportunity_extraction_retry(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000098','logical-a','aa000000-0000-4000-8000-000000000001',
  'land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');

do $$ begin
  if (select count(*) from public.opportunity_extraction_runs where artifact_id='a2000000-0000-4000-8000-000000000001')<>2 then raise exception 'retry replay duplicated attempt'; end if;
  if (select status from public.opportunity_extraction_runs where id='a3000000-0000-4000-8000-000000000001')<>'failed' then raise exception 'attempt 1 changed'; end if;
  if (select retry_of_run_id from public.opportunity_extraction_runs where id='a3000000-0000-4000-8000-000000000002')<>'a3000000-0000-4000-8000-000000000001' then raise exception 'retry ancestry wrong'; end if;
  begin
    perform public.allocate_opportunity_extraction_retry(
      'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
      gen_random_uuid(),'logical-a',gen_random_uuid(),'land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');
    raise exception 'running retry accepted';
  exception when object_not_in_prerequisite_state then null; end;
end $$;

select * from public.fail_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','PROVIDER_FAILURE','Provider failed safely.','[]');

-- A distinct command after terminal attempt 2 allocates attempt 3.
select * from public.allocate_opportunity_extraction_retry(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000003','logical-a','aa000000-0000-4000-8000-000000000002',
  'land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');

select * from public.complete_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003',
  jsonb_build_array(jsonb_build_object(
    'id','a4000000-0000-4000-8000-000000000001','destinationDomain','opportunity','fieldPath','askingPrice',
    'assertionBasis','source_stated','economicRole','descriptive_fact','rawValue','"$100"'::jsonb,
    'normalizedValueType','decimal','normalizedValue','"100"'::jsonb,'unit','USD','confidence','0.9',
    'validationState','valid','validationIssues','[]'::jsonb,'ordinal',0,'fingerprint',repeat('b',64),
    'evidence',jsonb_build_array(jsonb_build_object('id','a5000000-0000-4000-8000-000000000001',
      'pageNumber',1,'snippet','Price $100','extractionMethod','provider_text','ordinal',0))
  )),'[]');

-- Successful command-B replay recovers attempt 3 and cannot invoke/persist again.
select * from public.allocate_opportunity_extraction_retry(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000097','logical-a','aa000000-0000-4000-8000-000000000002',
  'land-flyer','v1','openai','model','parser','prompt','schema',repeat('a',64),'retry@upperlineco.com');

do $$ begin
  if (select count(*) from public.opportunity_extraction_runs where artifact_id='a2000000-0000-4000-8000-000000000001')<>3 then raise exception 'attempt history wrong'; end if;
  if (select count(*) from public.opportunity_candidate_facts where extraction_run_id='a3000000-0000-4000-8000-000000000003')<>1 then raise exception 'candidate run scope wrong'; end if;
  if (select count(*) from public.opportunity_candidate_fact_evidence where extraction_run_id='a3000000-0000-4000-8000-000000000003')<>1 then raise exception 'evidence run scope wrong'; end if;
  begin update public.opportunity_extraction_runs set retry_command_id=gen_random_uuid() where id='a3000000-0000-4000-8000-000000000001'; raise exception 'attempt 1 mutable'; exception when others then if sqlerrm='attempt 1 mutable' then raise; end if; end;
  begin
    insert into public.opportunity_extraction_runs
      (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,logical_extraction_key,retry_command_id,retry_of_run_id,
       status,extraction_strategy,extraction_version,provider,model,parser_version,prompt_version,schema_version,input_digest,created_by_email)
    select gen_random_uuid(),ingestion_id,artifact_id,5,'invalid-parent',logical_extraction_key,gen_random_uuid(),
      'a3000000-0000-4000-8000-000000000001','running',extraction_strategy,extraction_version,provider,model,
      parser_version,prompt_version,schema_version,input_digest,created_by_email
    from public.opportunity_extraction_runs where id='a3000000-0000-4000-8000-000000000003';
    raise exception 'non-adjacent retry parent accepted';
  exception when check_violation then null; end;
end $$;

-- Globally reused retry identity cannot cross an ingestion/artifact boundary.
insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email)
values ('a0000000-0000-4000-8000-000000000002','Retry B','retry@upperlineco.com','retry@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,requested_by_email)
values ('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','pdf','retry@upperlineco.com');
select * from public.finalize_opportunity_verified_artifact(
  'a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002',
  'private','retry/b.pdf','b.pdf','application/pdf','application/pdf',100,repeat('c',64),2,'{}','retry@upperlineco.com');
select * from public.allocate_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002',
  'a3000000-0000-4000-8000-000000000010','logical-b','land-flyer','v1','openai','model','parser','prompt','schema',repeat('c',64),'retry@upperlineco.com');
select * from public.fail_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002',
  'a3000000-0000-4000-8000-000000000010','PROVIDER_FAILURE','Provider failed safely.','[]');
do $$ begin
  begin
    perform public.allocate_opportunity_extraction_retry(
      'a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002',gen_random_uuid(),
      'logical-b','aa000000-0000-4000-8000-000000000001','land-flyer','v1','openai','model','parser','prompt','schema',repeat('c',64),'retry@upperlineco.com');
    raise exception 'cross-artifact retry identity accepted';
  exception when invalid_parameter_value then null; end;
end $$;

set role authenticated;
do $$ begin
  begin perform public.allocate_opportunity_extraction_retry(null,null,null,null,null,null,null,null,null,null,null,null,null,null); raise exception 'browser retry allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
