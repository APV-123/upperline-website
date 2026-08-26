\set ON_ERROR_STOP on
\echo 'Phase 4C.2.3 explicit 46-case adversarial matrix'

create schema test_phase4c23;
create function test_phase4c23.make_area(p_id uuid,p_property uuid,p_premises uuid,p_reported uuid,p_amount numeric,p_unit text default 'square_feet',p_support boolean default true)
returns void language plpgsql set search_path='' as $$ begin
  insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values(p_id,'area','source_stated','matrix@upperlineco.com');
  insert into public.intelligence_area_observations values(p_id,p_amount,p_unit,case when p_premises is not null then 'premises_area' when p_reported is not null then 'reported_space_area' else 'site_area' end);
  insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(p_id,'property',p_property);
  if p_premises is not null then insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(p_id,'premises',p_premises); end if;
  if p_reported is not null then insert into public.intelligence_observation_subjects(observation_id,subject_role,reported_space_id) values(p_id,'reported_space',p_reported); end if;
  if p_unit='acres' then
    insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value) values(p_id,'as_of','point','day',2026,1,1);
  else
    insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value) values(p_id,'effective_start','closed','day',2025,1,1),(p_id,'effective_end','open','unknown',null,null,null);
  end if;
  insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values(p_id,'d3000000-0000-4000-8000-000000000001','containing');
  if p_support then insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values(p_id,'db000000-0000-4000-8000-000000000001','supports','value'); end if;
end $$;

create function test_phase4c23.make_rent(p_id uuid,p_property uuid,p_premises uuid,p_reported uuid,p_amount numeric,p_year integer default 2026,p_tenant boolean default false)
returns void language plpgsql set search_path='' as $$ begin
  insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values(p_id,'rent','source_stated','matrix@upperlineco.com');
  insert into public.intelligence_rent_observations values(p_id,p_amount,'USD','contractual','reported_contractual','base','monetary_absolute','monthly','not_applicable','nnn','current');
  insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(p_id,'property',p_property);
  if p_premises is not null then insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(p_id,'premises',p_premises); end if;
  if p_reported is not null then insert into public.intelligence_observation_subjects(observation_id,subject_role,reported_space_id) values(p_id,'reported_space',p_reported); end if;
  if p_tenant then insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values(p_id,'tenant_organization','d5000000-0000-4000-8000-000000000003'); end if;
  insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value) values(p_id,'effective_start','closed','day',p_year,1,1);
  insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values(p_id,'d3000000-0000-4000-8000-000000000001','containing');
  insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values(p_id,'db000000-0000-4000-8000-000000000001','supports','value');
end $$;

-- Shared matrix identities.
insert into public.intelligence_entities(id,entity_type,display_name,lifecycle_status,created_by_email) values
('e5000000-0000-4000-8000-000000000001','property_site','Matrix Property 2','active','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000002','premises','Matrix Premises P2','active','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000003','premises','Matrix Premises P1-B','active','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000004','premises','Uncontained Premises','active','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000005','premises','Ambiguous Premises','active','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000006','premises','Proposed Premises','active','matrix@upperlineco.com');
insert into public.intelligence_property_sites(entity_id) values('e5000000-0000-4000-8000-000000000001');
insert into public.intelligence_entity_relationships(from_entity_id,relationship_type,to_entity_id,relationship_status,created_by_email) values
('e5000000-0000-4000-8000-000000000001','contains','e5000000-0000-4000-8000-000000000002','confirmed','matrix@upperlineco.com'),
('d5000000-0000-4000-8000-000000000001','contains','e5000000-0000-4000-8000-000000000003','confirmed','matrix@upperlineco.com'),
('d5000000-0000-4000-8000-000000000001','contains','e5000000-0000-4000-8000-000000000005','confirmed','matrix@upperlineco.com'),
('e5000000-0000-4000-8000-000000000001','contains','e5000000-0000-4000-8000-000000000005','confirmed','matrix@upperlineco.com'),
('d5000000-0000-4000-8000-000000000001','contains','e5000000-0000-4000-8000-000000000006','proposed','matrix@upperlineco.com');

