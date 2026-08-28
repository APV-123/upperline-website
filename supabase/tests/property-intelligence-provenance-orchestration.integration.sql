\set ON_ERROR_STOP on
create schema orchestration_test;
create function orchestration_test.assert_case(name text,condition boolean) returns void language plpgsql as $$begin if condition is not true then raise exception 'CASE FAILED: %',name;end if;raise notice '% PASS',name;end$$;
create function orchestration_test.expect_error(name text,statement text,message text) returns void language plpgsql as $$begin begin execute statement;raise exception 'expected_error_not_raised';exception when others then if sqlerrm='expected_error_not_raised' or position(message in sqlerrm)=0 then raise exception 'CASE FAILED: %, expected %, got %',name,message,sqlerrm;end if;raise notice '% PASS',name;end;end$$;

insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type) values
 ('a1000000-0000-4000-8000-000000000001',repeat('a',64),100,'application/pdf'),
 ('a1000000-0000-4000-8000-000000000002',repeat('b',64),200,'application/pdf');
insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,external_locator,acquired_by_email) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','manual_reference','fixture:a','fixture@upperlineco.com');
insert into public.intelligence_sources(id,title,source_kind,created_by_email) values
 ('a3000000-0000-4000-8000-000000000001','Containing source','offering_memorandum','fixture@upperlineco.com'),
 ('a3000000-0000-4000-8000-000000000002','Upstream source','public_dataset','fixture@upperlineco.com');
insert into public.intelligence_source_editions(id,source_id,edition_label,publication_precision,created_by_email) values
 ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','2026','unknown','fixture@upperlineco.com'),
 ('a4000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002','2025','unknown','fixture@upperlineco.com');
begin;
insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
values('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','primary',true,'fixture@upperlineco.com');
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type) values('a7000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','pdf');
insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number) values('a7000000-0000-4000-8000-000000000001',1);
commit;

