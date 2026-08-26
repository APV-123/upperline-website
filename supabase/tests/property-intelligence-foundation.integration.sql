\set ON_ERROR_STOP on

insert into public.acquisition_opportunities
  (id,name,created_by_email,updated_by_email)
values
  ('c1000000-0000-4000-8000-000000000001','Reference Opportunity','test@upperlineco.com','test@upperlineco.com'),
  ('c1000000-0000-4000-8000-000000000002','Other Opportunity','test@upperlineco.com','test@upperlineco.com');

insert into public.opportunity_ingestions
  (id,opportunity_id,entry_type,requested_by_email)
values ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','pdf','test@upperlineco.com');
insert into public.opportunity_source_artifacts
  (id,ingestion_id,artifact_kind,storage_bucket,storage_path,byte_size,sha256_digest,validation_status,created_by_email)
values
  ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','pdf','private','reference.pdf',100,repeat('a',64),'valid','test@upperlineco.com'),
  ('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','pdf','private','other.pdf',100,repeat('c',64),'valid','test@upperlineco.com');

insert into public.intelligence_publishers
  (id,name,publisher_type,created_by_email)
values
  ('c4000000-0000-4000-8000-000000000001','JLL','broker','test@upperlineco.com'),
  ('c4000000-0000-4000-8000-000000000002','Seller','owner','test@upperlineco.com');
insert into public.intelligence_sources
  (id,publisher_id,title,source_kind,created_by_email)
values
  ('c5000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Reference OM','offering_memorandum','test@upperlineco.com'),
  ('c5000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000002','Seller operating records','operating_statement','test@upperlineco.com');
insert into public.intelligence_source_editions
  (id,source_id,edition_label,publication_precision,publication_year,created_by_email)
values
  ('c6000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000001','2026 OM','year',2026,'test@upperlineco.com'),
  ('c6000000-0000-4000-8000-000000000002','c5000000-0000-4000-8000-000000000002','2026 budget','year',2026,'test@upperlineco.com');
insert into public.intelligence_source_authority_assessments
  (source_edition_id,assessment_number,authority_class,assessed_by_email)
values
  ('c6000000-0000-4000-8000-000000000001',1,'marketing_material','reviewer@upperlineco.com'),
  ('c6000000-0000-4000-8000-000000000001',2,'professional_report','reviewer@upperlineco.com'),
  ('c6000000-0000-4000-8000-000000000002',1,'owner_operating_record','reviewer@upperlineco.com');

insert into public.intelligence_entities
  (id,entity_type,display_name,lifecycle_status,created_by_email)
values
  ('c7000000-0000-4000-8000-000000000001','property_site','Reference Property','active','test@upperlineco.com'),
  ('c7000000-0000-4000-8000-000000000002','property_site','Reference Property','provisional','test@upperlineco.com'),
  ('c7000000-0000-4000-8000-000000000003','parcel','Parcel A','active','test@upperlineco.com');
insert into public.intelligence_property_sites(entity_id,development_state)
values ('c7000000-0000-4000-8000-000000000001','improved');
insert into public.intelligence_entity_aliases
  (entity_id,alias_type,alias_value,source_edition_id,created_by_email)
values ('c7000000-0000-4000-8000-000000000001','property_name','Former Center Name','c6000000-0000-4000-8000-000000000001','test@upperlineco.com');
insert into public.intelligence_entity_external_identifiers
  (entity_id,namespace,identifier_value,issuer_publisher_id,created_by_email)
values
  ('c7000000-0000-4000-8000-000000000003','county_apn','APN-1','c4000000-0000-4000-8000-000000000002','test@upperlineco.com'),
  ('c7000000-0000-4000-8000-000000000002','county_apn','APN-1','c4000000-0000-4000-8000-000000000002','test@upperlineco.com');
insert into public.intelligence_entity_relationships
  (from_entity_id,relationship_type,to_entity_id,relationship_status,created_by_email)
values ('c7000000-0000-4000-8000-000000000001','contains','c7000000-0000-4000-8000-000000000003','confirmed','test@upperlineco.com');
insert into public.intelligence_opportunity_subjects
  (opportunity_id,entity_id,subject_role,created_by_email)
values ('c1000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','primary_target','test@upperlineco.com');
insert into public.intelligence_opportunity_subjects
  (opportunity_id,entity_id,subject_role,created_by_email)