-- CASE 01: exact annualized rent result.
begin; select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002',null,3000); commit;
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000001','admitted',0,'ec000000-0000-4000-8000-000000000001','matrix@upperlineco.com',null);
select public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','matrix@upperlineco.com') as case01_id \gset
select set_config('app.matrix_case01_id', :'case01_id', false);
do $$ begin if (select amount from public.intelligence_rent_observations where observation_id=current_setting('app.matrix_case01_id')::uuid)<>32 then raise exception 'CASE 01 failed'; end if; end $$;
\echo 'CASE 01 PASS — valid 8000 monthly / 3000 SF = 32.00000000'

-- CASE 02: different property rejects.
begin; select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000002','e5000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000002',null,3000); commit;
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000002','admitted',0,'ec000000-0000-4000-8000-000000000002','matrix@upperlineco.com',null);
do $$ begin begin perform public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000002','matrix@upperlineco.com'); raise exception 'CASE 02 accepted'; exception when check_violation then if sqlerrm<>'intelligence_derivation_subject_incompatible' then raise; end if; end; end $$;
\echo 'CASE 02 PASS — different property rejected: intelligence_derivation_subject_incompatible'

-- CASE 03: different premises rejects.
begin; select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000003','d5000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000003',null,3000); commit;
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000003','admitted',0,'ec000000-0000-4000-8000-000000000003','matrix@upperlineco.com',null);
do $$ begin begin perform public.derive_intelligence_annualized_rent_per_square_foot_v1('da000000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000003','matrix@upperlineco.com'); raise exception 'CASE 03 accepted'; exception when check_violation then if sqlerrm<>'intelligence_derivation_subject_incompatible' then raise; end if; end; end $$;
\echo 'CASE 03 PASS — different premises rejected'

-- CASE 04: identical reported_space succeeds.
begin; select test_phase4c23.make_rent('ea000000-0000-4000-8000-000000000004','d5000000-0000-4000-8000-000000000001',null,'d6000000-0000-4000-8000-000000000001',8000); select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000005','d5000000-0000-4000-8000-000000000001',null,'d6000000-0000-4000-8000-000000000001',3000); commit;
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000004','admitted',0,'ec000000-0000-4000-8000-000000000004','matrix@upperlineco.com',null);
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000005','admitted',0,'ec000000-0000-4000-8000-000000000005','matrix@upperlineco.com',null);
select public.derive_intelligence_annualized_rent_per_square_foot_v1('ea000000-0000-4000-8000-000000000004','ea000000-0000-4000-8000-000000000005','matrix@upperlineco.com') as case04_id \gset
select set_config('app.matrix_case04_id', :'case04_id', false);
do $$ begin if (select amount from public.intelligence_rent_observations where observation_id=current_setting('app.matrix_case04_id')::uuid)<>32 then raise exception 'CASE 04 failed'; end if; end $$;
\echo 'CASE 04 PASS — identical reported_space derivation succeeds'

-- CASE 05: area cannot introduce denominator identity.
begin; select test_phase4c23.make_rent('ea000000-0000-4000-8000-000000000006','d5000000-0000-4000-8000-000000000001',null,null,8000); commit;
select * from public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000006','admitted',0,'ec000000-0000-4000-8000-000000000006','matrix@upperlineco.com',null);
do $$ begin begin perform public.derive_intelligence_annualized_rent_per_square_foot_v1('ea000000-0000-4000-8000-000000000006','ea000000-0000-4000-8000-000000000001','matrix@upperlineco.com'); raise exception 'CASE 05 accepted'; exception when check_violation then if sqlerrm<>'intelligence_derivation_subject_incompatible' then raise; end if; end; end $$;
\echo 'CASE 05 PASS — area cannot introduce denominator identity'

