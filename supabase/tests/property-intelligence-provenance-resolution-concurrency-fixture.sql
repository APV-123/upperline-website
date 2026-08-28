\set ON_ERROR_STOP on

create function public.provenance_test_command(id uuid, op text, body text) returns void language sql as $$
  insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest)
  values(id,op,'property-intelligence-provenance-bridge-v1',body,encode(extensions.digest(convert_to(body,'UTF8'),'sha256'),'hex'))
$$;

-- Two source proposals competing in one acquisition context.
select public.provenance_test_command('92000000-0000-4000-8000-000000000001','create_resolution_proposal','race-source-a');
select public.provenance_test_command('92000000-0000-4000-8000-000000000002','create_resolution_proposal','race-source-b');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values
 ('93000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','source_identity','human_review','92000000-0000-4000-8000-000000000001',encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','source_identity','human_review','92000000-0000-4000-8000-000000000002',encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000003|null|4f7468657220736f75726365|other|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com');
insert into public.intelligence_source_resolution_proposals values
 ('93000000-0000-4000-8000-000000000001','select_existing','83000000-0000-4000-8000-000000000001',null,'Containing source','offering_memorandum',null,'preauthorized_identity',true,false,true,true,false),
 ('93000000-0000-4000-8000-000000000002','select_existing','83000000-0000-4000-8000-000000000003',null,'Other source','other',null,'preauthorized_identity',true,false,true,true,false);
commit;

-- Two edition proposals competing in one acquisition context.
select public.provenance_test_command('92000000-0000-4000-8000-000000000003','create_resolution_proposal','race-edition-a');
select public.provenance_test_command('92000000-0000-4000-8000-000000000004','create_resolution_proposal','race-edition-b');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values
 ('93000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000002','source_edition','human_review','92000000-0000-4000-8000-000000000003',encode(extensions.digest(convert_to('source_edition|83000000-0000-4000-8000-000000000001|select_existing|84000000-0000-4000-8000-000000000001|32303236|unknown|null|null|null|unknown','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000002','source_edition','human_review','92000000-0000-4000-8000-000000000004',encode(extensions.digest(convert_to('source_edition|83000000-0000-4000-8000-000000000003|select_existing|84000000-0000-4000-8000-000000000003|6f74686572|unknown|null|null|null|unknown','UTF8'),'sha256'),'hex'),'reviewer@upperlineco.com');
insert into public.intelligence_edition_resolution_proposals values
 ('93000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001','select_existing','84000000-0000-4000-8000-000000000001','2026','unknown',null,null,null,'unknown'),
 ('93000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003','select_existing','84000000-0000-4000-8000-000000000003','other','unknown',null,null,null,'unknown');
commit;

-- Two representation proposals competing in one acquisition context and edition.
select public.provenance_test_command('92000000-0000-4000-8000-000000000005','create_resolution_proposal','race-representation-a');
select public.provenance_test_command('92000000-0000-4000-8000-000000000006','create_resolution_proposal','race-representation-b');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values
 ('93000000-0000-4000-8000-000000000005','82000000-0000-4000-8000-000000000002','artifact_representation','deterministic_system','92000000-0000-4000-8000-000000000005',encode(extensions.digest(convert_to('artifact_representation|84000000-0000-4000-8000-000000000003|81000000-0000-4000-8000-000000000002|primary|true|same_bytes|database_derived','UTF8'),'sha256'),'hex'),'system@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000006','82000000-0000-4000-8000-000000000002','artifact_representation','machine_assisted','92000000-0000-4000-8000-000000000006',encode(extensions.digest(convert_to('artifact_representation|84000000-0000-4000-8000-000000000003|81000000-0000-4000-8000-000000000002|primary|true|same_bytes|database_derived','UTF8'),'sha256'),'hex'),'system@upperlineco.com');
insert into public.intelligence_representation_resolution_proposals values
 ('93000000-0000-4000-8000-000000000005','84000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002','primary',true,'same_bytes','database_derived'),
 ('93000000-0000-4000-8000-000000000006','84000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002','primary',true,'same_bytes','database_derived');
commit;

-- Positive-versus-negative upstream proposals competing for one containing edition.
insert into public.intelligence_source_relationships(id,containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email)
values('86000000-0000-4000-8000-000000000007','84000000-0000-4000-8000-000000000003','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','fixture@upperlineco.com');
select public.provenance_test_command('92000000-0000-4000-8000-000000000007','create_resolution_proposal','race-upstream-positive');
select public.provenance_test_command('92000000-0000-4000-8000-000000000008','create_resolution_proposal','race-upstream-negative');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values
 ('93000000-0000-4000-8000-000000000007','82000000-0000-4000-8000-000000000002','upstream_attribution','machine_assisted','92000000-0000-4000-8000-000000000007',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000003|attributed_upstream|attributes_to|83000000-0000-4000-8000-000000000002|84000000-0000-4000-8000-000000000002|preauthorized|not_established|null|87000000-0000-4000-8000-000000000002','UTF8'),'sha256'),'hex'),'system@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000008','82000000-0000-4000-8000-000000000002','upstream_attribution','deterministic_system','92000000-0000-4000-8000-000000000008',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000003|no_upstream_required|null|null|null|null|null|436f6e63757272656e742068756d616e20726576696577|null','UTF8'),'sha256'),'hex'),'system@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values
 ('93000000-0000-4000-8000-000000000007','84000000-0000-4000-8000-000000000003','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','preauthorized','not_established',null),
 ('93000000-0000-4000-8000-000000000008','84000000-0000-4000-8000-000000000003','no_upstream_required',null,null,null,null,null,'Concurrent human review');
insert into public.intelligence_upstream_attribution_evidence values('93000000-0000-4000-8000-000000000007','87000000-0000-4000-8000-000000000002',now());
commit;

-- Two incompatible positive conclusions for another containing edition.
begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,locator_type) values('87000000-0000-4000-8000-000000000009','84000000-0000-4000-8000-000000000005','human_attestation');
insert into public.intelligence_human_attestation_evidence_locators(evidence_location_id,note_reference) values('87000000-0000-4000-8000-000000000009','concurrency-fixture');
commit;
insert into public.intelligence_source_relationships(id,containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email) values
 ('86000000-0000-4000-8000-000000000009','84000000-0000-4000-8000-000000000005','attributes_to','83000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','fixture@upperlineco.com'),
 ('86000000-0000-4000-8000-000000000010','84000000-0000-4000-8000-000000000005','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','fixture@upperlineco.com');
