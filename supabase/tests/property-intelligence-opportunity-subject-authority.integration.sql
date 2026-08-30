\set ON_ERROR_STOP on
insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email) values
('71000000-0000-4000-8000-000000000001','Mason fixture','fixture@upperlineco.com','fixture@upperlineco.com'),
('71000000-0000-4000-8000-000000000002','Reuse fixture','fixture@upperlineco.com','fixture@upperlineco.com'),
('71000000-0000-4000-8000-000000000003','Reject fixture','fixture@upperlineco.com','fixture@upperlineco.com'),
('71000000-0000-4000-8000-000000000004','Ambiguous fixture','fixture@upperlineco.com','fixture@upperlineco.com');

set role service_role;
select * from public.resolve_intelligence_opportunity_primary_target_v1(
 '72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','confirm','new_property',null,
 'NW Corner of Mason Rd. @ Mason Manor Dr.','[{"aliasType":"property_name","aliasValue":"Mason Rd / Mason Manor Dr"}]',null,'reviewer@upperlineco.com');

do $$declare e uuid; s uuid;begin
 select entity_id,id into e,s from public.intelligence_opportunity_subjects where opportunity_id='71000000-0000-4000-8000-000000000001' and relationship_status='confirmed';
 if e is null or s is null then raise exception 'confirmed subject missing';end if;
 if not exists(select 1 from public.intelligence_entities where id=e and entity_type='property_site' and display_name='NW Corner of Mason Rd. @ Mason Manor Dr.') then raise exception 'entity mismatch';end if;
 if not exists(select 1 from public.intelligence_property_sites where entity_id=e and development_state='unknown') then raise exception 'typed site missing';end if;
 if not exists(select 1 from public.intelligence_entity_aliases where entity_id=e and alias_type='property_name' and alias_value='Mason Rd / Mason Manor Dr') then raise exception 'reviewed alias missing';end if;
 if (select count(*) from public.intelligence_opportunity_subject_commands)<>1 or (select count(*) from public.intelligence_opportunity_subject_proposals)<>1 or (select count(*) from public.intelligence_opportunity_subject_decisions)<>1 then raise exception 'authority history mismatch';end if;
end$$;

-- Identical replay returns the original authority without duplicates.
select * from public.resolve_intelligence_opportunity_primary_target_v1(
 '72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','confirm','new_property',null,
 'NW Corner of Mason Rd. @ Mason Manor Dr.','[{"aliasType":"property_name","aliasValue":"Mason Rd / Mason Manor Dr"}]',null,'reviewer@upperlineco.com');
do $$begin if (select count(*) from public.intelligence_entities)<>1 then raise exception 'replay duplicated entity';end if;end$$;

do $$begin
 perform * from public.resolve_intelligence_opportunity_primary_target_v1('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','confirm','new_property',null,'Changed semantics','[]',null,'reviewer@upperlineco.com');
 raise exception 'changed replay accepted';exception when check_violation then if sqlerrm<>'intelligence_opportunity_subject_command_semantics_conflict' then raise;end if;end$$;

-- Reuse the exact durable Property for another Opportunity; create no duplicate.
select * from public.resolve_intelligence_opportunity_primary_target_v1(
 '72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','confirm','existing_property',
 (select id from public.intelligence_entities limit 1),null,'[]',null,'reviewer@upperlineco.com');
do $$begin if (select count(*) from public.intelligence_entities)<>1 or (select count(*) from public.intelligence_opportunity_subjects where relationship_status='confirmed')<>2 then raise exception 'explicit reuse failed';end if;end$$;

-- Explicit correction reverses old materialization and appends a new authority episode.
select * from public.resolve_intelligence_opportunity_primary_target_v1(
 '72000000-0000-4000-8000-000000000006','71000000-0000-4000-8000-000000000002','confirm','new_property',null,
 'Reviewed replacement Property','[]',
 (select authority_proposal_id from public.intelligence_opportunity_subjects where opportunity_id='71000000-0000-4000-8000-000000000002' and relationship_status='confirmed'),
 'reviewer@upperlineco.com');