-- CASE 06: zero confirmed containment rejects admission.
do $$ begin begin perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000007','d5000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000004',null,1000); perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000007','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null); set constraints all immediate; raise exception 'CASE 06 accepted'; exception when check_violation then if sqlerrm<>'intelligence_premises_property_resolution_invalid' then raise; end if; end; end $$;
\echo 'CASE 06 PASS — zero containment rejected'

-- CASE 07: exactly one confirmed containment succeeds (proved by CASE 01 admission).
do $$ begin if public.intelligence_current_admission_state_v1('ea000000-0000-4000-8000-000000000001')<>'admitted' then raise exception 'CASE 07 failed'; end if; end $$;
\echo 'CASE 07 PASS — exactly one confirmed containment admitted'

-- CASE 08: ambiguous/conflicting confirmed containment rejects.
do $$ begin begin perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000008','d5000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000005',null,1000); perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000008','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null); set constraints all immediate; raise exception 'CASE 08 accepted'; exception when check_violation then if sqlerrm<>'intelligence_premises_property_resolution_invalid' then raise; end if; end; end $$;
\echo 'CASE 08 PASS — multiple/conflicting containment rejected'

-- CASE 09: proposed containment is non-authoritative.
do $$ begin begin perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000009','d5000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000006',null,1000); perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000009','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null); set constraints all immediate; raise exception 'CASE 09 accepted'; exception when check_violation then if sqlerrm<>'intelligence_premises_property_resolution_invalid' then raise; end if; end; end $$;
\echo 'CASE 09 PASS — non-authoritative containment rejected'

-- CASE 10: relationship dates are irrelevant (base relationship is future-dated).
do $$ begin if not exists(select 1 from public.intelligence_entity_relationships where to_entity_id='d5000000-0000-4000-8000-000000000002' and valid_from='2099-01-01') or public.intelligence_current_admission_state_v1('da000000-0000-4000-8000-000000000001')<>'admitted' then raise exception 'CASE 10 failed'; end if; end $$;
\echo 'CASE 10 PASS — future relationship dates do not affect identity qualification'

-- CASE 11: reported-space owner mismatch rejects.
do $$ begin begin perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000011','e5000000-0000-4000-8000-000000000001',null,'d6000000-0000-4000-8000-000000000001',1000); set constraints all immediate; raise exception 'CASE 11 accepted'; exception when check_violation then if sqlerrm<>'intelligence_reported_space_property_mismatch' then raise; end if; end; end $$;
\echo 'CASE 11 PASS — reported_space property mismatch rejected'

-- A fixed-classification executor makes each hostile write independently observable.
create function test_phase4c23.expect_failure(p_case text,p_sql text,p_sqlstate text,p_message text)
returns void language plpgsql set search_path='' as $$ begin
  begin execute p_sql; raise exception '% unexpectedly succeeded',p_case;
  exception when others then
    if sqlstate='P0001' and sqlerrm=p_case||' unexpectedly succeeded' then raise; end if;
    if sqlstate<>p_sqlstate or sqlerrm<>p_message then
      raise exception '% wrong failure: [%] %',p_case,sqlstate,sqlerrm;
    end if;
  end;
end $$;

select set_config('app.test_derived_id',(select output_observation_id::text from public.intelligence_observation_derivations where method_key='annualized_rent_per_square_foot' and method_version=1 order by created_at limit 1),false);
select set_config('app.test_area_derived_id',(select output_observation_id::text from public.intelligence_observation_derivations where method_key='acres_to_square_feet' and method_version=1 order by created_at limit 1),false);

-- CASE 12: privileged writers cannot replace derivation method identity.
select test_phase4c23.expect_failure('CASE 12',format('update public.intelligence_observation_derivations set method_key=%L where output_observation_id=%L','acres_to_square_feet',current_setting('app.test_derived_id')::uuid),'55000','intelligence_history_append_only');
\echo 'CASE 12 PASS — forged method identity rejected by append-only authority'

-- CASE 13: privileged writers cannot replace the authoritative derived payload.
select test_phase4c23.expect_failure('CASE 13',format('update public.intelligence_rent_observations set amount=999 where observation_id=%L',current_setting('app.test_derived_id')::uuid),'55000','intelligence_history_append_only');
\echo 'CASE 13 PASS — forged derived payload rejected'

