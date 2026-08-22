\set ON_ERROR_STOP on

insert into public.opportunity_ingestions
  (id,entry_type,status,idempotency_key,requested_by_email) values
  ('81000000-0000-4000-8000-000000000001','pdf','awaiting_source','pre-op','test@upperlineco.com');
insert into public.acquisition_opportunities
  (id,name,created_by_email,updated_by_email) values
  ('80000000-0000-4000-8000-000000000001','Ingestion target','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_ingestions
  (id,opportunity_id,entry_type,status,requested_by_email) values
  ('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001','pdf','ready','test@upperlineco.com');
update public.opportunity_ingestions set status='extracting',revision=2 where id='81000000-0000-4000-8000-000000000002';

insert into public.opportunity_source_artifacts
  (id,ingestion_id,artifact_kind,storage_bucket,storage_path,byte_size,sha256_digest,validation_status,created_by_email)
values ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','pdf','private','a.pdf',100,
  repeat('a',64),'valid','test@upperlineco.com');

insert into public.opportunity_extraction_runs
  (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,status,extraction_strategy,extraction_version,schema_version,input_digest,created_by_email)
values ('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',1,
  'initial-v1','running','hybrid','v1','candidate-v1',repeat('b',64),'test@upperlineco.com');
insert into public.opportunity_candidate_facts
  (id,ingestion_id,artifact_id,extraction_run_id,destination_domain,field_path,candidate_tenant_key,assertion_basis,economic_role,
   raw_value,normalized_value_type,normalized_value,unit,confidence,validation_state,ordinal,candidate_fingerprint)
values
  ('84000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','opportunity','askingPrice',null,'source_stated','descriptive_fact','"$1,250,000"','decimal','"1250000"','USD',1,'valid',0,repeat('c',64)),
  ('84000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','underwriting','exit.exitCapRate',null,'source_stated','source_assumption','"7%"','decimal','"0.07"','PERCENT_DECIMAL',0.8,'valid',1,repeat('d',64)),
  ('84000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','tenant','rentalRatePerSfYear','99000000-0000-4000-8000-000000000001','source_stated','contractual_fact','"24"','decimal','"24"','USD_PER_SF_YEAR',0,'valid',2,repeat('e',64));

insert into public.opportunity_candidate_fact_evidence
  (candidate_fact_id,extraction_run_id,artifact_id,ingestion_id,page_number,snippet,extraction_method,ordinal)
values
  ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001',3,'Asking price','text',0),
  ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001',4,'Pricing summary','text',1);

insert into public.opportunity_candidate_fact_decisions
  (candidate_fact_id,decision_number,decision,reviewer_email,accepted_value_type,accepted_value,accepted_unit,
   selected_destination_domain,selected_field_path,selected_candidate_tenant_key,conflict_disposition)
values
  ('84000000-0000-4000-8000-000000000001',1,'accepted','reviewer@upperlineco.com','decimal','"1250000"','USD','opportunity','askingPrice',null,'no_conflict'),
  ('84000000-0000-4000-8000-000000000002',1,'rejected','reviewer@upperlineco.com',null,null,null,'underwriting','exit.exitCapRate',null,'kept_existing'),
  ('84000000-0000-4000-8000-000000000003',1,'edited_and_accepted','reviewer@upperlineco.com','decimal','"25"','USD_PER_SF_YEAR','tenant','rentalRatePerSfYear','99000000-0000-4000-8000-000000000001','replaced_existing');

do $$ declare rejected_constraint text; begin
  begin
    insert into public.opportunity_candidate_facts
      (ingestion_id,artifact_id,extraction_run_id,destination_domain,field_path,assertion_basis,economic_role,
       normalized_value_type,normalized_value,confidence,validation_state,ordinal,candidate_fingerprint)
    values
      ('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',
       'opportunity','bad','source_stated','descriptive_fact','decimal','"01.2"',1,'valid',9,repeat('f',64));
    raise exception 'expected failure';
  exception when check_violation then
    get stacked diagnostics rejected_constraint = constraint_name;
    if rejected_constraint <> 'opportunity_candidate_facts_value_check' then
      raise exception 'unexpected candidate constraint: %', rejected_constraint;
    end if;
  end;
  if exists (select 1 from public.opportunity_candidate_facts where candidate_fingerprint=repeat('f',64)) then
    raise exception 'invalid candidate persisted';
  end if;
