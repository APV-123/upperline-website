\set ON_ERROR_STOP on

insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email) values
 ('a0000000-0000-4000-8000-000000000001','Decision target','test@upperlineco.com','test@upperlineco.com'),
 ('a0000000-0000-4000-8000-000000000002','Other target','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,status,requested_by_email,created_at) values
 ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','pdf','review_ready','test@upperlineco.com','2026-08-24T00:00:00Z'),
 ('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','pdf','review_ready','test@upperlineco.com','2026-08-24T00:00:00Z');
insert into public.opportunity_source_artifacts
 (id,ingestion_id,artifact_kind,storage_bucket,storage_path,byte_size,sha256_digest,validation_status,created_by_email,created_at) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','pdf','private','current.pdf',10,repeat('a',64),'valid','test','2026-08-24T01:00:00Z'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','pdf','private','other.pdf',10,repeat('b',64),'valid','test','2026-08-24T01:00:00Z');
insert into public.opportunity_extraction_runs
 (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,status,extraction_strategy,extraction_version,schema_version,input_digest,created_by_email,completed_at) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',1,'current-1','running','provider','v1','v1',repeat('a',64),'test',null),
 ('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',2,'failed-2','running','provider','v1','v1',repeat('a',64),'test',null),
 ('a3000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002',1,'other-1','running','provider','v1','v1',repeat('b',64),'test',null);
insert into public.opportunity_candidate_facts
 (id,ingestion_id,artifact_id,extraction_run_id,destination_domain,field_path,assertion_basis,economic_role,
  normalized_value_type,normalized_value,unit,validation_state,ordinal,candidate_fingerprint) values
 ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','source','pricing.askingPrice','source_stated','descriptive_fact','decimal','"1250000"','USD','valid',0,repeat('c',64)),
 ('a4000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','source','document.title','source_stated','descriptive_fact','text','"failed"','NONE','valid',0,repeat('d',64)),
 ('a4000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000003','source','document.title','source_stated','descriptive_fact','text','"other"','NONE','valid',0,repeat('e',64)),
 ('a4000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','source','document.title','source_stated','descriptive_fact','text','"reject me"','NONE','valid',1,repeat('f',64)),
 ('a4000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','source','broker.email','source_stated','descriptive_fact','text','"race@example.com"','NONE','valid',2,repeat('1',64));

update public.opportunity_extraction_runs set status='succeeded',completed_at=now()
  where id in ('a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003');
update public.opportunity_extraction_runs set status='failed',completed_at=now()
  where id='a3000000-0000-4000-8000-000000000002';

do $$ declare r record; begin
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','approved',0,' Reviewer@UpperlineCo.com ');
  if not r.inserted or r.review_state <> 'approved' or r.decision_number <> 1 then raise exception 'first approval failed'; end if;
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','approved',0,'other@upperlineco.com');
  if r.inserted or r.decision_number <> 1 then raise exception 'approval replay was not idempotent'; end if;
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','rejected',1,'reviewer@upperlineco.com');
  if not r.inserted or r.review_state <> 'rejected' or r.decision_number <> 2 then raise exception 'approval to rejection failed'; end if;
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','rejected',1,'other@upperlineco.com');
  if r.inserted or r.decision_number <> 2 then raise exception 'rejection replay was not idempotent'; end if;
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','approved',2,'reviewer@upperlineco.com');
  if not r.inserted or r.decision_number <> 3 then raise exception 'rejection to approval failed'; end if;
end $$;

do $$ declare r record; begin
  select * into r from public.record_opportunity_candidate_fact_decision(
    'a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000004','rejected',0,'reviewer@upperlineco.com');
  if not r.inserted or r.review_state <> 'rejected' or r.decision_number <> 1 then raise exception 'first rejection failed'; end if;
end $$;

do $$ declare row public.opportunity_candidate_fact_decisions%rowtype; begin
  select * into row from public.opportunity_candidate_fact_decisions where candidate_fact_id='a4000000-0000-4000-8000-000000000001' and decision_number=1;
  if row.decision<>'accepted' or row.reviewer_email<>'reviewer@upperlineco.com' or row.accepted_value_type<>'decimal'
    or row.accepted_value<>'"1250000"'::jsonb or row.accepted_unit<>'USD' or row.selected_destination_domain<>'source'
    or row.selected_field_path<>'pricing.askingPrice' or row.conflict_disposition<>'deferred'
    or row.application_reference is not null then raise exception 'approved candidate authority not copied exactly'; end if;
  select * into row from public.opportunity_candidate_fact_decisions where candidate_fact_id='a4000000-0000-4000-8000-000000000001' and decision_number=2;
  if row.decision<>'rejected' or row.accepted_value_type is not null or row.accepted_value is not null or row.accepted_unit is not null then raise exception 'rejection carried accepted value'; end if;
  if (select count(*) from public.opportunity_candidate_fact_decisions where candidate_fact_id='a4000000-0000-4000-8000-000000000001')<>3 then raise exception 'history/replay count invalid'; end if;
end $$;

do $$ begin
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','rejected',1,'test@upperlineco.com'); raise exception 'expected'; exception when serialization_failure then if sqlerrm<>'candidate_decision_revision_conflict' then raise; end if; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','edited_and_accepted',3,'test@upperlineco.com'); raise exception 'expected'; exception when invalid_parameter_value then if sqlerrm<>'candidate_decision_invalid' then raise; end if; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',null,3,'test@upperlineco.com'); raise exception 'expected'; exception when invalid_parameter_value then if sqlerrm<>'candidate_decision_invalid' then raise; end if; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','approved',-1,'test@upperlineco.com'); raise exception 'expected'; exception when invalid_parameter_value then if sqlerrm<>'candidate_decision_revision_invalid' then raise; end if; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','ffffffff-ffff-4fff-8fff-ffffffffffff','approved',0,'test@upperlineco.com'); raise exception 'expected'; exception when no_data_found then if sqlerrm<>'candidate_not_currently_reviewable' then raise; end if; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002','approved',0,'test@upperlineco.com'); raise exception 'expected'; exception when no_data_found then null; end;
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003','approved',0,'test@upperlineco.com'); raise exception 'expected'; exception when no_data_found then null; end;
end $$;

set role authenticated;
do $$ begin
  begin perform public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','approved',3,'browser@test'); raise exception 'unexpected'; exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin
  if has_function_privilege('public','public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)','execute')
    or has_function_privilege('anon','public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)','execute')
    or has_function_privilege('authenticated','public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)','execute')
    or not has_function_privilege('service_role','public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)','execute')
    then raise exception 'candidate decision RPC privilege boundary invalid'; end if;
end $$;