select public.provenance_test_command('92000000-0000-4000-8000-000000000009','create_resolution_proposal','race-upstream-positive-a');
select public.provenance_test_command('92000000-0000-4000-8000-000000000010','create_resolution_proposal','race-upstream-positive-b');
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email) values
 ('93000000-0000-4000-8000-000000000009','82000000-0000-4000-8000-000000000002','upstream_attribution','machine_assisted','92000000-0000-4000-8000-000000000009',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000005|attributed_upstream|attributes_to|83000000-0000-4000-8000-000000000001|84000000-0000-4000-8000-000000000001|preauthorized|not_established|null|87000000-0000-4000-8000-000000000009','UTF8'),'sha256'),'hex'),'system@upperlineco.com'),
 ('93000000-0000-4000-8000-000000000010','82000000-0000-4000-8000-000000000002','upstream_attribution','machine_assisted','92000000-0000-4000-8000-000000000010',encode(extensions.digest(convert_to('upstream_attribution|84000000-0000-4000-8000-000000000005|attributed_upstream|attributes_to|83000000-0000-4000-8000-000000000002|84000000-0000-4000-8000-000000000002|preauthorized|not_established|null|87000000-0000-4000-8000-000000000009','UTF8'),'sha256'),'hex'),'system@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values
 ('93000000-0000-4000-8000-000000000009','84000000-0000-4000-8000-000000000005','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','preauthorized','not_established',null),
 ('93000000-0000-4000-8000-000000000010','84000000-0000-4000-8000-000000000005','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','preauthorized','not_established',null);
insert into public.intelligence_upstream_attribution_evidence values
 ('93000000-0000-4000-8000-000000000009','87000000-0000-4000-8000-000000000009',now()),
 ('93000000-0000-4000-8000-000000000010','87000000-0000-4000-8000-000000000009',now());
commit;

drop function public.provenance_test_command(uuid,text,text);

begin;
insert into public.intelligence_evidence_locations(id,source_edition_id,artifact_id,locator_type)
values('87000000-0000-4000-8000-000000000012','84000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','pdf');
insert into public.intelligence_pdf_evidence_locators(evidence_location_id,page_number)
values('87000000-0000-4000-8000-000000000012',3);
commit;

insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest)
values('92000000-0000-4000-8000-000000000013','create_resolution_proposal','property-intelligence-provenance-bridge-v1','race-evidence-finalization-proposal',encode(extensions.digest(convert_to('race-evidence-finalization-proposal','UTF8'),'sha256'),'hex'));
begin;
insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,creation_command_id,semantic_fingerprint,proposed_by_email)
values('93000000-0000-4000-8000-000000000013','82000000-0000-4000-8000-000000000001','upstream_attribution','machine_assisted','92000000-0000-4000-8000-000000000013','c64368b99761c44459ef34f561d05beb20489d9267e249a5f200df27c3b59a64','system@upperlineco.com');
insert into public.intelligence_upstream_attribution_proposals values('93000000-0000-4000-8000-000000000013','84000000-0000-4000-8000-000000000001','attributed_upstream','attributes_to','83000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002','preauthorized','not_established',null);
insert into public.intelligence_upstream_attribution_evidence values('93000000-0000-4000-8000-000000000013','87000000-0000-4000-8000-000000000001',now());
commit;