end $$;

update public.opportunity_extraction_runs set status='succeeded',started_at=now(),completed_at=now()
  where id='83000000-0000-4000-8000-000000000001';

insert into public.opportunity_sources(id,opportunity_id,source_type,created_by_email,updated_by_email) values
  ('85000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','document','test','test');
insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email) values
  ('80000000-0000-4000-8000-000000000002','Other target','test','test');
insert into public.opportunity_sources(id,opportunity_id,source_type,created_by_email,updated_by_email) values
  ('85000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000002','document','test','test');
insert into public.opportunity_source_artifacts
  (id,ingestion_id,artifact_kind,storage_bucket,storage_path,byte_size,sha256_digest,created_by_email)
values ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002','pdf','private','attach.pdf',2,repeat('7',64),'test');
update public.opportunity_source_artifacts set opportunity_source_id='85000000-0000-4000-8000-000000000001'
  where id='82000000-0000-4000-8000-000000000002';

insert into public.opportunity_candidate_fact_decisions
  (candidate_fact_id,decision_number,decision,reviewer_email,accepted_value_type,accepted_value,accepted_unit,
   selected_destination_domain,selected_field_path,selected_candidate_tenant_key,conflict_disposition)
values ('84000000-0000-4000-8000-000000000001',2,'rejected','second@upperlineco.com',null,null,null,
  'opportunity','askingPrice',null,'kept_existing');

do $$ begin
  begin update public.opportunity_source_artifacts set sha256_digest=repeat('f',64) where id='82000000-0000-4000-8000-000000000001'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_candidate_facts set raw_value='"changed"' where id='84000000-0000-4000-8000-000000000001'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_candidate_fact_decisions set reviewer_email='other@upperlineco.com'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_source_artifacts set opportunity_source_id=null where id='82000000-0000-4000-8000-000000000002'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_source_artifacts set opportunity_source_id='85000000-0000-4000-8000-000000000002' where id='82000000-0000-4000-8000-000000000002'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_source_artifacts set opportunity_source_id='85000000-0000-4000-8000-000000000002' where id='82000000-0000-4000-8000-000000000001'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin update public.opportunity_ingestions set opportunity_id=null where id='81000000-0000-4000-8000-000000000002'; raise exception 'expected failure'; exception when others then if sqlerrm='expected failure' then raise; end if; end;
  begin
    insert into public.opportunity_candidate_facts (ingestion_id,artifact_id,extraction_run_id,destination_domain,field_path,assertion_basis,economic_role,validation_state,ordinal,candidate_fingerprint)
    values ('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','opportunity','lateField','source_stated','descriptive_fact','valid',20,repeat('6',64));
    raise exception 'expected failure';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'terminal_extraction_output_immutable' then raise; end if;
  end;
  if exists (select 1 from public.opportunity_candidate_facts where candidate_fingerprint=repeat('6',64)) then
    raise exception 'terminal candidate persisted';
  end if;
end $$;

set role authenticated;
do $$ begin
  begin perform 1 from public.opportunity_ingestions; raise exception 'read unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.opportunity_ingestions(entry_type,requested_by_email) values('pdf','browser@test'); raise exception 'write unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ declare table_name text; begin
  foreach table_name in array array['opportunity_ingestions','opportunity_source_artifacts','opportunity_extraction_runs','opportunity_candidate_facts','opportunity_candidate_fact_evidence','opportunity_candidate_fact_decisions'] loop
    if has_table_privilege('anon','public.'||table_name,'select') or has_table_privilege('authenticated','public.'||table_name,'insert') then raise exception 'browser grant leaked for %',table_name; end if;
    if not has_table_privilege('service_role','public.'||table_name,'select,insert,update,delete') then raise exception 'service role grant missing for %',table_name; end if;
  end loop;
end $$;
