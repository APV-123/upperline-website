-- Phase 4A.2.0: additive, server-only ingestion transaction primitives.

alter table public.opportunity_extraction_runs
  add column diagnostics jsonb not null default '[]'::jsonb,
  add constraint opportunity_extraction_runs_diagnostics_check
    check (jsonb_typeof(diagnostics) = 'array');

create function public.finalize_opportunity_verified_artifact(
  p_ingestion_id uuid, p_artifact_id uuid, p_storage_bucket text, p_storage_path text,
  p_original_filename text, p_declared_mime_type text, p_detected_mime_type text,
  p_byte_size bigint, p_sha256_digest text, p_page_count integer,
  p_document_metadata jsonb, p_actor_email text
) returns table(ingestion_id uuid, artifact_id uuid, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_ingestion public.opportunity_ingestions%rowtype;
declare v_existing public.opportunity_source_artifacts%rowtype;
begin
  select * into v_ingestion from public.opportunity_ingestions where id=p_ingestion_id for update;
  if not found then raise exception using errcode='P0002', message='ingestion_not_found'; end if;
  select * into v_existing from public.opportunity_source_artifacts where id=p_artifact_id;
  if found then
    if v_existing.ingestion_id=p_ingestion_id and v_existing.storage_bucket=p_storage_bucket
      and v_existing.storage_path=p_storage_path and v_existing.byte_size=p_byte_size
      and v_existing.sha256_digest=p_sha256_digest and v_existing.detected_mime_type is not distinct from p_detected_mime_type
      and v_ingestion.status='ready' then
      return query select p_ingestion_id,p_artifact_id,v_ingestion.status; return;
    end if;
    raise exception using errcode='22023', message='artifact_finalize_conflicting_replay';
  end if;
  if v_ingestion.status<>'awaiting_source' then raise exception using errcode='22023', message='ingestion_not_awaiting_source'; end if;
  if p_detected_mime_type<>'application/pdf' or p_byte_size<=0 or p_sha256_digest !~ '^[0-9a-f]{64}$'
    or length(btrim(p_storage_bucket))=0 or length(btrim(p_storage_path))=0
    or p_document_metadata is null or jsonb_typeof(p_document_metadata)<>'object'
    or length(btrim(p_actor_email))=0 then
    raise exception using errcode='22023', message='verified_artifact_metadata_invalid';
  end if;
  insert into public.opportunity_source_artifacts
    (id,ingestion_id,artifact_kind,storage_bucket,storage_path,original_filename,declared_mime_type,
     detected_mime_type,byte_size,sha256_digest,page_count,document_metadata,validation_status,created_by_email)
  values (p_artifact_id,p_ingestion_id,'pdf',p_storage_bucket,p_storage_path,p_original_filename,p_declared_mime_type,
    p_detected_mime_type,p_byte_size,p_sha256_digest,p_page_count,p_document_metadata,'valid',lower(btrim(p_actor_email)));
  update public.opportunity_ingestions set status='ready',revision=revision+1,failure_code=null,failure_message=null
    where id=p_ingestion_id;
  return query select p_ingestion_id,p_artifact_id,'ready'::text;
end; $$;

create function public.allocate_opportunity_extraction_run(
  p_ingestion_id uuid, p_artifact_id uuid, p_run_id uuid, p_run_idempotency_key text,
  p_extraction_strategy text, p_extraction_version text, p_provider text, p_model text,
  p_parser_version text, p_prompt_version text, p_schema_version text, p_input_digest text,
  p_actor_email text
) returns table(run_id uuid, attempt_number integer, run_status text, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_ingestion public.opportunity_ingestions%rowtype;
declare v_artifact public.opportunity_source_artifacts%rowtype;
declare v_existing public.opportunity_extraction_runs%rowtype;
declare v_attempt integer;
begin
  select * into v_ingestion from public.opportunity_ingestions where id=p_ingestion_id for update;
  if not found then raise exception using errcode='P0002', message='ingestion_not_found'; end if;
  select * into v_artifact from public.opportunity_source_artifacts where id=p_artifact_id and ingestion_id=p_ingestion_id for update;
  if not found then raise exception using errcode='22023', message='artifact_ingestion_mismatch'; end if;
  select * into v_existing from public.opportunity_extraction_runs
    where artifact_id=p_artifact_id and run_idempotency_key=p_run_idempotency_key;
  if found then
    return query select v_existing.id,v_existing.attempt_number,v_existing.status,v_ingestion.status; return;
  end if;
  if v_ingestion.status not in ('ready','review_ready','failed') then
    raise exception using errcode='22023', message='ingestion_not_extractable';
  end if;
  if p_input_digest<>v_artifact.sha256_digest then raise exception using errcode='22023', message='run_input_digest_mismatch'; end if;
  select coalesce(max(r.attempt_number),0)+1 into v_attempt from public.opportunity_extraction_runs r where r.artifact_id=p_artifact_id;
  insert into public.opportunity_extraction_runs
    (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,status,extraction_strategy,
     extraction_version,provider,model,parser_version,prompt_version,schema_version,input_digest,
     started_at,created_by_email)
  values (p_run_id,p_ingestion_id,p_artifact_id,v_attempt,p_run_idempotency_key,'running',p_extraction_strategy,
    p_extraction_version,p_provider,p_model,p_parser_version,p_prompt_version,p_schema_version,p_input_digest,
    now(),lower(btrim(p_actor_email)));
  update public.opportunity_ingestions set status='extracting',revision=revision+1,failure_code=null,failure_message=null
    where id=p_ingestion_id;
  return query select p_run_id,v_attempt,'running'::text,'extracting'::text;
end; $$;

create function public.complete_opportunity_extraction_run(
  p_ingestion_id uuid, p_artifact_id uuid, p_run_id uuid, p_candidates jsonb, p_diagnostics jsonb
) returns table(run_id uuid, candidate_count integer, evidence_count integer, run_status text, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_run public.opportunity_extraction_runs%rowtype;
declare v_candidate jsonb; declare v_evidence jsonb; declare v_candidate_id uuid;
declare v_candidates integer:=0; declare v_evidence_count integer:=0;
declare v_domain text; declare v_path text; declare v_tenant uuid;
begin
  select * into v_run from public.opportunity_extraction_runs where id=p_run_id for update;
  if not found then raise exception using errcode='P0002', message='extraction_run_not_found'; end if;
  if v_run.ingestion_id<>p_ingestion_id or v_run.artifact_id<>p_artifact_id then
    raise exception using errcode='22023', message='extraction_run_relationship_mismatch';
  end if;
  perform 1 from public.opportunity_ingestions where id=p_ingestion_id for update;
  if v_run.status not in ('pending','running') then raise exception using errcode='55000', message='extraction_run_terminal'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates)<>'array' or p_diagnostics is null or jsonb_typeof(p_diagnostics)<>'array' then
    raise exception using errcode='22023', message='extraction_completion_payload_invalid';
  end if;
  for v_candidate in select value from jsonb_array_elements(p_candidates) loop
    if jsonb_typeof(v_candidate)<>'object' or exists(
      select 1 from jsonb_object_keys(v_candidate) as candidate_key(key) where key not in
      ('id','destinationDomain','fieldPath','candidateTenantKey','assertionBasis','economicRole','rawValue',
       'normalizedValueType','normalizedValue','unit','confidence','validationState','validationIssues','groupKey','ordinal','fingerprint','evidence'))
      then raise exception using errcode='22023', message='candidate_shape_invalid'; end if;
    v_candidate_id=(v_candidate->>'id')::uuid; v_domain=v_candidate->>'destinationDomain';
    v_path=v_candidate->>'fieldPath'; v_tenant=nullif(v_candidate->>'candidateTenantKey','')::uuid;
    if (v_domain='opportunity' and v_path not in ('name','address.line1','address.city','address.state','address.postalCode','address.county','address.market','askingPrice','landAreaSf','existingBuildingAreaSf'))
      or (v_domain='underwriting' and v_path not in ('analysisDate','site.landAreaSf','site.targetFar','site.landCostPerLandSf','leasing.rentalRatePerSfYear','leasing.annualRentBump','leasing.leaseTermMonths','leasing.freeRentMonths','leasing.tenantImprovementPerSf','leasing.leasingCommissionRate'))
      or (v_domain='tenant' and v_path not in ('name','useType','displayOrder','sizeSf','rentalRatePerSfYear','annualRentBump','leaseCommencementDate','leaseTermMonths','freeRentMonths','tenantImprovementPerSf','leasingCommissionRate'))
      or v_domain not in ('opportunity','underwriting','tenant') then
      raise exception using errcode='22023', message='candidate_destination_not_allowed';
    end if;
    insert into public.opportunity_candidate_facts
      (id,ingestion_id,artifact_id,extraction_run_id,destination_domain,field_path,candidate_tenant_key,
       assertion_basis,economic_role,raw_value,normalized_value_type,normalized_value,unit,confidence,
       validation_state,validation_issues,group_key,ordinal,candidate_fingerprint)
    values (v_candidate_id,p_ingestion_id,p_artifact_id,p_run_id,v_domain,v_path,v_tenant,
      v_candidate->>'assertionBasis',v_candidate->>'economicRole',v_candidate->'rawValue',
      nullif(v_candidate->>'normalizedValueType',''),v_candidate->'normalizedValue',nullif(v_candidate->>'unit',''),
      nullif(v_candidate->>'confidence','')::numeric,v_candidate->>'validationState',
      coalesce(v_candidate->'validationIssues','[]'::jsonb),nullif(v_candidate->>'groupKey',''),
      (v_candidate->>'ordinal')::integer,v_candidate->>'fingerprint');
    v_candidates=v_candidates+1;
    if coalesce(jsonb_typeof(v_candidate->'evidence'),'array')<>'array' then raise exception using errcode='22023', message='candidate_evidence_invalid'; end if;
    for v_evidence in select value from jsonb_array_elements(coalesce(v_candidate->'evidence','[]'::jsonb)) loop
      if jsonb_typeof(v_evidence)<>'object' or exists(select 1 from jsonb_object_keys(v_evidence) as evidence_key(key) where key not in
        ('id','pageNumber','snippet','boundingBox','sectionLabel','extractionMethod','extractionVersion','ordinal'))
        then raise exception using errcode='22023', message='evidence_shape_invalid'; end if;
      insert into public.opportunity_candidate_fact_evidence
        (id,candidate_fact_id,extraction_run_id,artifact_id,ingestion_id,page_number,snippet,bounding_box,
         section_label,extraction_method,extraction_version,ordinal)
      values ((v_evidence->>'id')::uuid,v_candidate_id,p_run_id,p_artifact_id,p_ingestion_id,
        nullif(v_evidence->>'pageNumber','')::integer,v_evidence->>'snippet',v_evidence->'boundingBox',
        v_evidence->>'sectionLabel',v_evidence->>'extractionMethod',v_evidence->>'extractionVersion',
        coalesce((v_evidence->>'ordinal')::integer,0));
      v_evidence_count=v_evidence_count+1;
    end loop;
  end loop;
  update public.opportunity_extraction_runs set diagnostics=p_diagnostics,status='succeeded',completed_at=now(),updated_at=now()
    where id=p_run_id;
  update public.opportunity_ingestions set status='review_ready',revision=revision+1,failure_code=null,failure_message=null
    where id=p_ingestion_id;
  return query select p_run_id,v_candidates,v_evidence_count,'succeeded'::text,'review_ready'::text;
end; $$;

create function public.fail_opportunity_extraction_run(
  p_ingestion_id uuid, p_artifact_id uuid, p_run_id uuid, p_failure_code text,
  p_failure_message text, p_diagnostics jsonb
) returns table(run_id uuid, run_status text, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_run public.opportunity_extraction_runs%rowtype;
begin
  select * into v_run from public.opportunity_extraction_runs where id=p_run_id for update;
  if not found then raise exception using errcode='P0002', message='extraction_run_not_found'; end if;
  if v_run.ingestion_id<>p_ingestion_id or v_run.artifact_id<>p_artifact_id then raise exception using errcode='22023', message='extraction_run_relationship_mismatch'; end if;
  perform 1 from public.opportunity_ingestions where id=p_ingestion_id for update;
  if v_run.status='failed' and v_run.failure_code=p_failure_code and v_run.failure_message=p_failure_message then
    return query select p_run_id,'failed'::text,'failed'::text; return;
  end if;
  if v_run.status not in ('pending','running') then raise exception using errcode='55000', message='extraction_run_terminal'; end if;
  if p_failure_code !~ '^[A-Z][A-Z0-9_]{1,63}$' or length(p_failure_message) not between 1 and 500
    or p_failure_message ~ E'[\\n\\r]' or p_diagnostics is null or jsonb_typeof(p_diagnostics)<>'array' then
    raise exception using errcode='22023', message='sanitized_failure_payload_invalid';
  end if;
  update public.opportunity_extraction_runs set diagnostics=p_diagnostics,status='failed',failure_code=p_failure_code,
    failure_message=p_failure_message,completed_at=now(),updated_at=now() where id=p_run_id;
  update public.opportunity_ingestions set status='failed',failure_code=p_failure_code,failure_message=p_failure_message,
    revision=revision+1 where id=p_ingestion_id;
  return query select p_run_id,'failed'::text,'failed'::text;
end; $$;

revoke execute on function public.finalize_opportunity_verified_artifact(uuid,uuid,text,text,text,text,text,bigint,text,integer,jsonb,text) from public,anon,authenticated;
revoke execute on function public.allocate_opportunity_extraction_run(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.fail_opportunity_extraction_run(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_opportunity_verified_artifact(uuid,uuid,text,text,text,text,text,bigint,text,integer,jsonb,text) to service_role;
grant execute on function public.allocate_opportunity_extraction_run(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function public.fail_opportunity_extraction_run(uuid,uuid,uuid,text,text,jsonb) to service_role;