values ('c1000000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000001','reference','test@upperlineco.com');
insert into public.intelligence_entity_resolution_proposals
  (id,subject_entity_id,candidate_entity_id,resolution_basis,proposed_score,proposed_by_email)
values
  ('c8000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000001','composite',0.9500,'test@upperlineco.com'),
  ('c8000000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000003','c7000000-0000-4000-8000-000000000001','manual',null,'test@upperlineco.com');
insert into public.intelligence_entity_resolution_decisions
  (proposal_id,decision_number,decision,reviewer_email)
values
  ('c8000000-0000-4000-8000-000000000001',1,'confirmed_match','reviewer@upperlineco.com'),
  ('c8000000-0000-4000-8000-000000000001',2,'reversed','reviewer@upperlineco.com');

insert into public.intelligence_artifacts
  (id,sha256_digest,byte_size,detected_media_type)
values
  ('c9000000-0000-4000-8000-000000000001',repeat('a',64),100,'application/pdf'),
  ('c9000000-0000-4000-8000-000000000002',repeat('b',64),100,'application/pdf');
insert into public.intelligence_artifact_acquisitions
  (artifact_id,opportunity_id,legacy_opportunity_artifact_id,acquisition_channel,storage_bucket,storage_path,acquired_by_email)
values ('c9000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','legacy_link','private','reference.pdf','test@upperlineco.com');
insert into public.intelligence_artifact_acquisitions
  (artifact_id,opportunity_id,acquisition_channel,external_locator,acquired_by_email)
values ('c9000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','download','https://example.invalid/reference.pdf','test@upperlineco.com');
insert into public.intelligence_source_edition_artifacts
  (source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
values ('c6000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001','primary',true,'test@upperlineco.com');
insert into public.intelligence_source_relationships
  (containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,attribution_text,created_by_email)
values ('c6000000-0000-4000-8000-000000000001','embeds_summary_of','c5000000-0000-4000-8000-000000000002','c6000000-0000-4000-8000-000000000002','Seller-provided 2026 budget','test@upperlineco.com');

do $$ begin
  if (select count(*) from public.intelligence_entities where display_name='Reference Property') <> 2 then raise exception 'display name incorrectly used as identity'; end if;
  if (select count(*) from public.intelligence_opportunity_subjects where entity_id='c7000000-0000-4000-8000-000000000001') <> 2 then raise exception 'durable subject could not span opportunities'; end if;
  if (select count(*) from public.intelligence_entity_external_identifiers where namespace='county_apn' and identifier_value='APN-1') <> 2 then raise exception 'identifier assertion prematurely canonicalized'; end if;
  if (select count(*) from public.intelligence_artifact_acquisitions where artifact_id='c9000000-0000-4000-8000-000000000001') <> 2 then raise exception 'global artifact could not span acquisitions'; end if;
  if (select count(*) from public.intelligence_entity_resolution_decisions where proposal_id='c8000000-0000-4000-8000-000000000001') <> 2 then raise exception 'resolution reversal history missing'; end if;
  if (select publication_month from public.intelligence_source_editions where id='c6000000-0000-4000-8000-000000000001') is not null then raise exception 'publication precision manufactured'; end if;
  if (select authority_class from public.intelligence_source_authority_assessments where source_edition_id='c6000000-0000-4000-8000-000000000001' and assessment_number=1) <> 'marketing_material' then raise exception 'authority assessment missing'; end if;
  if not has_table_privilege('service_role','public.intelligence_entities','SELECT') then raise exception 'service role table grant missing'; end if;
  if has_table_privilege('authenticated','public.intelligence_entities','SELECT') or has_table_privilege('anon','public.intelligence_entities','SELECT') then raise exception 'browser table grant present'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename like 'intelligence_%') then raise exception 'browser RLS policy present'; end if;
end $$;

do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname='public' and tablename like 'intelligence_%' loop
    if not has_table_privilege('service_role',format('public.%I',table_name),'SELECT,INSERT,UPDATE,DELETE') then raise exception 'service role privilege missing: %',table_name; end if;
    if has_table_privilege('authenticated',format('public.%I',table_name),'SELECT') or has_table_privilege('anon',format('public.%I',table_name),'SELECT') then raise exception 'browser table privilege present: %',table_name; end if;
    if exists (
      select 1 from pg_class target, lateral aclexplode(coalesce(target.relacl, acldefault('r', target.relowner))) acl
      where target.oid=format('public.%I',table_name)::regclass and acl.grantee=0
    ) then raise exception 'PUBLIC table privilege present: %',table_name; end if;
    if not (select relrowsecurity from pg_class where oid=format('public.%I',table_name)::regclass) then raise exception 'RLS missing: %',table_name; end if;
  end loop;
