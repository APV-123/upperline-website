\set ON_ERROR_STOP on
insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type)
values('81000000-0000-4000-8000-000000000004',repeat('d',64),400,'application/pdf');
insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email)
values('82000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000004','manual_reference','private','fixture:b2-race','fixture@upperlineco.com');
insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type)
values('81000000-0000-4000-8000-000000000005',repeat('e',64),500,'application/pdf');
insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email)
values('82000000-0000-4000-8000-000000000005','81000000-0000-4000-8000-000000000005','manual_reference','private','fixture:b2-replay','fixture@upperlineco.com');

select * from public.create_intelligence_provenance_proposal_v1(
 '96000000-0000-4000-8000-000000000001','b2-race-source-a','82000000-0000-4000-8000-000000000004','source_identity','human_review',null,
 encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'one@upperlineco.com',
 '{"resolutionMode":"select_existing","existingSourceId":"83000000-0000-4000-8000-000000000001","publisherId":null,"candidateTitle":"Containing source","candidateSourceKind":"offering_memorandum","candidateExternalIdentifier":null,"publisherEvidence":"preauthorized_identity","matchTitle":true,"matchFilename":false,"matchProperty":true,"matchPublisher":true,"matchUploader":false}');
select * from public.create_intelligence_provenance_proposal_v1(
 '96000000-0000-4000-8000-000000000002','b2-race-source-b','82000000-0000-4000-8000-000000000004','source_identity','human_review',null,
 encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000003|null|4f7468657220736f75726365|other|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'two@upperlineco.com',
 '{"resolutionMode":"select_existing","existingSourceId":"83000000-0000-4000-8000-000000000003","publisherId":null,"candidateTitle":"Other source","candidateSourceKind":"other","candidateExternalIdentifier":null,"publisherEvidence":"preauthorized_identity","matchTitle":true,"matchFilename":false,"matchProperty":true,"matchPublisher":true,"matchUploader":false}');
select * from public.create_intelligence_provenance_proposal_v1(
 '96000000-0000-4000-8000-000000000003','b2-identical-replay','82000000-0000-4000-8000-000000000005','source_identity','human_review',null,
 encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex'),'one@upperlineco.com',
 '{"resolutionMode":"select_existing","existingSourceId":"83000000-0000-4000-8000-000000000001","publisherId":null,"candidateTitle":"Containing source","candidateSourceKind":"offering_memorandum","candidateExternalIdentifier":null,"publisherEvidence":"preauthorized_identity","matchTitle":true,"matchFilename":false,"matchProperty":true,"matchPublisher":true,"matchUploader":false}');