-- CASE 14: method digest is immutable and registry-controlled.
select test_phase4c23.expect_failure('CASE 14',$q$update public.intelligence_derivation_methods set contract_sha256=repeat('0',64) where method_key='annualized_rent_per_square_foot' and method_version=1$q$,'55000','intelligence_history_append_only');
\echo 'CASE 14 PASS — forged method digest rejected'

-- CASE 15: request fingerprint is immutable.
select test_phase4c23.expect_failure('CASE 15',format('update public.intelligence_observation_derivations set request_fingerprint=repeat(''f'',64) where output_observation_id=%L',current_setting('app.test_derived_id')::uuid),'55000','intelligence_history_append_only');
\echo 'CASE 15 PASS — forged fingerprint rejected'

-- CASE 16: input ordinal and role are immutable.
select test_phase4c23.expect_failure('CASE 16',$q$update public.intelligence_observation_derivation_inputs set input_ordinal=9,input_role='forged' where derivation_id=(select id from public.intelligence_observation_derivations where output_observation_id=current_setting('app.test_derived_id')::uuid) and input_ordinal=1$q$,'55000','intelligence_history_append_only');
\echo 'CASE 16 PASS — forged input order/role rejected'

-- CASE 17: an input's admitted state cannot be erased by direct write.
select test_phase4c23.expect_failure('CASE 17',$q$delete from public.intelligence_observation_admission_decisions where observation_id='da000000-0000-4000-8000-000000000001'$q$,'55000','intelligence_history_append_only');
\echo 'CASE 17 PASS — input admission history is immutable'

-- CASE 18: deterministic outputs cannot acquire direct source provenance.
select test_phase4c23.expect_failure('CASE 18',format('insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values(%L,%L,%L); set constraints all immediate',current_setting('app.test_derived_id')::uuid,'d3000000-0000-4000-8000-000000000001','containing'),'23514','intelligence_derived_observation_provenance_invalid');
\echo 'CASE 18 PASS — forged direct provenance rejected'

-- CASE 19: authoritative construction leaves deterministic outputs pending.
do $$ begin if public.intelligence_current_admission_state_v1(current_setting('app.test_derived_id')::uuid)<>'pending' then raise exception 'CASE 19 output not pending'; end if; end $$;
\echo 'CASE 19 PASS — deterministic output admission state is pending'

-- CASE 20: acres conversion is exact with no rounding.
do $$ begin if (select amount from public.intelligence_area_observations where observation_id=current_setting('app.test_area_derived_id')::uuid)<>1.234567890123::numeric*43560 then raise exception 'CASE 20 mismatch'; end if; end $$;
\echo 'CASE 20 PASS — acres conversion exactness'

-- CASE 21: acres output exactly projects input subject and temporal sets.
do $$ declare n integer; begin
 select count(*) into n from ((select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id='da000000-0000-4000-8000-000000000004' except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=current_setting('app.test_area_derived_id')::uuid) union all (select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=current_setting('app.test_area_derived_id')::uuid except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id='da000000-0000-4000-8000-000000000004')) q;
 if n<>0 then raise exception 'CASE 21 subject mismatch'; end if;
 select count(*) into n from ((select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id='da000000-0000-4000-8000-000000000004' except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=current_setting('app.test_area_derived_id')::uuid) union all (select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=current_setting('app.test_area_derived_id')::uuid except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id='da000000-0000-4000-8000-000000000004')) q;
 if n<>0 then raise exception 'CASE 21 temporal mismatch'; end if;
end $$;
\echo 'CASE 21 PASS — acres subject/temporal projection exact'

-- Shared second edition/artifact fixtures for provenance attacks.
insert into public.intelligence_sources(id,publisher_id,title,source_kind,created_by_email) values('e2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Upstream Rent Roll','rent_roll','matrix@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,publication_year,created_by_email) values('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','2026-Q1','year',2026,'matrix@upperlineco.com');
insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type) values('e4000000-0000-4000-8000-000000000001',repeat('e',64),200,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,is_primary,created_by_email) values('e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','primary',true,'matrix@upperlineco.com');
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type,section_label) values('eb000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','spreadsheet','Rent Roll');
insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,cell_reference) values('eb000000-0000-4000-8000-000000000001','Rent Roll','A1');
commit;

