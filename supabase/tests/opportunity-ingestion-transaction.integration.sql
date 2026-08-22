\set ON_ERROR_STOP on

insert into public.opportunity_ingestions(id,entry_type,requested_by_email)
values ('91000000-0000-4000-8000-000000000001','pdf','test@upperlineco.com');

select * from public.finalize_opportunity_verified_artifact(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  'private','ingestions/a.pdf','a.pdf','application/pdf','application/pdf',100,repeat('a',64),2,'{}','test@upperlineco.com');
select * from public.finalize_opportunity_verified_artifact(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  'private','ingestions/a.pdf','a.pdf','application/pdf','application/pdf',100,repeat('a',64),2,'{}','test@upperlineco.com');

select * from public.allocate_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001','run-1','pdf-text','1','provider','model','parser-1','prompt-1','vocab-1',repeat('a',64),'test@upperlineco.com');
select * from public.allocate_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000099','run-1','pdf-text','1','provider','model','parser-1','prompt-1','vocab-1',repeat('a',64),'test@upperlineco.com');

select * from public.complete_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'id','94000000-0000-4000-8000-000000000001','destinationDomain','opportunity','fieldPath','askingPrice',
    'assertionBasis','source_stated','economicRole','descriptive_fact','rawValue','"$1,000"'::jsonb,
    'normalizedValueType','decimal','normalizedValue','"1000"'::jsonb,'unit','USD','confidence','0.9',
    'validationState','valid','validationIssues','[]'::jsonb,'ordinal',0,'fingerprint',repeat('b',64),
    'evidence',jsonb_build_array(jsonb_build_object('id','95000000-0000-4000-8000-000000000001',
      'pageNumber',1,'snippet','Asking price $1,000','extractionMethod','pdf-text','ordinal',0))
  )), '[{"code":"PARTIAL_TEXT","severity":"warning"}]');

do $$ begin
  if (select status from public.opportunity_ingestions where id='91000000-0000-4000-8000-000000000001')<>'review_ready' then raise exception 'completion state failed'; end if;
  if (select count(*) from public.opportunity_candidate_facts where extraction_run_id='93000000-0000-4000-8000-000000000001')<>1 then raise exception 'candidate missing'; end if;
  if (select count(*) from public.opportunity_candidate_fact_evidence where extraction_run_id='93000000-0000-4000-8000-000000000001')<>1 then raise exception 'evidence missing'; end if;
  if jsonb_array_length((select diagnostics from public.opportunity_extraction_runs where id='93000000-0000-4000-8000-000000000001'))<>1 then raise exception 'diagnostics missing'; end if;
end $$;

select * from public.allocate_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002','run-2','pdf-text','1','provider','model','parser-1','prompt-1','vocab-1',repeat('a',64),'test@upperlineco.com');
select * from public.fail_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002',
  'PDF_MALFORMED','The PDF could not be parsed.','[]');
select * from public.fail_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002',
  'PDF_MALFORMED','The PDF could not be parsed.','[]');

do $$ begin
  begin perform public.complete_opportunity_extraction_run('91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','[]','[]'); raise exception 'terminal retry allowed'; exception when object_not_in_prerequisite_state then null; end;
  begin perform public.finalize_opportunity_verified_artifact('91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','private','different.pdf','a.pdf','application/pdf','application/pdf',100,repeat('a',64),2,'{}','test'); raise exception 'conflicting replay allowed'; exception when invalid_parameter_value then null; end;
end $$;

set role authenticated;
do $$ begin
  begin perform public.complete_opportunity_extraction_run(null,null,null,'[]','[]'); raise exception 'browser execute allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select * from public.allocate_opportunity_extraction_run(
  '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000003','run-3','pdf-text','1','provider','model','parser-1','prompt-1','vocab-1',repeat('a',64),'test@upperlineco.com');
do $$ begin
  begin
    perform public.complete_opportunity_extraction_run(
      '91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003',
      jsonb_build_array(
        jsonb_build_object('id','94000000-0000-4000-8000-000000000010','destinationDomain','opportunity','fieldPath','name','assertionBasis','source_stated','economicRole','descriptive_fact','normalizedValueType','text','normalizedValue','"Valid"'::jsonb,'validationState','valid','validationIssues','[]'::jsonb,'ordinal',0,'fingerprint',repeat('1',64),'evidence','[]'::jsonb),
        jsonb_build_object('id','94000000-0000-4000-8000-000000000011','destinationDomain','opportunity','fieldPath','arbitrary.column','assertionBasis','source_stated','economicRole','descriptive_fact','normalizedValueType','text','normalizedValue','"Invalid"'::jsonb,'validationState','valid','validationIssues','[]'::jsonb,'ordinal',1,'fingerprint',repeat('2',64),'evidence','[]'::jsonb)
      ),'[]');
    raise exception 'invalid nested candidate was accepted';
  exception when invalid_parameter_value then null;
  end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id='93000000-0000-4000-8000-000000000003') then raise exception 'nested rollback failed'; end if;
  if (select status from public.opportunity_extraction_runs where id='93000000-0000-4000-8000-000000000003')<>'running' then raise exception 'run changed after rollback'; end if;
end $$;
