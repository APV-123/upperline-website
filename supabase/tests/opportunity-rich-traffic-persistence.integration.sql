\set ON_ERROR_STOP on

-- Capture the exact pre-migration ACLs in the same psql session. The runner
-- applies the new migration between this snapshot and the assertions below.
do $$ begin
  if to_regclass('pg_temp.rich_traffic_acl_before') is null then
    raise exception 'pre-migration ACL snapshot missing';
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from pg_temp.rich_traffic_acl_before b
    join pg_class c on c.oid=b.oid
    where c.relacl is distinct from b.relacl
  ) then raise exception 'table ACL changed'; end if;
  if has_function_privilege('public','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE')
    or has_function_privilege('anon','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then
    raise exception 'browser execution authority present';
  end if;
  if not has_function_privilege('service_role','public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE') then
    raise exception 'service role execution authority missing';
  end if;
  if position('SECURITY DEFINER' in upper(pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure)))>0
    or (select proconfig from pg_proc where oid='public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure)
       is distinct from array['search_path=""']::text[] then
    raise exception 'completion function security posture changed';
  end if;
end $$;

insert into public.opportunity_ingestions(id,entry_type,requested_by_email)
values ('d3100000-0000-4000-8000-000000000001','pdf','fixture@upperlineco.com');

select * from public.finalize_opportunity_verified_artifact(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'private','ingestions/katy.pdf','katy.pdf','application/pdf','application/pdf',1975102,repeat('d',64),9,
  '{}','fixture@upperlineco.com');

create function pg_temp.rich_value(p_count integer default 3194, p_year integer default 2025)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'kind','traffic_count','schemaVersion',1,'count',p_count,'unit','vehicles_per_day',
    'basis',jsonb_build_object('normalized','unknown','sourceLiteral','MPSI'),
    'roadway',jsonb_build_object('sourceLiteral','Saddlespur Lane'),
    'countLocation','Saddlespur Lane','direction',null,
    'measurementTime',jsonb_build_object('role','measurement','precision','year','year',p_year,'month',null,'day',null));
$$;

create function pg_temp.rich_candidate(p_id uuid, p_fingerprint text, p_ordinal integer,
  p_value jsonb default pg_temp.rich_value(), p_group_key text default 'traffic_count:1')
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id',p_id,'destinationDomain','source','fieldPath','traffic.vehiclesPerDay',
    'candidateTenantKey',null,'assertionBasis','source_stated','economicRole','descriptive_fact',
    'rawValue',p_value,'normalizedValueType','json','normalizedValue',p_value,
    'unit','VEHICLES_PER_DAY','confidence','0.97','validationState','valid',
    'validationIssues','[]'::jsonb,'groupKey',p_group_key,'ordinal',p_ordinal,
    'fingerprint',p_fingerprint,
    'evidence',jsonb_build_array(jsonb_build_object(
      'id',gen_random_uuid(),'pageNumber',1,'snippet','MPSI 3,194 VPD (2025)',
      'sectionLabel','Traffic','extractionMethod','provider_text',
      'extractionVersion','openai-land-flyer-v2','ordinal',0)));
$$;

create function pg_temp.expect_rejection(p_label text, p_candidate jsonb)
returns void language plpgsql as $$
declare v_run uuid:=gen_random_uuid();
begin
  perform public.allocate_opportunity_extraction_run(
    'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',v_run,
    'reject-'||p_label,'land-flyer','openai-land-flyer-v2','openai','gpt-5.6-terra',
    'strict-json-v2','land-flyer-v2','land-flyer-v2',repeat('d',64),'fixture@upperlineco.com');
  begin
    perform public.complete_opportunity_extraction_run(
      'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',v_run,
      jsonb_build_array(p_candidate),'[]');
    raise exception 'rich traffic rejection missing: %',p_label;
  exception when invalid_parameter_value then
    if sqlerrm<>'candidate_source_contract_invalid' then raise; end if;
  end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id=v_run)
    or exists(select 1 from public.opportunity_candidate_fact_evidence where extraction_run_id=v_run) then
    raise exception 'rejected completion persisted output: %',p_label;
  end if;
  perform public.fail_opportunity_extraction_run(
    'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',v_run,
    'INVALID','fixture rejection','[]');