do $$begin
 if (select count(*) from public.intelligence_opportunity_subjects where opportunity_id='71000000-0000-4000-8000-000000000002' and relationship_status='confirmed')<>1 then raise exception 'correction current authority mismatch';end if;
 if (select count(*) from public.intelligence_opportunity_subjects where opportunity_id='71000000-0000-4000-8000-000000000002' and relationship_status='reversed')<>1 then raise exception 'correction history missing';end if;
 if not exists(select 1 from public.intelligence_opportunity_subject_decisions where decision='reversed' and command_id='72000000-0000-4000-8000-000000000006') then raise exception 'reversal decision missing';end if;
end$$;

-- Rejection and ambiguity preserve history but create no Property authority.
select * from public.resolve_intelligence_opportunity_primary_target_v1('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000003','reject','new_property',null,'Rejected Property','[]',null,'reviewer@upperlineco.com');
select * from public.resolve_intelligence_opportunity_primary_target_v1('72000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000004','ambiguous','new_property',null,'Ambiguous Property','[]',null,'reviewer@upperlineco.com');
do $$begin if (select count(*) from public.intelligence_entities)<>2 or exists(select 1 from public.intelligence_opportunity_subjects where opportunity_id in('71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004')) then raise exception 'non-confirming judgment materialized authority';end if;end$$;

-- A finalized rejected proposal cannot be illicitly confirmed by direct history insertion.
do $$declare p uuid;begin select id into p from public.intelligence_opportunity_subject_proposals where opportunity_id='71000000-0000-4000-8000-000000000003';insert into public.intelligence_opportunity_subject_decisions(id,proposal_id,decision_number,expected_decision_number,decision,command_id,reviewer_email,materialized_entity_id,materialized_subject_id)values(gen_random_uuid(),p,2,1,'confirmed','72000000-0000-4000-8000-000000000003','reviewer@upperlineco.com',gen_random_uuid(),gen_random_uuid());raise exception 'rejected proposal refinalized';exception when insufficient_privilege then null;end$$;
reset role;

-- Non-Property reuse fails closed and leaves no command/proposal.
insert into public.intelligence_entities(id,entity_type,display_name,created_by_email) values('73000000-0000-4000-8000-000000000001','organization','Not a Property','fixture@upperlineco.com');
set role service_role;
do $$begin perform * from public.resolve_intelligence_opportunity_primary_target_v1('72000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000003','confirm','existing_property','73000000-0000-4000-8000-000000000001',null,'[]',null,'reviewer@upperlineco.com');raise exception 'non-property accepted';exception when check_violation then null;end$$;
do $$begin if exists(select 1 from public.intelligence_opportunity_subject_commands where command_id='72000000-0000-4000-8000-000000000005') then raise exception 'failed transaction leaked command';end if;end$$;

-- Direct mutation and truncation are denied at the privilege layer.
do $$begin update public.intelligence_opportunity_subjects set relationship_status='reversed' where opportunity_id='71000000-0000-4000-8000-000000000001';raise exception 'direct update allowed';exception when insufficient_privilege then null;end$$;
do $$begin delete from public.intelligence_opportunity_subject_decisions;raise exception 'direct delete allowed';exception when insufficient_privilege then null;end$$;
do $$begin execute 'truncate public.intelligence_opportunity_subject_commands';raise exception 'truncate allowed';exception when insufficient_privilege then null;when object_not_in_prerequisite_state then null;end$$;
do $$begin insert into public.intelligence_opportunity_subject_commands(command_id,operation_kind,contract_version,opportunity_id,canonical_request,request_digest,created_by_email)values(gen_random_uuid(),'resolve_primary_target','property-intelligence-opportunity-subject-v1','71000000-0000-4000-8000-000000000001','{}',repeat('a',64),'attacker@upperlineco.com');raise exception 'direct insert allowed';exception when insufficient_privilege then null;end$$;
reset role;

do $$begin
 if has_table_privilege('anon','public.intelligence_opportunity_subject_commands','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('authenticated','public.intelligence_opportunity_subject_proposals','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'browser privilege leak';end if;
 if not has_table_privilege('service_role','public.intelligence_opportunity_subject_decisions','SELECT') or has_table_privilege('service_role','public.intelligence_opportunity_subject_decisions','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'service role privilege mismatch';end if;
end$$;

-- No Property observation is created by subject resolution.
do $$begin if (select count(*) from public.intelligence_observations)<>0 then raise exception 'observation created';end if;end$$;