select * from public.create_intelligence_provenance_proposal_v1(
 'aa000000-0000-4000-8000-000000000001','create-source','a2000000-0000-4000-8000-000000000001','source_identity','human_review',null,
 encode(extensions.digest(convert_to('source_identity|select_existing|a3000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com',
 '{"resolutionMode":"select_existing","existingSourceId":"a3000000-0000-4000-8000-000000000001","publisherId":null,"candidateTitle":"Containing source","candidateSourceKind":"offering_memorandum","candidateExternalIdentifier":null,"publisherEvidence":"preauthorized_identity","matchTitle":true,"matchFilename":false,"matchProperty":true,"matchPublisher":true,"matchUploader":false}'::jsonb);
select orchestration_test.assert_case('proposal replay returns one row',(select inserted=false from public.create_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000001','create-source','a2000000-0000-4000-8000-000000000001','source_identity','human_review',null,repeat('0',64),'reviewer@upperlineco.com','{}')));
select orchestration_test.expect_error('changed semantic replay conflicts',$$select * from public.create_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000001','changed','a2000000-0000-4000-8000-000000000001','source_identity','human_review',null,repeat('0',64),'reviewer@upperlineco.com','{}')$$,'intelligence_provenance_command_semantics_conflict');

select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000001','confirm-source',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000001'),'confirm',0,'reviewer@upperlineco.com',null);
select orchestration_test.assert_case('decision replay is idempotent',(select inserted=false from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000001','confirm-source',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000001'),'confirm',0,'reviewer@upperlineco.com',null)));
select orchestration_test.assert_case('reviewer is server assertion',(select reviewer_email='reviewer@upperlineco.com' from public.intelligence_provenance_resolution_decisions where command_id='ab000000-0000-4000-8000-000000000001'));
select orchestration_test.expect_error('changed operation replay conflicts',$$select * from public.decide_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000001','create-source',(select id from public.intelligence_provenance_resolution_proposals limit 1),'reject',0,'reviewer@upperlineco.com',null)$$,'intelligence_provenance_command_semantics_conflict');
select orchestration_test.assert_case('partial chain cannot report ready',(select readiness<>'provenance_ready' from public.get_intelligence_provenance_readiness_v1('a2000000-0000-4000-8000-000000000001')));

select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000002','reverse-source',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000001'),'reverse',1,'reviewer@upperlineco.com','Incorrect source match');
select orchestration_test.assert_case('reversal is transactional',(select public.intelligence_provenance_current_state_v1(id)='reversed' and (select count(*) from public.intelligence_provenance_resolution_decisions d where d.proposal_id=p.id)=2 from public.intelligence_provenance_resolution_proposals p where creation_command_id='aa000000-0000-4000-8000-000000000001'));
select orchestration_test.expect_error('stale reversal fails closed',$$select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000003','stale-reverse',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000001'),'reverse',1,'reviewer@upperlineco.com',null)$$,'intelligence_provenance_stale_revision');
select orchestration_test.assert_case('stale reversal command rolls back',not exists(select 1 from public.intelligence_provenance_commands where command_id='ab000000-0000-4000-8000-000000000003'));
select * from public.create_intelligence_provenance_proposal_v1(
 'aa000000-0000-4000-8000-000000000004','correct-source','a2000000-0000-4000-8000-000000000001','source_identity','human_review',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000001'),
 encode(extensions.digest(convert_to('source_identity|select_existing|a3000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com',
 '{"resolutionMode":"select_existing","existingSourceId":"a3000000-0000-4000-8000-000000000001","publisherId":null,"candidateTitle":"Containing source","candidateSourceKind":"offering_memorandum","candidateExternalIdentifier":null,"publisherEvidence":"preauthorized_identity","matchTitle":true,"matchFilename":false,"matchProperty":true,"matchPublisher":true,"matchUploader":false}');
select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000004','confirm-correction',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000004'),'confirm',0,'reviewer@upperlineco.com',null);
select orchestration_test.assert_case('correction creates one replacement authority',(select count(*)=1 from public.intelligence_provenance_resolution_proposals p where p.artifact_acquisition_id='a2000000-0000-4000-8000-000000000001' and p.proposal_kind='source_identity' and public.intelligence_provenance_current_state_v1(p.id)='confirmed'));

select * from public.create_intelligence_provenance_proposal_v1(
 'aa000000-0000-4000-8000-000000000005','create-upstream','a2000000-0000-4000-8000-000000000001','upstream_attribution','human_review',null,
 encode(extensions.digest(convert_to('upstream_attribution|a4000000-0000-4000-8000-000000000001|attributed_upstream|attributes_to|a3000000-0000-4000-8000-000000000002|a4000000-0000-4000-8000-000000000002|preauthorized|not_established|null|a7000000-0000-4000-8000-000000000001','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com',
 '{"containingSourceEditionId":"a4000000-0000-4000-8000-000000000001","conclusion":"attributed_upstream","relationshipType":"attributes_to","upstreamSourceId":"a3000000-0000-4000-8000-000000000002","upstreamSourceEditionId":"a4000000-0000-4000-8000-000000000002","upstreamEditionState":"preauthorized","independenceAuthority":"not_established","humanReviewRationale":null,"evidenceLocationIds":["a7000000-0000-4000-8000-000000000001"]}');
select orchestration_test.assert_case('upstream replay does not duplicate evidence',(select inserted=false from public.create_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000005','create-upstream','a2000000-0000-4000-8000-000000000001','upstream_attribution','human_review',null,repeat('0',64),'reviewer@upperlineco.com','{}')) and (select count(*)=1 from public.intelligence_upstream_attribution_evidence e join public.intelligence_provenance_resolution_proposals p on p.id=e.proposal_id where p.creation_command_id='aa000000-0000-4000-8000-000000000005'));
select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000005','reject-upstream',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000005'),'reject',0,'reviewer@upperlineco.com',null);
select orchestration_test.assert_case('decision replay does not duplicate history',(select inserted=false from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000005','reject-upstream',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000005'),'reject',0,'reviewer@upperlineco.com',null)) and (select count(*)=1 from public.intelligence_provenance_resolution_decisions where command_id='ab000000-0000-4000-8000-000000000005'));

select orchestration_test.expect_error('partial proposal failure rolls back command',$$select * from public.create_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000009','bad-proposal','a2000000-0000-4000-8000-000000000001','source_identity','human_review',null,repeat('0',64),'reviewer@upperlineco.com','{}')$$,'not-null constraint');
select orchestration_test.assert_case('failed proposal leaves no command',not exists(select 1 from public.intelligence_provenance_commands where command_id='aa000000-0000-4000-8000-000000000009'));

-- A mismatched representation materialization must roll back its decision command.
select * from public.create_intelligence_provenance_proposal_v1('aa000000-0000-4000-8000-000000000010','bad-representation','a2000000-0000-4000-8000-000000000001','artifact_representation','deterministic_system',null,
 encode(extensions.digest(convert_to('artifact_representation|a4000000-0000-4000-8000-000000000001|a1000000-0000-4000-8000-000000000002|primary|true|same_bytes|database_derived','UTF8'),'sha256'),'hex'),'system@upperlineco.com',
 '{"sourceEditionId":"a4000000-0000-4000-8000-000000000001","artifactId":"a1000000-0000-4000-8000-000000000002","representationRole":"primary","isPrimary":true,"contentEquivalenceState":"same_bytes","contentEquivalenceAuthority":"database_derived"}');
select orchestration_test.expect_error('materialization failure rolls back confirmation',$$select * from public.decide_intelligence_provenance_proposal_v1('ab000000-0000-4000-8000-000000000010','confirm-bad-representation',(select id from public.intelligence_provenance_resolution_proposals where creation_command_id='aa000000-0000-4000-8000-000000000010'),'confirm',0,'reviewer@upperlineco.com',null)$$,'intelligence_provenance_representation_materialization_invalid');
select orchestration_test.assert_case('failed confirmation leaves no command or representation',not exists(select 1 from public.intelligence_provenance_commands where command_id='ab000000-0000-4000-8000-000000000010') and not exists(select 1 from public.intelligence_source_edition_artifacts where artifact_id='a1000000-0000-4000-8000-000000000002'));

drop schema orchestration_test cascade;
