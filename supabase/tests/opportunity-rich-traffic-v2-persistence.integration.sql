\set ON_ERROR_STOP on

do $$ begin
  if to_regclass('pg_temp.rich_traffic_acl_before') is null then raise exception 'pre-migration ACL snapshot missing'; end if;
  if exists(select 1 from pg_temp.rich_traffic_acl_before b join pg_class c on c.oid=b.oid where c.relacl is distinct from b.relacl) then raise exception 'table ACL changed'; end if;
end $$;

insert into public.opportunity_ingestions(id,entry_type,requested_by_email)
values ('e3100000-0000-4000-8000-000000000001','pdf','fixture@upperlineco.com');
select * from public.finalize_opportunity_verified_artifact(
  'e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001',
  'private','ingestions/traffic-v2.pdf','traffic-v2.pdf','application/pdf','application/pdf',1000,repeat('e',64),2,'{}','fixture@upperlineco.com');

create function pg_temp.traffic_v2_value(p_amy boolean default false) returns jsonb language sql immutable as $$
select jsonb_build_object('kind','traffic_count','schemaVersion',2,
  'count',case when p_amy then 3172 else 10732 end,'unit','vehicles_per_day',
  'basis',jsonb_build_object('normalized','unknown','sourceLiteral','Avg Daily Volume'),
  'sourceVolumeType','MPSI','roadway',jsonb_build_object('sourceLiteral',case when p_amy then 'Amy Shores Ct' else 'Greenbusch Rd' end),
  'crossStreet',case when p_amy then 'null'::jsonb else jsonb_build_object('sourceLiteral','Roesner Rd') end,
  'crossStreetOffset',jsonb_build_object('distance',case when p_amy then 0 else 0.21 end,'unit','miles','direction',case when p_amy then null else 'NW' end),
  'sourceRelativeSubjectDistance',jsonb_build_object('distance',case when p_amy then 0.06 else 0.12 end,'unit','miles'),
  'measurementTime',jsonb_build_object('role','measurement','precision','year','year',case when p_amy then 2024 else 2025 end,'month',null,'day',null)); $$;

create function pg_temp.traffic_v2_candidate(p_id uuid,p_value jsonb,p_ordinal integer default 0,p_group text default 'traffic_count:2') returns jsonb language sql volatile as $$
select jsonb_build_object('id',p_id,'destinationDomain','source','fieldPath','traffic.vehiclesPerDay','candidateTenantKey',null,
  'assertionBasis','source_stated','economicRole','descriptive_fact','rawValue',p_value,'normalizedValueType','json','normalizedValue',p_value,
  'unit','VEHICLES_PER_DAY','confidence',null,'validationState','valid','validationIssues','[]'::jsonb,'groupKey',p_group,'ordinal',p_ordinal,
  'fingerprint',repeat(substr(md5(p_id::text),1,1),64),'evidence',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'pageNumber',1,
  'snippet','Traffic source row','sectionLabel','Traffic','extractionMethod','provider_text','extractionVersion','openai-land-flyer-v3','ordinal',0))); $$;

create function pg_temp.reject_traffic_v2(p_label text,p_candidate jsonb) returns void language plpgsql as $$
declare v_run uuid:=gen_random_uuid(); begin
  perform public.allocate_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001',v_run,
    'reject-v2-'||p_label,'land-flyer','openai-land-flyer-v3','openai','gpt-5.6-terra','strict-json-v3','land-flyer-v3','land-flyer-v3',repeat('e',64),'fixture@upperlineco.com');
  begin perform public.complete_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001',v_run,jsonb_build_array(p_candidate),'[]');
    raise exception 'expected rejection missing: %',p_label;
  exception when invalid_parameter_value then if sqlerrm<>'candidate_source_contract_invalid' then raise; end if; end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id=v_run) or exists(select 1 from public.opportunity_candidate_fact_evidence where extraction_run_id=v_run) then raise exception 'partial persistence: %',p_label; end if;
  perform public.fail_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001',v_run,'INVALID','fixture','[]');
end $$;

-- Real Greenbusch and Amy Shores shapes round-trip without semantic loss.
select * from public.allocate_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001','e3300000-0000-4000-8000-000000000001','traffic-v2-valid','land-flyer','openai-land-flyer-v3','openai','gpt-5.6-terra','strict-json-v3','land-flyer-v3','land-flyer-v3',repeat('e',64),'fixture@upperlineco.com');
select * from public.complete_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001','e3300000-0000-4000-8000-000000000001',jsonb_build_array(
  pg_temp.traffic_v2_candidate('e3400000-0000-4000-8000-000000000001',pg_temp.traffic_v2_value(false),0),
  pg_temp.traffic_v2_candidate('e3400000-0000-4000-8000-000000000002',pg_temp.traffic_v2_value(true),1)),'[]');
