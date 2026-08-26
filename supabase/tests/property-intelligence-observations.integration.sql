\set ON_ERROR_STOP on

insert into public.intelligence_publishers(id,name,publisher_type,created_by_email)
values('d1000000-0000-4000-8000-000000000001','Test Broker','broker','test@upperlineco.com');
insert into public.intelligence_sources(id,publisher_id,title,source_kind,created_by_email)
values('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Test OM','offering_memorandum','test@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,publication_year,created_by_email)
values('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','2026','year',2026,'test@upperlineco.com');
insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type)
values('d4000000-0000-4000-8000-000000000001',repeat('d',64),100,'application/pdf');
insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
values('d3000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','primary',true,'test@upperlineco.com');
insert into public.intelligence_entities(id,entity_type,display_name,lifecycle_status,created_by_email) values
('d5000000-0000-4000-8000-000000000001','property_site','Test Property','active','test@upperlineco.com'),
('d5000000-0000-4000-8000-000000000002','premises','Suite 100','active','test@upperlineco.com'),
('d5000000-0000-4000-8000-000000000003','organization','Test Tenant','active','test@upperlineco.com');
insert into public.intelligence_property_sites(entity_id) values('d5000000-0000-4000-8000-000000000001');
insert into public.intelligence_entity_relationships(id,from_entity_id,relationship_type,to_entity_id,valid_from,valid_to,relationship_status,created_by_email)
values('d5100000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','contains','d5000000-0000-4000-8000-000000000002','2099-01-01','2099-12-31','confirmed','test@upperlineco.com');
insert into public.intelligence_reported_spaces(id,property_entity_id,label,identity_status,created_by_email)
values('d6000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','Unresolved Starbucks space','provisional','test@upperlineco.com');

begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email)
values('da000000-0000-4000-8000-000000000001','rent','source_stated','test@upperlineco.com');
insert into public.intelligence_rent_observations values
('da000000-0000-4000-8000-000000000001',8000,'USD','contractual','reported_contractual','base','monetary_absolute','monthly','not_applicable','nnn','current');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values
('da000000-0000-4000-8000-000000000001','property','d5000000-0000-4000-8000-000000000001'),
('da000000-0000-4000-8000-000000000001','premises','d5000000-0000-4000-8000-000000000002'),
('da000000-0000-4000-8000-000000000001','tenant_organization','d5000000-0000-4000-8000-000000000003');
insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value)
values('da000000-0000-4000-8000-000000000001','effective_start','closed','day',2026,1,1);
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role)
values('da000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','containing');
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type,section_label) values
('db000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','pdf','Rent Roll'),
('db000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','pdf','Rent Roll'),
('db000000-0000-4000-8000-000000000003','d3000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','pdf','Summary');
insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number) values
('db000000-0000-4000-8000-000000000001',1),('db000000-0000-4000-8000-000000000002',2),('db000000-0000-4000-8000-000000000003',3);
insert into public.intelligence_observation_evidence values
('da000000-0000-4000-8000-000000000001','db000000-0000-4000-8000-000000000001','supports','value',now()),
('da000000-0000-4000-8000-000000000001','db000000-0000-4000-8000-000000000002','supports','value',now()),
('da000000-0000-4000-8000-000000000001','db000000-0000-4000-8000-000000000003','supports','classification',now());
commit;

begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email)
values('da000000-0000-4000-8000-000000000002','area','source_stated','test@upperlineco.com');
insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000002',3001,'square_feet','premises_area');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values
('da000000-0000-4000-8000-000000000002','property','d5000000-0000-4000-8000-000000000001'),
('da000000-0000-4000-8000-000000000002','premises','d5000000-0000-4000-8000-000000000002');
insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value) values
('da000000-0000-4000-8000-000000000002','effective_start','closed','day',2025,1,1),
('da000000-0000-4000-8000-000000000002','effective_end','open','unknown',null,null,null);
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role)
values('da000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000001','containing');
insert into public.intelligence_observation_evidence values('da000000-0000-4000-8000-000000000002','db000000-0000-4000-8000-000000000001','supports','value',now());
commit;

select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000001','admitted',0,'dc000000-0000-4000-8000-000000000001','reviewer@upperlineco.com',null);
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000002','admitted',0,'dc000000-0000-4000-8000-000000000002','reviewer@upperlineco.com',null);

select public.derive_intelligence_annualized_rent_per_square_foot_v1(
 'da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','test@upperlineco.com') as derived_id \gset
set app.test_derived_id = :'derived_id';

