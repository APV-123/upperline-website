insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email)
values
 ('91000000-0000-4000-8000-000000000001','Bridge One','reviewer@upperlineco.com','reviewer@upperlineco.com'),
 ('91000000-0000-4000-8000-000000000002','Bridge Two','reviewer@upperlineco.com','reviewer@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,status,requested_by_email)
values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','pdf','review_ready','reviewer@upperlineco.com'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','pdf','review_ready','reviewer@upperlineco.com');
insert into public.opportunity_source_artifacts(
 id,ingestion_id,artifact_kind,storage_bucket,storage_path,original_filename,detected_mime_type,
 byte_size,sha256_digest,page_count,validation_status,created_by_email
) values
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000001/ingestions/92000000-0000-4000-8000-000000000001/artifacts/93000000-0000-4000-8000-000000000001/source.pdf','one.pdf','application/pdf',1000,repeat('a',64),4,'valid','reviewer@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000002/ingestions/92000000-0000-4000-8000-000000000002/artifacts/93000000-0000-4000-8000-000000000002/source.pdf','two.pdf','application/pdf',1000,repeat('a',64),4,'valid','reviewer@upperlineco.com');

set role service_role;
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000001','reviewer@upperlineco.com');
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000001','reviewer@upperlineco.com');
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000002','reviewer@upperlineco.com');
reset role;

do $$ begin
  if (select count(*) from public.intelligence_artifacts where sha256_digest=repeat('a',64)) <> 1 then raise exception 'global digest did not converge'; end if;
  if (select count(*) from public.intelligence_artifact_acquisitions where legacy_opportunity_artifact_id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002')) <> 2 then raise exception 'acquisition identity did not converge'; end if;
  if exists(select 1 from public.intelligence_artifact_acquisitions where legacy_opportunity_artifact_id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002') and acquired_by_email <> 'reviewer@upperlineco.com') then raise exception 'acquisition audit actor mismatch'; end if;
  if exists(select 1 from public.intelligence_provenance_commands)
    or exists(select 1 from public.intelligence_provenance_resolution_proposals)
    or exists(select 1 from public.intelligence_observations) then raise exception 'bridge created downstream authority'; end if;
end $$;

do $$ begin
  begin
    perform * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000001','attacker@example.com');
    raise exception 'invalid actor admitted';
  exception when sqlstate '22023' then null; end;
end $$;

set role authenticated;
do $$ begin
  begin
    perform * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000001','reviewer@upperlineco.com');
    raise exception 'browser role executed bridge';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin
  if not pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','select')
    or not pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','insert')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','update')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','delete')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','truncate')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','references')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifacts','trigger')
    or not pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','select')
    or not pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','insert')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','update')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','delete')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','truncate')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','references')
    or pg_catalog.has_table_privilege('service_role','public.intelligence_artifact_acquisitions','trigger') then
    raise exception 'bridge table privilege mismatch';
  end if;
end $$;
set role service_role;
do $$ begin
  begin
    truncate table public.intelligence_artifact_acquisitions;
    raise exception 'service_role truncate unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A failed transaction must leave neither byte identity nor acquisition, and retry must succeed.
insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email)
values ('91000000-0000-4000-8000-000000000004','Bridge Rollback','reviewer@upperlineco.com','reviewer@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,status,requested_by_email)
values ('92000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000004','pdf','review_ready','reviewer@upperlineco.com');
insert into public.opportunity_source_artifacts(id,ingestion_id,artifact_kind,storage_bucket,storage_path,detected_mime_type,byte_size,sha256_digest,page_count,validation_status,created_by_email)
values ('93000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000004','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000004/ingestions/92000000-0000-4000-8000-000000000004/artifacts/93000000-0000-4000-8000-000000000004/source.pdf','application/pdf',3000,repeat('c',64),6,'valid','reviewer@upperlineco.com');
begin;
set local role service_role;
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000004','reviewer@upperlineco.com');
rollback;
do $$ begin
  if exists(select 1 from public.intelligence_artifacts where sha256_digest=repeat('c',64)) then raise exception 'failed transaction retained artifact'; end if;
  if exists(select 1 from public.intelligence_artifact_acquisitions where legacy_opportunity_artifact_id='93000000-0000-4000-8000-000000000004') then raise exception 'failed transaction retained acquisition'; end if;
end $$;
set role service_role;
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000004','reviewer@upperlineco.com');
reset role;

-- Newer rejected/non-PDF rows cannot displace the newest authoritative valid PDF.
insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email)
values ('91000000-0000-4000-8000-000000000005','Bridge Eligibility','reviewer@upperlineco.com','reviewer@upperlineco.com');
insert into public.opportunity_ingestions(id,opportunity_id,entry_type,status,requested_by_email)
values ('92000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000005','pdf','review_ready','reviewer@upperlineco.com');
insert into public.opportunity_source_artifacts(id,ingestion_id,artifact_kind,storage_bucket,storage_path,detected_mime_type,byte_size,sha256_digest,page_count,validation_status,created_by_email,created_at)
values
 ('93000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000005','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000005/ingestions/92000000-0000-4000-8000-000000000005/artifacts/93000000-0000-4000-8000-000000000005/source.pdf','application/pdf',4000,repeat('d',64),7,'valid','reviewer@upperlineco.com','2026-01-01Z'),
 ('93000000-0000-4000-8000-000000000006','92000000-0000-4000-8000-000000000005','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000005/ingestions/92000000-0000-4000-8000-000000000005/artifacts/93000000-0000-4000-8000-000000000006/source.pdf','application/pdf',4001,repeat('e',64),7,'rejected','reviewer@upperlineco.com','2026-01-02Z'),
 ('93000000-0000-4000-8000-000000000007','92000000-0000-4000-8000-000000000005','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000005/ingestions/92000000-0000-4000-8000-000000000005/artifacts/93000000-0000-4000-8000-000000000007/source.pdf','image/png',4002,repeat('f',64),null,'valid','reviewer@upperlineco.com','2026-01-03Z');
set role service_role;
select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000005','reviewer@upperlineco.com');
reset role;
do $$ begin
  if not exists(select 1 from public.intelligence_artifacts where sha256_digest=repeat('d',64)) then raise exception 'authoritative valid PDF not selected'; end if;
  if exists(select 1 from public.intelligence_artifacts where sha256_digest in (repeat('e',64),repeat('f',64))) then raise exception 'ineligible artifact bridged'; end if;
end $$;
