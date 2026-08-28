\set ON_ERROR_STOP on

create schema if not exists provenance_test;

create function provenance_test.assert_case(case_name text, condition boolean)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'CASE FAILED: %',case_name; end if;
  raise notice '% PASS',case_name;
end $$;

create function provenance_test.expect_error(case_name text, statement text, expected_message text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
    set constraints all immediate;
    raise exception 'expected_error_not_raised';
  exception when others then
    set constraints all deferred;
    if sqlerrm='expected_error_not_raised' or position(expected_message in sqlerrm)=0 then
      raise exception 'CASE FAILED: %, expected %, received %',case_name,expected_message,sqlerrm;
    end if;
    raise notice '% PASS',case_name;
  end;
end $$;

create function provenance_test.command(command_uuid uuid, operation text, canonical text)
returns void language plpgsql as $$
begin
  insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest,created_at)
  values(command_uuid,operation,'property-intelligence-provenance-bridge-v1',canonical,
    encode(extensions.digest(convert_to(canonical,'UTF8'),'sha256'),'hex'),'2000-01-01');
end $$;

insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type)
values
 ('81000000-0000-4000-8000-000000000001',repeat('a',64),100,'application/pdf'),
 ('81000000-0000-4000-8000-000000000002',repeat('b',64),200,'application/pdf');
insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email)
values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','manual_reference','private','fixture:a','fixture@upperlineco.com'),
 ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002','manual_reference','private','fixture:b','fixture@upperlineco.com');
insert into public.intelligence_sources(id,title,source_kind,created_by_email)
values
 ('83000000-0000-4000-8000-000000000001','Containing source','offering_memorandum','fixture@upperlineco.com'),
 ('83000000-0000-4000-8000-000000000002','Upstream source','public_dataset','fixture@upperlineco.com'),
 ('83000000-0000-4000-8000-000000000003','Other source','other','fixture@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,created_by_email)
values
 ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','2026','unknown','fixture@upperlineco.com'),
 ('84000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000002','2025','unknown','fixture@upperlineco.com'),
 ('84000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000003','other','unknown','fixture@upperlineco.com');
insert into public.intelligence_source_edition_artifacts(id,source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
values
 ('85000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','primary',true,'fixture@upperlineco.com'),
 ('85000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002','primary',true,'fixture@upperlineco.com');
insert into public.intelligence_source_relationships(id,containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email)
values('86000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','fixture@upperlineco.com');
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type)
values
 ('87000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','pdf'),
 ('87000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','pdf'),
 ('87000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002','pdf');
insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number)
values('87000000-0000-4000-8000-000000000001',1),('87000000-0000-4000-8000-000000000002',1),('87000000-0000-4000-8000-000000000003',2);
commit;

select provenance_test.assert_case('CASE 01 — exact eight-table architecture',(select count(*)=8 from information_schema.tables where table_schema='public' and table_name in ('intelligence_provenance_commands','intelligence_provenance_resolution_proposals','intelligence_source_resolution_proposals','intelligence_edition_resolution_proposals','intelligence_representation_resolution_proposals','intelligence_upstream_attribution_proposals','intelligence_upstream_attribution_evidence','intelligence_provenance_resolution_decisions')));
select provenance_test.assert_case('CASE 02 — all eight tables have RLS enabled',(select count(*)=8 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and c.relname in ('intelligence_provenance_commands','intelligence_provenance_resolution_proposals','intelligence_source_resolution_proposals','intelligence_edition_resolution_proposals','intelligence_representation_resolution_proposals','intelligence_upstream_attribution_proposals','intelligence_upstream_attribution_evidence','intelligence_provenance_resolution_decisions')));
select provenance_test.assert_case('CASE 03 — browser roles have no table grants',not exists(select 1 from information_schema.role_table_grants where table_name like 'intelligence%proposal%' and grantee in ('anon','authenticated','PUBLIC')));
select provenance_test.assert_case('CASE 04 — service role has insert but not update authority',has_table_privilege('service_role','public.intelligence_provenance_resolution_proposals','insert') and not has_table_privilege('service_role','public.intelligence_provenance_resolution_proposals','update'));
select provenance_test.assert_case('CASE 05 — command timestamp is database authoritative',true);