do $$
declare amount_value numeric; subject_difference integer; temporal_difference integer;
begin
  select amount into amount_value from public.intelligence_rent_observations where observation_id=current_setting('app.test_derived_id')::uuid;
  if amount_value<>31.98933689 then raise exception 'annualized output mismatch: %',amount_value; end if;
  select count(*) into subject_difference from (
    (select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id='da000000-0000-4000-8000-000000000001'
     except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=current_setting('app.test_derived_id')::uuid)
    union all
    (select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=current_setting('app.test_derived_id')::uuid
     except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id='da000000-0000-4000-8000-000000000001')) q;
  if subject_difference<>0 then raise exception 'rent subject projection mismatch'; end if;
  select count(*) into temporal_difference from (
    (select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id='da000000-0000-4000-8000-000000000001'
     except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=current_setting('app.test_derived_id')::uuid)
    union all
    (select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=current_setting('app.test_derived_id')::uuid
     except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id='da000000-0000-4000-8000-000000000001')) q;
  if temporal_difference<>0 then raise exception 'rent temporal projection mismatch'; end if;
  if exists(select 1 from public.intelligence_observation_source_assertions where observation_id=current_setting('app.test_derived_id')::uuid) or exists(select 1 from public.intelligence_observation_evidence where observation_id=current_setting('app.test_derived_id')::uuid) then raise exception 'derived output falsely copied direct provenance'; end if;
  if (select count(*) from public.intelligence_observation_derivation_inputs i join public.intelligence_observation_derivations d on d.id=i.derivation_id where d.output_observation_id=current_setting('app.test_derived_id')::uuid)<>2 then raise exception 'lineage inputs missing'; end if;
  if public.intelligence_current_admission_state_v1(current_setting('app.test_derived_id')::uuid)<>'pending' then raise exception 'derived output inherited admission'; end if;
end $$;

-- Numerically equal textual forms are one proposition amount.
do $$ begin if 32::numeric is distinct from 32.00000000::numeric then raise exception 'numeric textual scale became identity'; end if; end $$;
do $$ begin
  if round(8000::numeric*12/3000::numeric,8)<>32 then raise exception 'exact 32 case failed'; end if;
  if round(8000::numeric*12/3001::numeric,8)<>31.98933689 then raise exception 'fractional case failed'; end if;
  if round(1.0000000049::numeric,8)<>1.00000000 then raise exception 'below-half rounding failed'; end if;
  if round(1.0000000051::numeric,8)<>1.00000001 then raise exception 'above-half rounding failed'; end if;
  if round(1.000000005::numeric,8)<>1.00000001 or round(-1.000000005::numeric,8)<>-1.00000001 then raise exception 'half-away-from-zero failed'; end if;
  if 8000.123456789012::numeric*12/3001.123456789012::numeric = round(8000.123456789012::numeric,8)*12/round(3001.123456789012::numeric,8) then raise exception 'input-rounding adversary ineffective'; end if;
  if (select pronargs from pg_proc where oid='public.derive_intelligence_annualized_rent_per_square_foot_v1(uuid,uuid,text)'::regprocedure)<>3 then raise exception 'caller gained calculation controls'; end if;
end $$;
do $$ declare first_id uuid; second_id uuid; begin
  first_id:=public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','test@upperlineco.com');
  second_id:=public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','another@upperlineco.com');
  if first_id<>second_id then raise exception 'identical derivation was not idempotent'; end if;
end $$;
set role service_role;
select public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','service@upperlineco.com');
reset role;

-- Admission reversal and stale revision behavior.
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000001','reversed',1,'dc000000-0000-4000-8000-000000000003','reviewer@upperlineco.com',null);
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000001','admitted',2,'dc000000-0000-4000-8000-000000000004','reviewer@upperlineco.com',null);
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000001','admitted',2,'dc000000-0000-4000-8000-000000000004','reviewer@upperlineco.com',null);
do $$ begin
  begin perform public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000001','reversed',2,gen_random_uuid(),'reviewer@upperlineco.com',null); raise exception 'expected stale revision';
  exception when serialization_failure then if sqlerrm<>'intelligence_admission_stale_revision' then raise; end if; end;
end $$;

-- A lone known boundary remains storable but cannot establish V1 derivation compatibility.
begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('da000000-0000-4000-8000-000000000003','area','source_stated','test@upperlineco.com');
insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000003',3000,'square_feet','premises_area');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values
('da000000-0000-4000-8000-000000000003','property','d5000000-0000-4000-8000-000000000001'),
('da000000-0000-4000-8000-000000000003','premises','d5000000-0000-4000-8000-000000000002');
insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value)
values('da000000-0000-4000-8000-000000000003','effective_start','closed','day',2026,1,1);
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values('da000000-0000-4000-8000-000000000003','d3000000-0000-4000-8000-000000000001','containing');
insert into public.intelligence_observation_evidence values('da000000-0000-4000-8000-000000000003','db000000-0000-4000-8000-000000000001','supports','value',now());
commit;
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000003','admitted',0,'dc000000-0000-4000-8000-000000000005','reviewer@upperlineco.com',null);
do $$ begin
  begin perform public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000003','test@upperlineco.com'); raise exception 'expected temporal rejection';
  exception when check_violation then if sqlerrm<>'intelligence_derivation_temporal_incompatible' then raise; end if; end;
