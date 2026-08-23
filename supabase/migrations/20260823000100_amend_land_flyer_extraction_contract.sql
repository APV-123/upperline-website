-- Phase 4A.2.1a: bounded land-flyer candidate contract amendment.

alter table public.opportunity_candidate_facts
  drop constraint opportunity_candidate_facts_destination_check,
  add constraint opportunity_candidate_facts_destination_check check (
    (destination_domain in ('opportunity','underwriting','source') and candidate_tenant_key is null)
    or (destination_domain = 'tenant' and candidate_tenant_key is not null
      and candidate_tenant_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ),
  drop constraint opportunity_candidate_facts_assertion_check,
  add constraint opportunity_candidate_facts_assertion_check check (
    assertion_basis in ('source_stated','deterministically_derived','system_proposed',
      'visual_inference','model_inference')
  ),
  drop constraint opportunity_candidate_facts_unit_check,
  add constraint opportunity_candidate_facts_unit_check check (
    (normalized_value is not null or unit is null) and
    (unit is null or unit in ('USD','USD_PER_SF','USD_PER_SF_YEAR','SF','PERCENT_DECIMAL',
      'MONTHS','DAYS','COUNT','NONE','ACRES','USD_PER_LAND_SF','FEET','VEHICLES_PER_DAY'))
  );

alter table public.opportunity_candidate_fact_decisions
  drop constraint opportunity_candidate_fact_decisions_destination_check,
  add constraint opportunity_candidate_fact_decisions_destination_check check (
    (selected_destination_domain in ('opportunity','underwriting','source')
      and selected_candidate_tenant_key is null)
    or (selected_destination_domain = 'tenant' and selected_candidate_tenant_key is not null
      and selected_candidate_tenant_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ),
  drop constraint opportunity_candidate_fact_decisions_unit_check,
  add constraint opportunity_candidate_fact_decisions_unit_check check (
    accepted_unit is null or accepted_unit in ('USD','USD_PER_SF','USD_PER_SF_YEAR','SF',
      'PERCENT_DECIMAL','MONTHS','DAYS','COUNT','NONE','ACRES','USD_PER_LAND_SF','FEET',
      'VEHICLES_PER_DAY')
  );

create or replace function public.complete_opportunity_extraction_run(
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
      or (v_domain='source' and v_path not in (
        'document.title','property.marketedType','location.intersection',
        'land.areaAcres','land.areaSf','tract.divisible','tract.minimumAreaAcres',
        'pricing.askingPrice','pricing.askingPricePerLandSf',
        'site.zoning','site.utilities','site.detentionClaim','site.floodplainClaim',
        'site.wetlandsClaim','site.easementClaim','site.pipelineClaim','site.wellClaim',
        'site.cityLimitStatus','site.etjStatus','site.municipalDistrict','site.tirz',
        'access.roadName','access.frontageFeet','access.pointDescription',
        'access.signalizedIntersectionClaim','traffic.vehiclesPerDay',
        'broker.brokerage','broker.contactName','broker.phone','broker.email',
        'marketing.suggestedUse'))
      or v_domain not in ('opportunity','underwriting','tenant','source') then
      raise exception using errcode='22023', message='candidate_destination_not_allowed';
    end if;
    if v_candidate->>'economicRole'='upperline_assumption' then
      raise exception using errcode='22023', message='document_upperline_assumption_not_allowed';
    end if;
    if v_domain='source' and not (
      (v_path in ('document.title','property.marketedType','location.intersection','site.zoning',
        'site.utilities','site.detentionClaim','site.floodplainClaim','site.wetlandsClaim',
        'site.easementClaim','site.pipelineClaim','site.wellClaim','site.cityLimitStatus',
        'site.etjStatus','site.municipalDistrict','site.tirz','access.roadName',
        'access.pointDescription','access.signalizedIntersectionClaim','broker.brokerage',
        'broker.contactName','broker.phone','broker.email','marketing.suggestedUse')
        and v_candidate->>'normalizedValueType'='text' and v_candidate->>'unit'='NONE')
      or (v_path='tract.divisible' and v_candidate->>'normalizedValueType'='boolean'
        and v_candidate->>'unit'='NONE')
      or (v_path in ('land.areaAcres','tract.minimumAreaAcres')
        and v_candidate->>'normalizedValueType'='decimal' and v_candidate->>'unit'='ACRES')
      or (v_path='land.areaSf' and v_candidate->>'normalizedValueType'='decimal'
        and v_candidate->>'unit'='SF')
      or (v_path='pricing.askingPrice' and v_candidate->>'normalizedValueType'='decimal'
        and v_candidate->>'unit'='USD')
      or (v_path='pricing.askingPricePerLandSf' and v_candidate->>'normalizedValueType'='decimal'
        and v_candidate->>'unit'='USD_PER_LAND_SF')
      or (v_path='access.frontageFeet' and v_candidate->>'normalizedValueType'='decimal'
        and v_candidate->>'unit'='FEET')
      or (v_path='traffic.vehiclesPerDay' and v_candidate->>'normalizedValueType'='integer'
        and v_candidate->>'unit'='VEHICLES_PER_DAY')
    ) then
      raise exception using errcode='22023', message='candidate_source_contract_invalid';
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

revoke execute on function public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)
  to service_role;