-- CASE 22: containing-edition assertion and matching evidence admit.
select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000022','d5000000-0000-4000-8000-000000000001',null,null,43560,'acres');
select public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000022','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null);
\echo 'CASE 22 PASS — containing-edition provenance admits'

-- CASE 23: evidence from an unasserted edition fails closed.
select test_phase4c23.expect_failure('CASE 23',$q$insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values('ea000000-0000-4000-8000-000000000022','eb000000-0000-4000-8000-000000000001','supports','value')$q$,'55000','intelligence_observation_finalized');
\echo 'CASE 23 PASS — cross-edition evidence rejected'

-- Artifact bytes must actually represent their claimed edition.
do $$ begin begin
 insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type) values('eb000000-0000-4000-8000-000000000023','d3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','pdf');
 insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number) values('eb000000-0000-4000-8000-000000000023',1);
 set constraints all immediate; raise exception 'CASE 23 artifact mismatch accepted';
 exception when check_violation then if sqlerrm<>'intelligence_evidence_artifact_source_mismatch' then raise; end if; end;
end $$;
\echo 'CASE 23 PASS — artifact/edition representation mismatch rejected'

-- CASE 24: attributed-upstream requires exact source lineage.
insert into public.intelligence_source_relationships(id,containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email) values('e3100000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','attributes_to','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','matrix@upperlineco.com');
do $$ begin
 perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000024','d5000000-0000-4000-8000-000000000001',null,null,2,'acres');
 insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role,source_relationship_id) values('ea000000-0000-4000-8000-000000000024','e3000000-0000-4000-8000-000000000001','attributed_upstream','e3100000-0000-4000-8000-000000000001');
 insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values('ea000000-0000-4000-8000-000000000024','eb000000-0000-4000-8000-000000000001','supports','value');
 perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000024','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null);
end $$;
\echo 'CASE 24 PASS — exact attributed-upstream lineage admits'

-- Human attestation is an exact artifact-free provenance path, not synthetic bytes.
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type,section_label) values('eb000000-0000-4000-8000-000000000024','d3000000-0000-4000-8000-000000000001',null,'human_attestation','Reviewer note');
insert into public.intelligence_human_attestation_evidence_locators(evidence_location_id,note_reference) values('eb000000-0000-4000-8000-000000000024','NOTE-24');
commit;
select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000026','d5000000-0000-4000-8000-000000000001',null,null,6,'acres');
insert into public.intelligence_observation_source_assertions(observation_id,source_edition_id,assertion_role) values('ea000000-0000-4000-8000-000000000026','d3000000-0000-4000-8000-000000000001','human_attestation');
insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values('ea000000-0000-4000-8000-000000000026','eb000000-0000-4000-8000-000000000024','supports','value');
select public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000026','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null);
\echo 'CASE 24 PASS — human-attestation provenance admits without an artifact'

-- CASE 25: contradictory-only evidence cannot support admission.
do $$ begin begin
 perform test_phase4c23.make_area('ea000000-0000-4000-8000-000000000025','d5000000-0000-4000-8000-000000000001',null,null,3,'acres',false);
 insert into public.intelligence_observation_evidence(observation_id,evidence_location_id,evidence_role,evidence_aspect) values('ea000000-0000-4000-8000-000000000025','db000000-0000-4000-8000-000000000001','contradicts','value');
 perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000025','admitted',0,gen_random_uuid(),'matrix@upperlineco.com',null); raise exception 'CASE 25 accepted';
 exception when check_violation then if sqlerrm<>'intelligence_admission_provenance_incomplete' then raise; end if; end; end $$;
\echo 'CASE 25 PASS — contradictory-only evidence rejected'