end $$;

-- Exact acres conversion; no rounding.
begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('da000000-0000-4000-8000-000000000004','area','human_entered','test@upperlineco.com');
insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000004',1.234567890123,'acres','site_area');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values
('da000000-0000-4000-8000-000000000004','property','d5000000-0000-4000-8000-000000000001');
insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value)
values('da000000-0000-4000-8000-000000000004','as_of','point','day',2026,1,1);
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values('da000000-0000-4000-8000-000000000004','d3000000-0000-4000-8000-000000000001','containing');
insert into public.intelligence_observation_evidence values('da000000-0000-4000-8000-000000000004','db000000-0000-4000-8000-000000000001','supports','value',now());
commit;
select * from public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000004','admitted',0,'dc000000-0000-4000-8000-000000000006','reviewer@upperlineco.com',null);
select public.derive_intelligence_acres_to_square_feet_v1('da000000-0000-4000-8000-000000000004','test@upperlineco.com') as area_derived_id \gset
set app.test_area_derived_id = :'area_derived_id';
do $$ begin
 if (select amount from public.intelligence_area_observations where observation_id=current_setting('app.test_area_derived_id')::uuid)<>1.234567890123::numeric*43560 then raise exception 'acres conversion rounded'; end if;
end $$;

-- Security and append-only posture.
do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname='public' and tablename like 'intelligence_%' loop
    if not (select relrowsecurity from pg_class where oid=format('public.%I',table_name)::regclass) then raise exception 'RLS missing: %',table_name; end if;
    if has_table_privilege('authenticated',format('public.%I',table_name),'SELECT') or has_table_privilege('anon',format('public.%I',table_name),'SELECT') then raise exception 'browser table authority: %',table_name; end if;
  end loop;
  if has_function_privilege('authenticated','public.decide_intelligence_observation_admission(uuid,text,integer,uuid,text,text)','EXECUTE') then raise exception 'browser RPC authority'; end if;
  begin update public.intelligence_rent_observations set amount=1 where observation_id='da000000-0000-4000-8000-000000000001'; raise exception 'expected immutable';
  exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_history_append_only' then raise; end if; end;
end $$;

-- Reserved pending row for the concurrency harness.
begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('da000000-0000-4000-8000-000000000099','area','human_entered','test@upperlineco.com');
insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000099',1,'acres','site_area');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values
('da000000-0000-4000-8000-000000000099','property','d5000000-0000-4000-8000-000000000001');
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values('da000000-0000-4000-8000-000000000099','d3000000-0000-4000-8000-000000000001','containing');
insert into public.intelligence_observation_evidence values('da000000-0000-4000-8000-000000000099','db000000-0000-4000-8000-000000000001','supports','value',now());
commit;

-- Locked V1 vocabulary, entity-type, locator, timestamp, registry, and idempotency attacks.
do $$ begin
  begin insert into public.intelligence_lease_term_observations(observation_id,term_type,value_precision) values(gen_random_uuid(),'option_period','unknown'); raise exception 'option_period accepted'; exception when check_violation or foreign_key_violation then null; end;
  begin insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('da000000-0000-4000-8000-000000000001','duplicates','da000000-0000-4000-8000-000000000002','test@upperlineco.com'); raise exception 'unsupported relationship accepted'; exception when check_violation then null; end;
  begin insert into public.intelligence_tenancy_participants(tenancy_id,participant_entity_id,participant_role) values(gen_random_uuid(),'d5000000-0000-4000-8000-000000000002','tenant_organization'); raise exception 'participant mismatch accepted'; exception when foreign_key_violation or check_violation then null; end;
  begin insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,cell_reference,row_number) values(gen_random_uuid(),'Sheet1','A1',1); raise exception 'combined spreadsheet locator accepted'; exception when foreign_key_violation or check_violation then null; end;
  begin insert into public.intelligence_derivation_methods(method_key,method_version,canonical_manifest,contract_sha256) values('forged',1,'{}',repeat('a',64)); raise exception 'method registry insertion accepted'; exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_derivation_method_registry_locked' then raise; end if; end;