end $$;

do $$ begin
  begin insert into public.intelligence_property_sites(entity_id) values ('c7000000-0000-4000-8000-000000000003'); raise exception 'expected';
  exception when check_violation then if sqlerrm<>'intelligence_property_site_type_invalid' then raise; end if; end;
  begin update public.intelligence_entities set entity_type='parcel' where id='c7000000-0000-4000-8000-000000000001'; raise exception 'expected';
  exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_entity_identity_immutable' then raise; end if; end;
  begin update public.intelligence_source_editions set edition_label='changed' where id='c6000000-0000-4000-8000-000000000001'; raise exception 'expected';
  exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_history_append_only' then raise; end if; end;
  begin delete from public.intelligence_sources where id='c5000000-0000-4000-8000-000000000001'; raise exception 'expected';
  exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_history_append_only' then raise; end if; end;
  begin delete from public.intelligence_publishers where id='c4000000-0000-4000-8000-000000000001'; raise exception 'expected';
  exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_history_append_only' then raise; end if; end;
  begin insert into public.intelligence_artifacts(sha256_digest,byte_size,detected_media_type) values (repeat('a',64),101,'application/pdf'); raise exception 'expected';
  exception when unique_violation then null; end;
  begin insert into public.intelligence_entity_resolution_proposals(subject_entity_id,candidate_entity_id,resolution_basis,proposed_by_email)
    values ('c7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000002','manual','test'); raise exception 'expected';
  exception when unique_violation then null; end;
  begin insert into public.intelligence_entity_resolution_decisions(proposal_id,decision_number,decision,reviewer_email)
    values ('c8000000-0000-4000-8000-000000000002',1,'reversed','test'); raise exception 'expected';
  exception when check_violation then if sqlerrm<>'intelligence_resolution_decision_sequence_invalid' then raise; end if; end;
  begin insert into public.intelligence_source_authority_assessments(source_edition_id,assessment_number,authority_class,assessed_by_email)
    values ('c6000000-0000-4000-8000-000000000002',3,'professional_report','test'); raise exception 'expected';
  exception when check_violation then if sqlerrm<>'intelligence_source_authority_sequence_invalid' then raise; end if; end;
  begin insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,created_by_email)
    values ('c6000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001','supplement','test'); raise exception 'expected';
  exception when unique_violation then null; end;
  begin insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
    values ('c6000000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000002','supplement',true,'test'); raise exception 'expected';
  exception when check_violation then null; end;
  begin insert into public.intelligence_source_relationships(containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email)
    values ('c6000000-0000-4000-8000-000000000001','embeds_summary_of','c5000000-0000-4000-8000-000000000002','c6000000-0000-4000-8000-000000000002','test'); raise exception 'expected';
  exception when unique_violation then null; end;
  begin insert into public.intelligence_source_relationships(containing_source_edition_id,relationship_type,attributed_source_id,created_by_email)
    values ('c6000000-0000-4000-8000-000000000001','revises','c5000000-0000-4000-8000-000000000002','test'); raise exception 'expected';
  exception when check_violation then null; end;
  begin insert into public.intelligence_artifact_acquisitions(artifact_id,opportunity_id,legacy_opportunity_artifact_id,acquisition_channel,acquired_by_email)
    values ('c9000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002','download','test'); raise exception 'expected';
  exception when check_violation then null; end;
  begin insert into public.intelligence_artifact_acquisitions(artifact_id,opportunity_id,legacy_opportunity_artifact_id,acquisition_channel,acquired_by_email)
    values ('c9000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002','legacy_link','test'); raise exception 'expected';
  exception when check_violation then if sqlerrm<>'intelligence_legacy_artifact_identity_mismatch' then raise; end if; end;
  begin insert into public.intelligence_artifact_acquisitions
    (artifact_id,opportunity_id,legacy_opportunity_artifact_id,acquisition_channel,acquired_by_email)
    values ('c9000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000001','legacy_link','test'); raise exception 'expected';
  exception when check_violation then if sqlerrm<>'intelligence_legacy_artifact_opportunity_mismatch' then raise; end if; end;
end $$;