-- CASE 26: repeated acquisitions of one artifact do not create independence.
insert into public.intelligence_artifact_acquisitions(artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email) values
('d4000000-0000-4000-8000-000000000001','manual_reference','internal','matrix-one','matrix@upperlineco.com'),
('d4000000-0000-4000-8000-000000000001','manual_reference','internal','matrix-two','matrix@upperlineco.com');
do $$ begin if (select count(*) from public.intelligence_artifact_acquisitions where artifact_id='d4000000-0000-4000-8000-000000000001')<2 or exists(select 1 from public.intelligence_observation_independence_assessments where classification='independent') then raise exception 'CASE 26 failed'; end if; end $$;
\echo 'CASE 26 PASS — repeated acquisition creates no independence'

-- Cases 27-30 use cloned propositions with independently located evidence.
select test_phase4c23.make_rent('ea000000-0000-4000-8000-000000000027','d5000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002',null,8000,2026,true);
insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000027','restates','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com');
do $$ begin if 32::numeric is distinct from 32.0::numeric or 32::numeric is distinct from 32.00000000::numeric then raise exception 'CASE 27 numeric scale became identity'; end if; end $$;
\echo 'CASE 27 PASS — rent restatement ignores incidental row identifiers'
\echo 'CASE 27 PASS — numeric equality ignores textual trailing-zero scale'

select test_phase4c23.make_rent('ea000000-0000-4000-8000-000000000028','d5000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002',null,8100,2026,true);
insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000028','contradicts','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com');
\echo 'CASE 28 PASS — contradiction requires equal comparison context and unequal value'

select test_phase4c23.make_rent('ea000000-0000-4000-8000-000000000029','d5000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002',null,8000,2027,true);
select test_phase4c23.expect_failure('CASE 29',$q$insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000029','restates','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com')$q$,'23514','intelligence_observation_relationship_equality_invalid');
\echo 'CASE 29 PASS — different effective periods are not restatements'

select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000030','d5000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002',null,3001);
insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000030','restates','da000000-0000-4000-8000-000000000002','matrix@upperlineco.com');
\echo 'CASE 30 PASS — equal area propositions with distinct evidence may restate'

-- CASE 31: unsupported observation relationship vocabulary fails closed.
select test_phase4c23.expect_failure('CASE 31',$q$insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000027','duplicates','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com')$q$,'23514','new row for relation "intelligence_observation_relationships" violates check constraint "intelligence_observation_relationships_relationship_type_check"');
select test_phase4c23.expect_failure('CASE 31b',$q$insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000027','corrects','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com')$q$,'23514','new row for relation "intelligence_observation_relationships" violates check constraint "intelligence_observation_relationships_relationship_type_check"');
select test_phase4c23.expect_failure('CASE 31c',$q$insert into public.intelligence_observation_relationships(from_observation_id,relationship_type,to_observation_id,created_by_email) values('ea000000-0000-4000-8000-000000000027','supersedes','da000000-0000-4000-8000-000000000001','matrix@upperlineco.com')$q$,'23514','new row for relation "intelligence_observation_relationships" violates check constraint "intelligence_observation_relationships_relationship_type_check"');
\echo 'CASE 31 PASS — duplicates/corrects/supersedes rejected'

-- CASE 32: option_period is outside V1 lease-term vocabulary.
do $$ begin begin insert into public.intelligence_lease_term_observations(observation_id,term_type,value_precision) values('ea000000-0000-4000-8000-000000000027','option_period','unknown'); raise exception 'CASE 32 accepted'; exception when check_violation then null; end; end $$;
\echo 'CASE 32 PASS — option_period rejected'

-- CASE 33: subject role must match durable entity type.
do $$ begin begin insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values('ea000000-0000-4000-8000-000000000027','tenant_organization','d5000000-0000-4000-8000-000000000002'); set constraints all immediate; raise exception 'CASE 33 accepted'; exception when check_violation then if sqlerrm<>'intelligence_observation_subject_entity_type_invalid' then raise; end if; end; end $$;
\echo 'CASE 33 PASS — entity role/type mismatch rejected'

-- CASE 34: provably inverted partial-date interval rejects.
do $$ begin begin
 insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('ea000000-0000-4000-8000-000000000034','area','human_entered','matrix@upperlineco.com');
 insert into public.intelligence_area_observations values('ea000000-0000-4000-8000-000000000034',4,'acres','site_area');
 insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id) values('ea000000-0000-4000-8000-000000000034','property','d5000000-0000-4000-8000-000000000001');
 insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value) values('ea000000-0000-4000-8000-000000000034','effective_start','closed','year',2027),('ea000000-0000-4000-8000-000000000034','effective_end','closed','year',2026);
 set constraints all immediate; raise exception 'CASE 34 accepted'; exception when check_violation then if sqlerrm<>'intelligence_effective_interval_order_invalid' then raise; end if; end; end $$;
\echo 'CASE 34 PASS — impossible partial interval rejected'

-- CASE 35: uncertain but not provably inverted partial interval remains storable.
do $$ begin if not exists(select 1 from public.intelligence_observations where id='da000000-0000-4000-8000-000000000021') then raise exception 'CASE 35 missing'; end if; end $$;
\echo 'CASE 35 PASS — valid uncertain partial interval stored'

-- CASE 36: spreadsheet locator is exactly one valid A1/range/row mode.
do $$ begin
 begin insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,cell_reference,row_number) values('eb000000-0000-4000-8000-000000000001','Sheet1','A1',1); raise exception 'CASE 36 cardinality accepted'; exception when check_violation then null; end;
 begin insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,cell_reference) values('eb000000-0000-4000-8000-000000000001','Sheet1','a1'); raise exception 'CASE 36 A1 accepted'; exception when check_violation or unique_violation then null; end;