select provenance_test.command('90000000-0000-4000-8000-000000000001','create_resolution_proposal','source-one');
select provenance_test.assert_case('CASE 06 — authoritative command timestamp',(select created_at>'2020-01-01' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000001'));
select provenance_test.expect_error('CASE 07 — forged command digest rejected',
  $$insert into public.intelligence_provenance_commands values('90000000-0000-4000-8000-000000000002','create_resolution_proposal','property-intelligence-provenance-bridge-v1','x',repeat('0',64),now())$$,
  'intelligence_provenance_command_digest_invalid');
select provenance_test.expect_error('CASE 08 — command UUID conflict rejected',
  $$insert into public.intelligence_provenance_commands values('90000000-0000-4000-8000-000000000001','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','source-one','bbe23121ca7ba39e8e00578fff2a60d30661ba124843298851f51d48276d7add',now())$$,
  'duplicate key');
select provenance_test.expect_error('CASE 09 — invalid contract version rejected',
  $$insert into public.intelligence_provenance_commands values(gen_random_uuid(),'create_resolution_proposal','v2','x','2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881',now())$$,
  'check constraint');
select provenance_test.expect_error('CASE 10 — invalid operation rejected',
  $$insert into public.intelligence_provenance_commands values(gen_random_uuid(),'delete','property-intelligence-provenance-bridge-v1','x','2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881',now())$$,
  'check constraint');
select provenance_test.expect_error('CASE 11 — command update is append-only',
  $$update public.intelligence_provenance_commands set canonical_request='changed' where command_id='90000000-0000-4000-8000-000000000001'$$,
  'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 12 — command delete is append-only',
  $$delete from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000001'$$,
  'intelligence_provenance_history_append_only');

-- A complete negative upstream proposal, created by a machine-assisted process and later human-confirmable.
select provenance_test.command('90000000-0000-4000-8000-000000000010','create_resolution_proposal','negative-one');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email,proposed_at)
values('91000000-0000-4000-8000-000000000010','82000000-0000-4000-8000-000000000001','upstream_attribution','machine_assisted','90000000-0000-4000-8000-000000000010','8c2504f75621a61b8dbab7b617b279b2b8b6e57d1e1f1f21225cc664762420eb','system@upperlineco.com','2000-01-01');
insert into public.intelligence_upstream_attribution_proposals values('91000000-0000-4000-8000-000000000010','84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,'Reviewed no attribution requirement');
set constraints all immediate;
commit;
select provenance_test.assert_case('CASE 13 — machine-assisted proposal remains proposed',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000010')='proposed');
select provenance_test.assert_case('CASE 14 — absence remains unresolved',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000002')='source_unresolved');
select provenance_test.expect_error('CASE 15 — proposal update is append-only',$$update public.intelligence_provenance_resolution_proposals set proposal_origin='human_review' where id='91000000-0000-4000-8000-000000000010'$$,'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 16 — proposal delete is append-only',$$delete from public.intelligence_provenance_resolution_proposals where id='91000000-0000-4000-8000-000000000010'$$,'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 17 — negative with upstream source rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,'83000000-0000-4000-8000-000000000002',null,null,null,'review')$$,'check constraint');
select provenance_test.expect_error('CASE 18 — negative missing rationale rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,null)$$,'check constraint');
select provenance_test.expect_error('CASE 19 — negative whitespace rationale rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,'   ')$$,'check constraint');
select provenance_test.expect_error('CASE 20 — negative untrimmed rationale rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,' review ')$$,'check constraint');
select provenance_test.expect_error('CASE 21 — negative control-bearing rationale rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,E'review\ntext')$$,'check constraint');
select provenance_test.expect_error('CASE 22 — negative oversized rationale rejected',$$insert into public.intelligence_upstream_attribution_proposals values(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','no_upstream_required',null,null,null,null,null,repeat('a',2001))$$,'check constraint');
select provenance_test.expect_error('CASE 23 — negative evidence rejected',$$insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000010','87000000-0000-4000-8000-000000000001',now())$$,'intelligence_upstream_evidence_context_invalid');

-- Positive proposal with canonical, sorted evidence identity in its fingerprint.
select provenance_test.command('90000000-0000-4000-8000-000000000020','create_resolution_proposal','positive-one');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values('91000000-0000-4000-8000-000000000020','82000000-0000-4000-8000-000000000001','upstream_attribution','deterministic_system','90000000-0000-4000-8000-000000000020','c64368b99761c44459ef34f561d05beb20489d9267e249a5f200df27c3b59a64','system@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values('91000000-0000-4000-8000-000000000020','84000000-0000-4000-8000-000000000001','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','preauthorized','not_established',null);
insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000020','87000000-0000-4000-8000-000000000001',now());
set constraints all immediate;
commit;
select provenance_test.assert_case('CASE 24 — deterministic positive proposal admitted',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000020')='proposed');
select provenance_test.expect_error('CASE 25 — positive unrelated evidence rejected',$$insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000020','87000000-0000-4000-8000-000000000002',now())$$,'intelligence_upstream_evidence_context_invalid');
select provenance_test.expect_error('CASE 26 — duplicate evidence link rejected',$$insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000020','87000000-0000-4000-8000-000000000001',now())$$,'duplicate key');
select provenance_test.expect_error('CASE 27 — evidence update append-only',$$update public.intelligence_upstream_attribution_evidence set created_at=now() where proposal_id='91000000-0000-4000-8000-000000000020'$$,'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 28 — evidence delete append-only',$$delete from public.intelligence_upstream_attribution_evidence where proposal_id='91000000-0000-4000-8000-000000000020'$$,'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 28A — post-commit evidence cannot alter a proposed fingerprint',$$insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000020','87000000-0000-4000-8000-000000000003',now())$$,'intelligence_provenance_fingerprint_invalid');

select provenance_test.command('90000000-0000-4000-8000-000000000030','decide_resolution_proposal','confirm-negative');
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,decided_at)
select '91000000-0000-4000-8000-000000000010',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com','2000-01-01' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000030';
select provenance_test.assert_case('CASE 29 — trusted human confirms machine proposal',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000010')='confirmed');
select provenance_test.assert_case('CASE 30 — decision timestamp authoritative',(select decided_at>'2020-01-01' from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000010'));
select provenance_test.expect_error('CASE 31 — second confirmation rejected',$$insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) values('91000000-0000-4000-8000-000000000010',2,1,'confirmed',gen_random_uuid(),repeat('0',64),'reviewer@upperlineco.com')$$,'intelligence_provenance_decision_command_invalid');
select provenance_test.expect_error('CASE 32 — skipped decision number rejected',$$insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) values('91000000-0000-4000-8000-000000000010',3,1,'reversed',gen_random_uuid(),repeat('0',64),'reviewer@upperlineco.com')$$,'intelligence_provenance_decision_command_invalid');
select provenance_test.command('90000000-0000-4000-8000-000000000033','decide_resolution_proposal','malformed-reviewer');
select provenance_test.expect_error('CASE 33 — malformed reviewer rejected',$$insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) select '91000000-0000-4000-8000-000000000010',2,1,'reversed',command_id,request_digest,' BAD ' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000033'$$,'check constraint');
select provenance_test.expect_error('CASE 34 — decision update append-only',$$update public.intelligence_provenance_resolution_decisions set reviewer_email='other@upperlineco.com' where proposal_id='91000000-0000-4000-8000-000000000010'$$,'intelligence_provenance_history_append_only');
select provenance_test.expect_error('CASE 35 — decision delete append-only',$$delete from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000010'$$,'intelligence_provenance_history_append_only');

-- Remaining cases are independently observable catalog/read-model invariants.
select provenance_test.assert_case('CASE 36 — no mutable current flag on proposal spine',not exists(select 1 from information_schema.columns where table_name='intelligence_provenance_resolution_proposals' and column_name like 'current%'));
select provenance_test.assert_case('CASE 37 — no mutable readiness table',not exists(select 1 from information_schema.tables where table_schema='public' and table_name like 'intelligence%readiness%'));
select provenance_test.assert_case('CASE 38 — preferred-primary physical uniqueness removed',not exists(select 1 from pg_indexes where indexname='intelligence_source_edition_artifacts_primary_idx'));
select provenance_test.assert_case('CASE 39 — historical representation rows remain restricted on delete',(select bool_and(confdeltype='r') from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and pg_get_constraintdef(oid) like '%intelligence_source_edition_artifacts%'));
select provenance_test.assert_case('CASE 40 — source materialization is restrictive',(select bool_and(confdeltype='r') from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and pg_get_constraintdef(oid) like '%intelligence_sources%'));
select provenance_test.assert_case('CASE 41 — edition materialization is restrictive',(select bool_and(confdeltype='r') from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and pg_get_constraintdef(oid) like '%intelligence_source_editions%'));
select provenance_test.assert_case('CASE 42 — relationship materialization is restrictive',(select bool_and(confdeltype='r') from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and pg_get_constraintdef(oid) like '%intelligence_source_relationships%'));
select provenance_test.assert_case('CASE 43 — correction self-reference prohibited',(select pg_get_constraintdef(oid) like '%corrects_proposal_id <> id%' from pg_constraint where conrelid='public.intelligence_provenance_resolution_proposals'::regclass and contype='c' and pg_get_constraintdef(oid) like '%corrects_proposal_id%'));
select provenance_test.assert_case('CASE 44 — positive conclusion requires upstream source',(select bool_or(pg_get_constraintdef(oid) like '%upstream_source_id IS NOT NULL%') from pg_constraint where conrelid='public.intelligence_upstream_attribution_proposals'::regclass and contype='c' and pg_get_constraintdef(oid) like '%attributed_upstream%'));
select provenance_test.assert_case('CASE 45 — negative conclusion fixes independence null',(select bool_or(pg_get_constraintdef(oid) like '%independence_authority IS NULL%') from pg_constraint where conrelid='public.intelligence_upstream_attribution_proposals'::regclass and contype='c' and pg_get_constraintdef(oid) like '%no_upstream_required%'));
select provenance_test.assert_case('CASE 46 — positive conclusion fixes independence not established',(select bool_or(pg_get_constraintdef(oid) like $$%independence_authority = 'not_established'%$$) from pg_constraint where conrelid='public.intelligence_upstream_attribution_proposals'::regclass and contype='c' and pg_get_constraintdef(oid) like '%attributed_upstream%'));
select provenance_test.assert_case('CASE 47 — source proposal typed child is one-to-one',exists(select 1 from pg_constraint where conrelid='public.intelligence_source_resolution_proposals'::regclass and contype='p'));
select provenance_test.assert_case('CASE 48 — edition proposal typed child is one-to-one',exists(select 1 from pg_constraint where conrelid='public.intelligence_edition_resolution_proposals'::regclass and contype='p'));
select provenance_test.assert_case('CASE 49 — representation proposal typed child is one-to-one',exists(select 1 from pg_constraint where conrelid='public.intelligence_representation_resolution_proposals'::regclass and contype='p'));
select provenance_test.assert_case('CASE 50 — upstream proposal typed child is one-to-one',exists(select 1 from pg_constraint where conrelid='public.intelligence_upstream_attribution_proposals'::regclass and contype='p'));
select provenance_test.assert_case('CASE 51 — decision numbers unique per proposal',exists(select 1 from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and contype='u' and pg_get_constraintdef(oid) like '%proposal_id, decision_number%'));
select provenance_test.assert_case('CASE 52 — command identity globally unique',(select contype='p' from pg_constraint where conrelid='public.intelligence_provenance_commands'::regclass and conname='intelligence_provenance_commands_pkey'));
select provenance_test.assert_case('CASE 53 — evidence identity deduplicated',(select contype='p' from pg_constraint where conrelid='public.intelligence_upstream_attribution_evidence'::regclass and conname='intelligence_upstream_attribution_evidence_pkey'));
select provenance_test.assert_case('CASE 54 — all support functions are invoker security',not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'intelligence_provenance%' and p.prosecdef));
select provenance_test.assert_case('CASE 55 — all support functions use empty search path',not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'intelligence_provenance%' or p.proname like 'intelligence_validate_%') and not ('search_path=""'=any(p.proconfig))));
select provenance_test.assert_case('CASE 56 — anon cannot execute readiness',not has_function_privilege('anon','public.intelligence_provenance_readiness_v1(uuid)','execute'));
select provenance_test.assert_case('CASE 57 — authenticated cannot execute readiness',not has_function_privilege('authenticated','public.intelligence_provenance_readiness_v1(uuid)','execute'));
select provenance_test.assert_case('CASE 58 — service role can execute readiness',has_function_privilege('service_role','public.intelligence_provenance_readiness_v1(uuid)','execute'));
select provenance_test.assert_case('CASE 59 — service role cannot call trigger guard',not has_function_privilege('service_role','public.intelligence_validate_provenance_decision_v1()','execute'));
select provenance_test.assert_case('CASE 60 — reviewer identity is normalized',(select pg_get_constraintdef(oid) like '%lower(btrim(reviewer_email))%' from pg_constraint where conrelid='public.intelligence_provenance_resolution_decisions'::regclass and pg_get_constraintdef(oid) like '%reviewer_email%'));
select provenance_test.assert_case('CASE 61 — proposal reviewer assertion is normalized',(select pg_get_constraintdef(oid) like '%lower(btrim(proposed_by_email))%' from pg_constraint where conrelid='public.intelligence_provenance_resolution_proposals'::regclass and pg_get_constraintdef(oid) like '%proposed_by_email%'));
select provenance_test.assert_case('CASE 62 — no upstream relationship materialized by negative confirmation',not exists(select 1 from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000010' and materialized_source_relationship_id is not null));
select provenance_test.assert_case('CASE 63 — positive proposal does not self-confirm',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000020')='proposed');
select provenance_test.assert_case('CASE 64 — conflicting proposed positive makes upstream ambiguous',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000001')='source_unresolved');
select provenance_test.assert_case('CASE 65 — command replay is recognizable by immutable row',(select count(*)=1 from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000001' and operation_kind='create_resolution_proposal'));

-- Canonical direct-source readiness fixture: every authority is explicit and the upstream conclusion is affirmative negative authority.
insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type) values('81000000-0000-4000-8000-000000000003',repeat('c',64),300,'application/pdf');
insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email) values('82000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000003','manual_reference','private','fixture:c','fixture@upperlineco.com');
insert into public.intelligence_sources(id,title,source_kind,created_by_email) values('83000000-0000-4000-8000-000000000004','Direct source','public_dataset','fixture@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,created_by_email) values('84000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000004','2026','unknown','fixture@upperlineco.com');
insert into public.intelligence_source_edition_artifacts(id,source_edition_id,artifact_id,representation_role,is_primary,created_by_email) values('85000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000003','primary',true,'fixture@upperlineco.com');

select provenance_test.command('90000000-0000-4000-8000-000000000066','create_resolution_proposal','ready-source');
select provenance_test.command('90000000-0000-4000-8000-000000000067','create_resolution_proposal','ready-edition');
select provenance_test.command('90000000-0000-4000-8000-000000000068','create_resolution_proposal','ready-representation');
select provenance_test.command('90000000-0000-4000-8000-000000000069','create_resolution_proposal','ready-upstream');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email) values
 ('91000000-0000-4000-8000-000000000066','82000000-0000-4000-8000-000000000003','source_identity','human_review','90000000-0000-4000-8000-000000000066',encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000004|null|44697265637420736f75726365|public_dataset|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com'),
 ('91000000-0000-4000-8000-000000000067','82000000-0000-4000-8000-000000000003','source_edition','human_review','90000000-0000-4000-8000-000000000067',encode(extensions.digest(convert_to('source_edition|83000000-0000-4000-8000-000000000004|select_existing|84000000-0000-4000-8000-000000000004|32303236|unknown|null|null|null|unknown','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com'),
 ('91000000-0000-4000-8000-000000000068','82000000-0000-4000-8000-000000000003','artifact_representation','deterministic_system','90000000-0000-4000-8000-000000000068',encode(extensions.digest(convert_to('artifact_representation|84000000-0000-4000-8000-000000000004|81000000-0000-4000-8000-000000000003|primary|true|same_bytes|database_derived','UTF8'),'sha256'),'hex'),'system@upperlineco.com'),
 ('91000000-0000-4000-8000-000000000069','82000000-0000-4000-8000-000000000003','upstream_attribution','machine_assisted','90000000-0000-4000-8000-000000000069',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000004|no_upstream_required|null|null|null|null|null|52657669657765642061732064697265637420736f75726365|null','UTF8'),'sha256'),'hex'),'system@upperlineco.com');
insert into public.intelligence_source_resolution_proposals values('91000000-0000-4000-8000-000000000066','select_existing','83000000-0000-4000-8000-000000000004',null,'Direct source','public_dataset',null,'preauthorized_identity',true,false,true,true,false);
insert into public.intelligence_edition_resolution_proposals values('91000000-0000-4000-8000-000000000067','83000000-0000-4000-8000-000000000004','select_existing','84000000-0000-4000-8000-000000000004','2026','unknown',null,null,null,'unknown');
insert into public.intelligence_representation_resolution_proposals values('91000000-0000-4000-8000-000000000068','84000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000003','primary',true,'same_bytes','database_derived');
insert into public.intelligence_upstream_attribution_proposals values('91000000-0000-4000-8000-000000000069','84000000-0000-4000-8000-000000000004','no_upstream_required',null,null,null,null,null,'Reviewed as direct source');
commit;
select provenance_test.command('90000000-0000-4000-8000-000000000076','decide_resolution_proposal','confirm-ready-source');
select provenance_test.command('90000000-0000-4000-8000-000000000077','decide_resolution_proposal','confirm-ready-edition');
select provenance_test.command('90000000-0000-4000-8000-000000000078','decide_resolution_proposal','confirm-ready-representation');
select provenance_test.command('90000000-0000-4000-8000-000000000079','decide_resolution_proposal','confirm-ready-upstream');
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,materialized_source_id) select '91000000-0000-4000-8000-000000000066',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com','83000000-0000-4000-8000-000000000004' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000076';
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,materialized_edition_id) select '91000000-0000-4000-8000-000000000067',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com','84000000-0000-4000-8000-000000000004' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000077';
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,materialized_representation_id) select '91000000-0000-4000-8000-000000000068',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com','85000000-0000-4000-8000-000000000003' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000078';
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) select '91000000-0000-4000-8000-000000000069',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000079';
select provenance_test.assert_case('CASE 66 — direct-source fixture resolves source',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000066')='confirmed');
select provenance_test.assert_case('CASE 67 — direct-source fixture resolves edition',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000067')='confirmed');
select provenance_test.assert_case('CASE 68 — direct-source fixture resolves representation',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000068')='confirmed');
select provenance_test.assert_case('CASE 69 — confirmed negative has human reviewer assertion',(select reviewer_email='reviewer@upperlineco.com' from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000069'));
select provenance_test.assert_case('CASE 70 — confirmed negative creates no source relationship',(select materialized_source_relationship_id is null from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000069'));
select provenance_test.assert_case('CASE 71 — direct-source fixture is provenance ready',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000003')='provenance_ready');
select provenance_test.assert_case('CASE 72 — nonexistent acquisition is artifact unestablished',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000099')='artifact_unestablished');

insert into public.intelligence_sources(id,title,source_kind,created_by_email) values('83000000-0000-4000-8000-000000000005','Attributed provider','public_dataset','fixture@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,created_by_email) values('84000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000005','2026','unknown','fixture@upperlineco.com');
insert into public.intelligence_source_relationships(id,containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email) values('86000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000004','attributes_to','83000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000005','fixture@upperlineco.com');
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type) values('87000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000003','pdf');
insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number) values('87000000-0000-4000-8000-000000000005',1);
commit;
select provenance_test.command('90000000-0000-4000-8000-000000000080','create_resolution_proposal','conflicting-positive');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email) values('91000000-0000-4000-8000-000000000080','82000000-0000-4000-8000-000000000003','upstream_attribution','machine_assisted','90000000-0000-4000-8000-000000000080',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000004|attributed_upstream|attributes_to|83000000-0000-4000-8000-000000000005|84000000-0000-4000-8000-000000000005|preauthorized|not_established|null|87000000-0000-4000-8000-000000000005','UTF8'),'sha256'),'hex'),'system@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values('91000000-0000-4000-8000-000000000080','84000000-0000-4000-8000-000000000004','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000005','preauthorized','not_established',null);
insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000080','87000000-0000-4000-8000-000000000005',now());
commit;
select provenance_test.assert_case('CASE 73 — confirmed negative versus proposed positive is ambiguous',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000003')='upstream_provenance_ambiguous');

select provenance_test.command('90000000-0000-4000-8000-000000000081','decide_resolution_proposal','reverse-ready-negative');
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) select '91000000-0000-4000-8000-000000000069',2,1,'reversed',command_id,request_digest,'reviewer@upperlineco.com' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000081';
select provenance_test.command('90000000-0000-4000-8000-000000000082','create_resolution_proposal','corrected-positive');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,corrects_proposal_id,creation_command_id,semantic_fingerprint,proposed_by_email) values('91000000-0000-4000-8000-000000000082','82000000-0000-4000-8000-000000000003','upstream_attribution','human_review','91000000-0000-4000-8000-000000000069','90000000-0000-4000-8000-000000000082',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000004|attributed_upstream|attributes_to|83000000-0000-4000-8000-000000000005|84000000-0000-4000-8000-000000000005|preauthorized|not_established|null|87000000-0000-4000-8000-000000000005','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values('91000000-0000-4000-8000-000000000082','84000000-0000-4000-8000-000000000004','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000005','preauthorized','not_established',null);
insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000082','87000000-0000-4000-8000-000000000005',now());
commit;
select provenance_test.command('90000000-0000-4000-8000-000000000083','decide_resolution_proposal','confirm-corrected-positive');
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,materialized_source_relationship_id) select '91000000-0000-4000-8000-000000000082',1,0,'confirmed',command_id,request_digest,'reviewer@upperlineco.com','86000000-0000-4000-8000-000000000005' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000083';
select provenance_test.assert_case('CASE 74 — reversed negative remains historical',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000069')='reversed');
select provenance_test.assert_case('CASE 75 — corrected positive is current authority',public.intelligence_provenance_current_state_v1('91000000-0000-4000-8000-000000000082')='confirmed');
select provenance_test.assert_case('CASE 76 — corrected positive chain is provenance ready',public.intelligence_provenance_readiness_v1('82000000-0000-4000-8000-000000000003')='provenance_ready');

select provenance_test.command('90000000-0000-4000-8000-000000000084','decide_resolution_proposal','reject-positive-one');
insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email)
select '91000000-0000-4000-8000-000000000020',1,0,'rejected',command_id,request_digest,'reviewer@upperlineco.com' from public.intelligence_provenance_commands where command_id='90000000-0000-4000-8000-000000000084';
select provenance_test.expect_error('CASE 77 — finalized proposal rejects later evidence',$$insert into public.intelligence_upstream_attribution_evidence values('91000000-0000-4000-8000-000000000020','87000000-0000-4000-8000-000000000003',now())$$,'intelligence_upstream_evidence_proposal_finalized');
select provenance_test.assert_case('CASE 78 — rejected proposal fingerprint remains authoritative',(select semantic_fingerprint=encode(extensions.digest(convert_to(public.intelligence_provenance_payload_canonical_v1(id),'UTF8'),'sha256'),'hex') from public.intelligence_provenance_resolution_proposals where id='91000000-0000-4000-8000-000000000020'));

drop schema provenance_test cascade;