end $$;

-- Fundamental rich-family rejection matrix.
select pg_temp.expect_rejection('missing-group',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('1',64),0)-'groupKey');
select pg_temp.expect_rejection('wrong-group',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('2',64),0)||'{"groupKey":"traffic_count:2"}');
select pg_temp.expect_rejection('wrong-kind',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('3',64),0,
    pg_temp.rich_value()||'{"kind":"arbitrary_metric"}'));
select pg_temp.expect_rejection('wrong-version',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('4',64),0,
    pg_temp.rich_value()||'{"schemaVersion":2}'));
select pg_temp.expect_rejection('wrong-unit',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('5',64),0)||'{"unit":"COUNT"}');
select pg_temp.expect_rejection('rich-as-integer',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('6',64),0)||'{"normalizedValueType":"integer"}');
select pg_temp.expect_rejection('scalar-as-rich',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('7',64),0)||'{"normalizedValue":"3194"}');
select pg_temp.expect_rejection('arbitrary-json',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('8',64),0,'{"anything":true}'));
select pg_temp.expect_rejection('wrong-field',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('9',64),0)||'{"fieldPath":"access.roadName"}');
select pg_temp.expect_rejection('missing-structure',
  pg_temp.rich_candidate(gen_random_uuid(),repeat('a',64),0,pg_temp.rich_value()-'basis'));

-- Historical V1 scalar traffic remains accepted without imposing new group-key semantics.
select * from public.allocate_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001','v1-scalar','land-flyer','openai-land-flyer-v1',
  'openai','gpt-5.6-terra','strict-json-v1','land-flyer-v1','land-flyer-v1',repeat('d',64),'fixture@upperlineco.com');
select * from public.complete_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001',
  '[{"id":"d3400000-0000-4000-8000-000000000001","destinationDomain":"source","fieldPath":"traffic.vehiclesPerDay","assertionBasis":"source_stated","economicRole":"descriptive_fact","normalizedValueType":"integer","normalizedValue":"3194","unit":"VEHICLES_PER_DAY","validationState":"valid","validationIssues":[],"ordinal":0,"fingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","evidence":[]}]','[]');

-- A valid mixed completion persists one scalar and two distinct rich propositions atomically.
select * from public.allocate_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000002','v2-mixed','land-flyer','openai-land-flyer-v2',
  'openai','gpt-5.6-terra','strict-json-v2','land-flyer-v2','land-flyer-v2',repeat('d',64),'fixture@upperlineco.com');
select * from public.complete_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000002',
  jsonb_build_array(
    jsonb_build_object('id','d3400000-0000-4000-8000-000000000002','destinationDomain','source',
      'fieldPath','document.title','assertionBasis','source_stated','economicRole','descriptive_fact',
      'normalizedValueType','text','normalizedValue','Katy Traffic Fixture','unit','NONE',
      'validationState','valid','validationIssues','[]'::jsonb,'ordinal',0,
      'fingerprint',repeat('c',64),'evidence','[]'::jsonb),
    pg_temp.rich_candidate('d3400000-0000-4000-8000-000000000003',repeat('d',64),1,pg_temp.rich_value(3194,2025)),
    pg_temp.rich_candidate('d3400000-0000-4000-8000-000000000004',repeat('e',64),2,pg_temp.rich_value(4200,2026))
  ),'[]');