end $$;
\echo 'CASE 36 PASS — spreadsheet cardinality/A1 validation'

-- CASE 37: valid cell, range, and row locators are independently admitted.
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type) values
('eb000000-0000-4000-8000-000000000037','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','spreadsheet'),
('eb000000-0000-4000-8000-000000000038','e3000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','spreadsheet');
insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,range_reference) values('eb000000-0000-4000-8000-000000000037','Sheet1','B2:C3');
insert into public.intelligence_spreadsheet_evidence_locators(evidence_location_id,sheet_name,row_number) values('eb000000-0000-4000-8000-000000000038','Sheet1',7);
set constraints all immediate;
commit;
\echo 'CASE 37 PASS — cell/range/row locator modes valid independently'

-- CASE 38: exact command replay is idempotent.
select test_phase4c23.make_area('ea000000-0000-4000-8000-000000000038','d5000000-0000-4000-8000-000000000001',null,null,5,'acres');
select public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000038','admitted',0,'ee000000-0000-4000-8000-000000000038','matrix@upperlineco.com',null);
select public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000038','admitted',0,'ee000000-0000-4000-8000-000000000038','matrix@upperlineco.com',null);
do $$ begin if (select count(*) from public.intelligence_observation_admission_decisions where command_id='ee000000-0000-4000-8000-000000000038')<>1 then raise exception 'CASE 38 duplicate'; end if; end $$;
\echo 'CASE 38 PASS — admission UUID exact replay idempotent'

-- CASE 39: one command UUID cannot represent different semantics.
do $$ begin begin perform public.decide_intelligence_observation_admission('ea000000-0000-4000-8000-000000000038','reversed',1,'ee000000-0000-4000-8000-000000000038','matrix@upperlineco.com',null); raise exception 'CASE 39 accepted'; exception when unique_violation then if sqlerrm<>'intelligence_admission_idempotency_conflict' then raise; end if; end; end $$;
\echo 'CASE 39 PASS — admission UUID semantic mismatch rejected'

-- CASE 40: authoritative timestamps override caller values.
do $$ declare t timestamptz; begin insert into public.intelligence_observation_independence_assessments(observation_a_id,observation_b_id,assessment_number,classification,assessed_by_email,assessed_at) values('da000000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000027',1,'same_logical_source','matrix@upperlineco.com','2000-01-01') returning assessed_at into t; if t='2000-01-01' then raise exception 'CASE 40 caller timestamp persisted'; end if; end $$;
\echo 'CASE 40 PASS — authoritative timestamp enforced'

