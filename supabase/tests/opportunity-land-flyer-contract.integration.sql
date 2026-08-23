\set ON_ERROR_STOP on

insert into public.opportunity_ingestions(id,entry_type,requested_by_email)
values ('a1000000-0000-4000-8000-000000000001','pdf','test@upperlineco.com');

select * from public.finalize_opportunity_verified_artifact(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'private','ingestions/land.pdf','land.pdf','application/pdf','application/pdf',100,repeat('a',64),2,'{}','test@upperlineco.com');
select * from public.allocate_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001','land-run','pdf-text','1','provider','model','parser','prompt','vocab',repeat('a',64),'test@upperlineco.com');

select * from public.complete_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',
  (select jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid(), 'destinationDomain','source', 'fieldPath',field_path,
    'assertionBasis',basis, 'economicRole','descriptive_fact',
    'normalizedValueType',value_type, 'normalizedValue',case value_type when 'boolean' then 'true'::jsonb when 'integer' then '"25000"'::jsonb when 'decimal' then '"1.25"'::jsonb else '"example"'::jsonb end,
    'unit',unit, 'validationState','valid', 'validationIssues','[]'::jsonb,
    'ordinal',ordinal, 'fingerprint',encode(digest(field_path,'sha256'),'hex'), 'evidence','[]'::jsonb
  ) order by ordinal) from (values
    ('document.title','text','NONE','source_stated',0),('property.marketedType','text','NONE','visual_inference',1),('location.intersection','text','NONE','model_inference',2),
    ('land.areaAcres','decimal','ACRES','deterministically_derived',3),('land.areaSf','decimal','SF','source_stated',4),('tract.divisible','boolean','NONE','source_stated',5),('tract.minimumAreaAcres','decimal','ACRES','source_stated',6),
    ('pricing.askingPrice','decimal','USD','source_stated',7),('pricing.askingPricePerLandSf','decimal','USD_PER_LAND_SF','source_stated',8),('site.zoning','text','NONE','source_stated',9),('site.utilities','text','NONE','source_stated',10),
    ('site.detentionClaim','text','NONE','source_stated',11),('site.floodplainClaim','text','NONE','source_stated',12),('site.wetlandsClaim','text','NONE','source_stated',13),('site.easementClaim','text','NONE','source_stated',14),('site.pipelineClaim','text','NONE','source_stated',15),('site.wellClaim','text','NONE','source_stated',16),('site.cityLimitStatus','text','NONE','source_stated',17),('site.etjStatus','text','NONE','source_stated',18),('site.municipalDistrict','text','NONE','source_stated',19),('site.tirz','text','NONE','source_stated',20),
    ('access.roadName','text','NONE','source_stated',21),('access.frontageFeet','decimal','FEET','source_stated',22),('access.pointDescription','text','NONE','source_stated',23),('access.signalizedIntersectionClaim','text','NONE','source_stated',24),('traffic.vehiclesPerDay','integer','VEHICLES_PER_DAY','source_stated',25),
    ('broker.brokerage','text','NONE','source_stated',26),('broker.contactName','text','NONE','source_stated',27),('broker.phone','text','NONE','source_stated',28),('broker.email','text','NONE','source_stated',29),('marketing.suggestedUse','text','NONE','source_stated',30)
  ) v(field_path,value_type,unit,basis,ordinal)), '[]');