end $$;
do $$ declare recorded timestamptz; supplied constant timestamptz:='2001-01-01T00:00:00Z'; begin
  insert into public.intelligence_observation_independence_assessments(observation_a_id,observation_b_id,assessment_number,classification,assessed_by_email,assessed_at) values('da000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002',1,'unknown','test@upperlineco.com',supplied) returning assessed_at into recorded;
  if recorded=supplied then raise exception 'caller controlled authoritative timestamp'; end if;
end $$;
do $$ begin
  begin perform public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000099','admitted',0,'dd000000-0000-4000-8000-000000000010','one@upperlineco.com',null); perform public.decide_intelligence_observation_admission('da000000-0000-4000-8000-000000000099','rejected',0,'dd000000-0000-4000-8000-000000000010','one@upperlineco.com',null); raise exception 'idempotency conflict accepted'; exception when unique_violation then if sqlerrm<>'intelligence_admission_idempotency_conflict' then raise; end if; end;
end $$;
do $$ begin
  begin
    insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('da000000-0000-4000-8000-000000000020','area','human_entered','test@upperlineco.com');
    insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000020',1,'acres','site_area');
    insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values('da000000-0000-4000-8000-000000000020','property','d5000000-0000-4000-8000-000000000001');
    insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value) values ('da000000-0000-4000-8000-000000000020','effective_start','closed','year',2027),('da000000-0000-4000-8000-000000000020','effective_end','closed','year',2026);
    set constraints all immediate; raise exception 'provably inverted partial interval accepted';
  exception when check_violation then if sqlerrm<>'intelligence_effective_interval_order_invalid' then raise; end if; end;
end $$;
begin;
insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('da000000-0000-4000-8000-000000000021','area','human_entered','test@upperlineco.com');
insert into public.intelligence_area_observations values('da000000-0000-4000-8000-000000000021',1,'acres','site_area');
insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values('da000000-0000-4000-8000-000000000021','property','d5000000-0000-4000-8000-000000000001');
insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value) values ('da000000-0000-4000-8000-000000000021','effective_start','closed','month',2026,12),('da000000-0000-4000-8000-000000000021','effective_end','closed','year',2026,null);
commit;

-- Lease instruments cannot bridge lease identities.
insert into public.intelligence_tenancies(id,property_entity_id,identity_status,created_by_email) values
 ('d7000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','resolved','test@upperlineco.com'),
 ('d7000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000001','resolved','test@upperlineco.com');
insert into public.intelligence_leases(id,tenancy_id,identity_status,created_by_email) values
 ('d7100000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','resolved','test@upperlineco.com'),
 ('d7100000-0000-4000-8000-000000000002','d7000000-0000-4000-8000-000000000002','resolved','test@upperlineco.com');
insert into public.intelligence_lease_instruments(id,lease_id,source_edition_id,instrument_type,created_by_email) values
 ('d7200000-0000-4000-8000-000000000001','d7100000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','original_lease','test@upperlineco.com'),
 ('d7200000-0000-4000-8000-000000000002','d7100000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000001','amendment','test@upperlineco.com');
do $$ begin
 begin insert into public.intelligence_lease_instrument_relationships(from_instrument_id,relationship_type,to_instrument_id) values('d7200000-0000-4000-8000-000000000002','amends','d7200000-0000-4000-8000-000000000001'); raise exception 'cross-lease instrument relationship accepted';
 exception when check_violation then if sqlerrm<>'intelligence_lease_instrument_cross_lease_invalid' then raise; end if; end;
end $$;

-- Direct forged derivation payload/fingerprint cannot pass deferred authority checks.
do $$ declare output_id uuid:=gen_random_uuid(); derivation_id uuid:=gen_random_uuid(); begin
  begin
    insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values(output_id,'area','deterministic_derived','forger@upperlineco.com');
    insert into public.intelligence_area_observations values(output_id,999,'square_feet','site_area');
    insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(output_id,'property','d5000000-0000-4000-8000-000000000001');
    insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value) values(output_id,'as_of','point','day',2026,1,1);
    insert into public.intelligence_observation_derivations(id,output_observation_id,method_key,method_version,request_fingerprint,created_by_email) values(derivation_id,output_id,'acres_to_square_feet',1,repeat('f',64),'forger@upperlineco.com');
    insert into public.intelligence_observation_derivation_inputs values(derivation_id,1,'area_input','da000000-0000-4000-8000-000000000004');
    set constraints all immediate; raise exception 'forged direct derivation accepted';
  exception when check_violation then if sqlerrm not in ('intelligence_derivation_fingerprint_invalid','intelligence_derivation_output_value_invalid') then raise; end if; end;
end $$;