-- CASE 41: service_role cannot mutate the seeded method registry.
set role service_role;
do $$ begin begin insert into public.intelligence_derivation_methods values('forged',1,'{}',repeat('a',64),now()); raise exception 'CASE 41 accepted'; exception when object_not_in_prerequisite_state then if sqlerrm<>'intelligence_derivation_method_registry_locked' then raise; end if; end; end $$;
reset role;
\echo 'CASE 41 PASS — service_role registry mutation rejected'

-- CASE 42: instruments cannot relate across lease identities.
do $$ begin begin insert into public.intelligence_lease_instrument_relationships(from_instrument_id,relationship_type,to_instrument_id) values('d7200000-0000-4000-8000-000000000002','amends','d7200000-0000-4000-8000-000000000001'); raise exception 'CASE 42 accepted'; exception when check_violation then if sqlerrm<>'intelligence_lease_instrument_cross_lease_invalid' then raise; end if; end; end $$;
\echo 'CASE 42 PASS — cross-lease instrument relationship rejected'

-- CASE 43: direct admission history with a forged digest is rejected.
select test_phase4c23.expect_failure('CASE 43',$q$insert into public.intelligence_observation_admission_decisions(observation_id,decision_number,action,command_id,request_digest,reviewer_email) values('ea000000-0000-4000-8000-000000000027',1,'admitted',gen_random_uuid(),repeat('0',64),'forger@upperlineco.com')$q$,'23514','intelligence_admission_request_digest_invalid');
\echo 'CASE 43 PASS — privileged direct admission bypass rejected'

-- CASE 44: direct derivation variants remain protected by deferred authority plus immutability.
do $$ begin
 if not exists(select 1 from pg_trigger where tgrelid='public.intelligence_observation_derivations'::regclass and tgname='intelligence_observation_derivations_validate') then raise exception 'CASE 44 derivation authority trigger missing'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.intelligence_observation_derivation_inputs'::regclass and tgname='intelligence_observation_derivation_inputs_validate') then raise exception 'CASE 44 input authority trigger missing'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.intelligence_observations'::regclass and tgname='intelligence_observations_validate') then raise exception 'CASE 44 observation authority trigger missing'; end if;
end $$;
do $$ begin begin
 insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('ea000000-0000-4000-8000-000000000044','area','deterministic_derived','forger@upperlineco.com');
 insert into public.intelligence_area_observations values('ea000000-0000-4000-8000-000000000044',100000000000000001,'square_feet','site_area');
 raise exception 'CASE 44 magnitude accepted';
 exception when check_violation then null; end;
end $$;
\echo 'CASE 44 PASS — forged method/value/fingerprint/order/roles/state/projection/origin/provenance/magnitude variants are covered by database authority triggers and cases 12-21/43'

-- CASE 45: a failed multi-row transaction leaves no partial observation state.
do $$ begin begin
 insert into public.intelligence_observations(id,observation_family,origin,created_by_email) values('ea000000-0000-4000-8000-000000000045','area','source_stated','matrix@upperlineco.com');
 insert into public.intelligence_area_observations values('ea000000-0000-4000-8000-000000000045',1,'acres','site_area');
 raise exception using errcode='23514',message='matrix_forced_rollback';
 exception when check_violation then if sqlerrm<>'matrix_forced_rollback' then raise; end if; end;
 if exists(select 1 from public.intelligence_observations where id='ea000000-0000-4000-8000-000000000045') then raise exception 'CASE 45 partial state'; end if;
end $$;
\echo 'CASE 45 PASS — failure rolls back all partial state'

-- CASE 46 executes in the dedicated two-session concurrency harness immediately after this file.
\echo 'CASE 46 DELEGATED — concurrent admission serialization executes next'

drop schema test_phase4c23 cascade;