do $$ begin
  if (select count(*) from public.opportunity_candidate_facts where extraction_run_id='a3000000-0000-4000-8000-000000000001')<>31 then raise exception 'source vocabulary not persisted'; end if;
  if not has_function_privilege('service_role','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then raise exception 'service role grant missing'; end if;
  if has_function_privilege('authenticated','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then raise exception 'browser grant present'; end if;
end $$;

select * from public.allocate_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','bad-run','pdf-text','1','provider','model','parser','prompt','vocab',repeat('a',64),'test');
do $$ begin
  begin
    perform public.complete_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002',
      '[{"id":"a4000000-0000-4000-8000-000000000001","destinationDomain":"source","fieldPath":"market.demographicObservation","assertionBasis":"source_stated","economicRole":"descriptive_fact","normalizedValueType":"text","normalizedValue":"x","validationState":"valid","validationIssues":[],"ordinal":0,"fingerprint":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","evidence":[]}]','[]');
    raise exception 'deferred source field accepted'; exception when invalid_parameter_value then null;
  end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id='a3000000-0000-4000-8000-000000000002') then raise exception 'failed completion was not atomic'; end if;
end $$;

select * from public.fail_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','INVALID','invalid','[]');
select * from public.allocate_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','unit-run','pdf-text','1','provider','model','parser','prompt','vocab',repeat('a',64),'test');
do $$ begin
  begin
    perform public.complete_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003',
      '[{"id":"a4000000-0000-4000-8000-000000000003","destinationDomain":"source","fieldPath":"land.areaAcres","assertionBasis":"source_stated","economicRole":"descriptive_fact","normalizedValueType":"decimal","normalizedValue":"1.25","unit":"USD","validationState":"valid","validationIssues":[],"ordinal":0,"fingerprint":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","evidence":[]}]','[]');
    raise exception 'wrong source unit accepted'; exception when invalid_parameter_value then null;
  end;
end $$;

select * from public.fail_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','INVALID','invalid','[]');
select * from public.allocate_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','legacy-run','pdf-text','1','provider','model','parser','prompt','vocab',repeat('a',64),'test');
select * from public.complete_opportunity_extraction_run(
  'a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004',
  '[{"id":"a4000000-0000-4000-8000-000000000010","destinationDomain":"opportunity","fieldPath":"name","assertionBasis":"source_stated","economicRole":"descriptive_fact","normalizedValueType":"text","normalizedValue":"Legacy","validationState":"valid","validationIssues":[],"ordinal":0,"fingerprint":"1111111111111111111111111111111111111111111111111111111111111111","evidence":[]},{"id":"a4000000-0000-4000-8000-000000000011","destinationDomain":"underwriting","fieldPath":"site.landAreaSf","assertionBasis":"deterministically_derived","economicRole":"source_assumption","normalizedValueType":"decimal","normalizedValue":"1000","unit":"SF","validationState":"valid","validationIssues":[],"ordinal":1,"fingerprint":"2222222222222222222222222222222222222222222222222222222222222222","evidence":[]},{"id":"a4000000-0000-4000-8000-000000000012","destinationDomain":"tenant","fieldPath":"name","candidateTenantKey":"a5000000-0000-4000-8000-000000000001","assertionBasis":"source_stated","economicRole":"descriptive_fact","normalizedValueType":"text","normalizedValue":"Tenant","validationState":"valid","validationIssues":[],"ordinal":2,"fingerprint":"3333333333333333333333333333333333333333333333333333333333333333","evidence":[]}]','[]');

do $$ begin
  if (select count(distinct destination_domain) from public.opportunity_candidate_facts where extraction_run_id='a3000000-0000-4000-8000-000000000004')<>3 then raise exception 'existing destination domains regressed'; end if;
end $$;

select * from public.allocate_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','assumption-run','pdf-text','1','provider','model','parser','prompt','vocab',repeat('a',64),'test');
do $$ begin
  begin
    perform public.complete_opportunity_extraction_run('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005',
      '[{"id":"a4000000-0000-4000-8000-000000000002","destinationDomain":"source","fieldPath":"document.title","assertionBasis":"model_inference","economicRole":"upperline_assumption","normalizedValueType":"text","normalizedValue":"x","validationState":"valid","validationIssues":[],"ordinal":0,"fingerprint":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","evidence":[]}]','[]');
    raise exception 'assumption accepted'; exception when invalid_parameter_value then null;
  end;
end $$;