do $$ begin
  if (select normalized_value from public.opportunity_candidate_facts where id='e3400000-0000-4000-8000-000000000001') is distinct from pg_temp.traffic_v2_value(false) then raise exception 'Greenbusch proposition changed'; end if;
  if (select normalized_value from public.opportunity_candidate_facts where id='e3400000-0000-4000-8000-000000000002') is distinct from pg_temp.traffic_v2_value(true) then raise exception 'Amy Shores proposition changed'; end if;
end $$;

-- V1/V2 confusion, unknown keys, malformed nested values, and null/zero confusion fail closed.
select pg_temp.reject_traffic_v2('v2-with-v1-group',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value(),0,'traffic_count:1'));
select pg_temp.reject_traffic_v2('v1-with-v2-group',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_build_object('kind','traffic_count','schemaVersion',1),0));
select pg_temp.reject_traffic_v2('wrong-kind',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()||'{"kind":"other"}'));
select pg_temp.reject_traffic_v2('wrong-version',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()||'{"schemaVersion":3}'));
select pg_temp.reject_traffic_v2('missing-nested',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()-'crossStreetOffset'));
select pg_temp.reject_traffic_v2('unknown-top',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()||'{"countLocation":"smuggled"}'));
select pg_temp.reject_traffic_v2('unknown-nested',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(),'{crossStreetOffset}',(pg_temp.traffic_v2_value()->'crossStreetOffset')||'{"location":"smuggled"}')));
select pg_temp.reject_traffic_v2('wrong-unit',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(),'{sourceRelativeSubjectDistance,unit}','"feet"')));
select pg_temp.reject_traffic_v2('negative-distance',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(),'{crossStreetOffset,distance}','-0.1')));
select pg_temp.reject_traffic_v2('bad-direction',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(),'{crossStreetOffset,direction}','"northwest"')));
select pg_temp.reject_traffic_v2('missing-nullable',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()-'crossStreet'));
select pg_temp.reject_traffic_v2('arbitrary-json',pg_temp.traffic_v2_candidate(gen_random_uuid(),'{"anything":true}'));
select pg_temp.reject_traffic_v2('wrong-destination',pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value())||'{"fieldPath":"access.roadName"}');
select pg_temp.reject_traffic_v2('null-zero-confusion',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(true),'{crossStreetOffset,unit}','null')));
select pg_temp.reject_traffic_v2('volume-type-in-basis',pg_temp.traffic_v2_candidate(gen_random_uuid(),jsonb_set(pg_temp.traffic_v2_value(),'{basis,sourceLiteral}','"MPSI"')));

-- A preceding valid candidate is rolled back with a malformed V2 candidate.
select * from public.allocate_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001','e3300000-0000-4000-8000-000000000002','traffic-v2-atomic','land-flyer','openai-land-flyer-v3','openai','gpt-5.6-terra','strict-json-v3','land-flyer-v3','land-flyer-v3',repeat('e',64),'fixture@upperlineco.com');
do $$ begin begin perform public.complete_opportunity_extraction_run('e3100000-0000-4000-8000-000000000001','e3200000-0000-4000-8000-000000000001','e3300000-0000-4000-8000-000000000002',jsonb_build_array(
  jsonb_build_object('id',gen_random_uuid(),'destinationDomain','source','fieldPath','document.title','assertionBasis','source_stated','economicRole','descriptive_fact','normalizedValueType','text','normalizedValue','roll back','unit','NONE','validationState','valid','validationIssues','[]'::jsonb,'ordinal',0,'fingerprint',repeat('f',64),'evidence','[]'::jsonb),
  pg_temp.traffic_v2_candidate(gen_random_uuid(),pg_temp.traffic_v2_value()-'roadway',1)),'[]'); raise exception 'mixed completion succeeded'; exception when invalid_parameter_value then null; end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id='e3300000-0000-4000-8000-000000000002') then raise exception 'mixed completion partially persisted'; end if;
end $$;

do $$ begin
  if has_function_privilege('public','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') or has_function_privilege('anon','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then raise exception 'browser execute grant'; end if;
  if not has_function_privilege('service_role','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then raise exception 'service execute missing'; end if;
end $$;

select 'traffic V2 persistence integration passed' as result;