do $$ begin
  if (select count(*) from public.opportunity_candidate_facts where extraction_run_id='d3300000-0000-4000-8000-000000000002')<>3
    or (select count(*) from public.opportunity_candidate_fact_evidence where extraction_run_id='d3300000-0000-4000-8000-000000000002')<>2 then
    raise exception 'valid mixed completion was not atomic';
  end if;
  if (select normalized_value from public.opportunity_candidate_facts where id='d3400000-0000-4000-8000-000000000003')
      is distinct from pg_temp.rich_value(3194,2025) then raise exception 'Katy proposition changed during persistence'; end if;
  if (select count(distinct candidate_fingerprint) from public.opportunity_candidate_facts
      where id in ('d3400000-0000-4000-8000-000000000003','d3400000-0000-4000-8000-000000000004'))<>2 then
    raise exception 'rich proposition fingerprints collapsed';
  end if;
  if (select array_agg(candidate_fingerprint order by candidate_fingerprint) from public.opportunity_candidate_facts
      where id in ('d3400000-0000-4000-8000-000000000003','d3400000-0000-4000-8000-000000000004'))
      is distinct from array[repeat('d',64),repeat('e',64)] then
    raise exception 'provided rich proposition fingerprints changed';
  end if;
end $$;

-- A valid candidate followed by malformed rich traffic must roll back as one completion.
select * from public.allocate_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000003','v2-atomic-reject','land-flyer','openai-land-flyer-v2',
  'openai','gpt-5.6-terra','strict-json-v2','land-flyer-v2','land-flyer-v2',repeat('d',64),'fixture@upperlineco.com');
do $$ begin
  begin
    perform public.complete_opportunity_extraction_run(
      'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
      'd3300000-0000-4000-8000-000000000003',
      jsonb_build_array(
        jsonb_build_object('id',gen_random_uuid(),'destinationDomain','source','fieldPath','document.title',
          'assertionBasis','source_stated','economicRole','descriptive_fact','normalizedValueType','text',
          'normalizedValue','Must roll back','unit','NONE','validationState','valid','validationIssues','[]'::jsonb,
          'ordinal',0,'fingerprint',repeat('f',64),'evidence',jsonb_build_array(jsonb_build_object(
            'id',gen_random_uuid(),'pageNumber',1,'snippet','title','extractionMethod','provider_text',
            'extractionVersion','openai-land-flyer-v2','ordinal',0))),
        pg_temp.rich_candidate(gen_random_uuid(),repeat('0',64),1,pg_temp.rich_value()-'measurementTime')),
      '[]');
    raise exception 'mixed invalid completion succeeded';
  exception when invalid_parameter_value then
    if sqlerrm<>'candidate_source_contract_invalid' then raise; end if;
  end;
  if exists(select 1 from public.opportunity_candidate_facts where extraction_run_id='d3300000-0000-4000-8000-000000000003')
    or exists(select 1 from public.opportunity_candidate_fact_evidence where extraction_run_id='d3300000-0000-4000-8000-000000000003') then
    raise exception 'mixed invalid completion left partial output';
  end if;
end $$;

select * from public.fail_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000003','INVALID','fixture rejection','[]');

-- The immutable failed attempt remains attempt 1; an explicit retry allocates
-- attempt 2 under the same durable logical extraction identity.
select * from public.allocate_opportunity_extraction_retry(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000004','v2-atomic-reject',
  'd3500000-0000-4000-8000-000000000001','land-flyer','openai-land-flyer-v2',
  'openai','gpt-5.6-terra','strict-json-v2','land-flyer-v2','land-flyer-v2',
  repeat('d',64),'fixture@upperlineco.com');
do $$ begin
  if (select attempt_number from public.opportunity_extraction_runs where id='d3300000-0000-4000-8000-000000000004')<>2
    or (select retry_of_run_id from public.opportunity_extraction_runs where id='d3300000-0000-4000-8000-000000000004')
      is distinct from 'd3300000-0000-4000-8000-000000000003'::uuid
    or (select status from public.opportunity_extraction_runs where id='d3300000-0000-4000-8000-000000000003')<>'failed' then
    raise exception 'failed-attempt retry history changed';
  end if;
end $$;
select * from public.fail_opportunity_extraction_run(
  'd3100000-0000-4000-8000-000000000001','d3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000004','FIXTURE_COMPLETE','fixture cleanup','[]');

select 'rich traffic persistence integration passed' as result;
