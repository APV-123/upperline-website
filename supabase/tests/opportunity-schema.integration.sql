\set ON_ERROR_STOP on

begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'assertion failed: %', message; end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_message text default null)
returns void language plpgsql as $$
declare
  failed boolean := false;
  failure_message text;
begin
  begin
    execute statement;
  exception when others then
    failed := true;
    failure_message := sqlerrm;
  end;
  if not failed then raise exception 'expected statement to fail: %', statement; end if;
  if expected_message is not null and position(expected_message in failure_message) = 0 then
    raise exception 'unexpected error for %: %', statement, failure_message;
  end if;
end;
$$;

-- Fixed fixture identities keep dynamic assertions readable.
insert into public.deals (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');

do $$
declare
  stage_name text;
  stage_number integer := 10;
  deal_id uuid;
begin
  foreach stage_name in array array[
    'new', 'screening', 'diligence', 'loi_preparation', 'loi_submitted',
    'negotiation', 'under_contract', 'promoted_to_deal', 'dead'
  ] loop
    deal_id := case when stage_name = 'promoted_to_deal'
      then '00000000-0000-0000-0000-000000000003'::uuid else null end;
    insert into public.acquisition_opportunities
      (id, name, stage, promoted_deal_id, created_by_email, updated_by_email)
    values
      (('10000000-0000-0000-0000-' || lpad(stage_number::text, 12, '0'))::uuid,
       'Stage ' || stage_name, stage_name, deal_id, 'test@upperlineco.com', 'test@upperlineco.com');
    stage_number := stage_number + 1;
  end loop;
end;
$$;

select pg_temp.expect_error($sql$
  insert into public.acquisition_opportunities
    (name, stage, created_by_email, updated_by_email)
  values ('Invalid', 'invalid', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$
  insert into public.acquisition_opportunities
    (name, stage, created_by_email, updated_by_email)
  values ('Missing deal', 'promoted_to_deal', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);

insert into public.acquisition_opportunities
  (id, name, stage, promoted_deal_id, created_by_email, updated_by_email)
values
  ('20000000-0000-0000-0000-000000000001', 'Primary', 'new', null, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('20000000-0000-0000-0000-000000000002', 'With Deal', 'screening', '00000000-0000-0000-0000-000000000001', 'test@upperlineco.com', 'test@upperlineco.com'),
  ('20000000-0000-0000-0000-000000000003', 'Secondary', 'new', null, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('20000000-0000-0000-0000-000000000004', 'Historical', 'screening', null, 'test@upperlineco.com', 'test@upperlineco.com');

select pg_temp.expect_error($sql$
  insert into public.acquisition_opportunities
    (name, promoted_deal_id, created_by_email, updated_by_email)
  values ('Duplicate deal', '00000000-0000-0000-0000-000000000001', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$delete from public.deals where id = '00000000-0000-0000-0000-000000000001'$sql$);

-- Sources.
insert into public.opportunity_sources
  (id, opportunity_id, source_type, is_primary, created_by_email, updated_by_email)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'listing', true, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'document', false, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'manual', false, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'listing', false, 'test@upperlineco.com', 'test@upperlineco.com'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004', 'listing', true, 'test@upperlineco.com', 'test@upperlineco.com');

select pg_temp.expect_error($sql$
  insert into public.opportunity_sources
    (opportunity_id, source_type, created_by_email, updated_by_email)
  values ('20000000-0000-0000-0000-000000000001', 'invalid', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$
  insert into public.opportunity_sources
    (opportunity_id, source_type, is_primary, created_by_email, updated_by_email)
  values ('20000000-0000-0000-0000-000000000001', 'manual', true, 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$
  insert into public.opportunity_sources
    (opportunity_id, source_type, created_by_email, updated_by_email)
  values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'manual', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
delete from public.opportunity_sources where id = '30000000-0000-0000-0000-000000000003';

-- Version roots and valid same-scope lineage.
insert into public.opportunity_underwriting_versions
  (id, opportunity_id, underwriting_type, version_number, status, is_active,
   input_payload, calculation_policy, created_by_email, updated_by_email)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'retail_development', 1, 'draft', true,
   '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'retail_development', 1, 'draft', true,
   '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com');

insert into public.opportunity_underwriting_versions
  (id, opportunity_id, underwriting_type, version_number, based_on_version_id,
   input_payload, calculation_policy, created_by_email, updated_by_email)
values
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'retail_development', 2,
   '40000000-0000-0000-0000-000000000001',
   '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com');

select pg_temp.expect_error($sql$
  insert into public.opportunity_underwriting_versions
    (opportunity_id, underwriting_type, version_number, input_payload, calculation_policy, created_by_email, updated_by_email)
  values ('20000000-0000-0000-0000-000000000001', 'retail_development', 1,
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$
  update public.opportunity_underwriting_versions set is_active = true
  where id = '40000000-0000-0000-0000-000000000002'
$sql$);
select pg_temp.expect_error($sql$
  insert into public.opportunity_underwriting_versions
    (opportunity_id, underwriting_type, version_number, based_on_version_id, input_payload, calculation_policy, created_by_email, updated_by_email)
  values ('20000000-0000-0000-0000-000000000003', 'retail_development', 2,
    '40000000-0000-0000-0000-000000000001',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
select pg_temp.expect_error($sql$
  insert into public.opportunity_underwriting_versions
    (id, opportunity_id, underwriting_type, version_number, based_on_version_id, input_payload, calculation_policy, created_by_email, updated_by_email)
  values ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'retail_development', 9,
    '40000000-0000-0000-0000-000000000009',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);
-- V1 type check intentionally prevents constructing a second underwriting type.
select pg_temp.expect_error($sql$
  insert into public.opportunity_underwriting_versions
    (opportunity_id, underwriting_type, version_number, input_payload, calculation_policy, created_by_email, updated_by_email)
  values ('20000000-0000-0000-0000-000000000001', 'future_type', 1,
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{}', 'test@upperlineco.com', 'test@upperlineco.com')
$sql$);

-- Final snapshots, including incomplete finalization.
insert into public.opportunity_underwriting_versions
  (id, opportunity_id, underwriting_type, version_number, status, input_payload,
   result_payload, calculation_policy, calculation_version, input_hash,
   calculated_at, finalized_at, is_complete, screen_result,
   blocking_error_count, warning_count, created_by_email, updated_by_email)
values
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'retail_development', 1, 'draft',
   '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{"diagnostics":[]}', '{}',
   'retail-development-v1.0.0', 'hash-complete', now(), now(), true, 'PURSUE', 0, 0,
   'creator@upperlineco.com', 'test@upperlineco.com'),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'retail_development', 2, 'final',
   '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', '{"diagnostics":[{"severity":"error"}]}', '{}',
   'retail-development-v1.0.0', 'hash-incomplete', now(), now(), false, 'REVIEW', 1, 0,
   'creator@upperlineco.com', 'test@upperlineco.com');

-- Attach provenance before finalizing the historical version.
insert into public.opportunity_field_provenance
  (id, opportunity_id, underwriting_version_id, opportunity_source_id, scope,
   field_path, provenance_type, normalized_value, created_by_email)
values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005',
   'underwriting', 'site.landAreaSf', 'listing_extraction', '100000', 'test@upperlineco.com');
update public.opportunity_underwriting_versions
set status = 'final'
where id = '40000000-0000-0000-0000-000000000004';

do $$
declare
  base text := $q$insert into public.opportunity_underwriting_versions
    (opportunity_id, underwriting_type, version_number, status, input_payload,
     result_payload, calculation_policy, calculation_version, input_hash,
     calculated_at, finalized_at, is_complete, created_by_email, updated_by_email)
    values ('20000000-0000-0000-0000-000000000001', 'retail_development', %s, 'final',
      '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}', %s, '{}', %s, %s, %s, %s, %s,
      'test@upperlineco.com', 'test@upperlineco.com')$q$;
begin
  perform pg_temp.expect_error(format(base, 20, 'null', quote_literal('v1'), quote_literal('h'), 'now()', 'now()', 'true'));
  perform pg_temp.expect_error(format(base, 21, quote_literal('{}'), 'null', quote_literal('h'), 'now()', 'now()', 'true'));
  perform pg_temp.expect_error(format(base, 22, quote_literal('{}'), quote_literal('v1'), 'null', 'now()', 'now()', 'true'));
  perform pg_temp.expect_error(format(base, 23, quote_literal('{}'), quote_literal('v1'), quote_literal('h'), 'null', 'now()', 'true'));
  perform pg_temp.expect_error(format(base, 24, quote_literal('{}'), quote_literal('v1'), quote_literal('h'), 'now()', 'null', 'true'));
  perform pg_temp.expect_error(format(base, 25, quote_literal('{}'), quote_literal('v1'), quote_literal('h'), 'now()', 'now()', 'null'));
end;
$$;

-- Every protected final category rejects mutation.
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set input_payload = input_payload || '{"x":1}' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set result_payload = '{"changed":true}' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set calculation_policy = '{"x":1}' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set calculation_version = 'changed' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set input_hash = 'changed' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set calculated_at = now() + interval '1 day' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set finalized_at = now() + interval '1 day' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set return_on_cost = 0.1 where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set screen_result = 'PASS' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set is_complete = false where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set blocking_error_count = 1 where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set based_on_version_id = '40000000-0000-0000-0000-000000000001' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set status = 'draft' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set created_by_email = 'changed@upperlineco.com' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_underwriting_versions set created_at = now() + interval '1 day' where id='40000000-0000-0000-0000-000000000004'$sql$, 'immutable');
update public.opportunity_underwriting_versions
set is_active = true, updated_by_email = 'operator@upperlineco.com'
where id = '40000000-0000-0000-0000-000000000004';
select pg_temp.expect_error($sql$delete from public.opportunity_underwriting_versions where id='40000000-0000-0000-0000-000000000004'$sql$, 'historical');

-- Final provenance is immutable in every direction.
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id, underwriting_version_id, scope, field_path, provenance_type, created_by_email)
  values ('20000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','underwriting','site.targetFar','manual','test@upperlineco.com')$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set normalized_value='200000' where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set opportunity_source_id=null where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set field_path='site.targetFar' where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set tenant_key='60000000-0000-0000-0000-000000000001' where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set superseded_at=now() where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance set underwriting_version_id='40000000-0000-0000-0000-000000000002', opportunity_id='20000000-0000-0000-0000-000000000001' where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');
select pg_temp.expect_error($sql$delete from public.opportunity_field_provenance where id='50000000-0000-0000-0000-000000000001'$sql$, 'immutable');

-- Draft provenance and all three current-value uniqueness domains.
insert into public.opportunity_field_provenance
  (id, opportunity_id, scope, field_path, provenance_type, normalized_value, created_by_email)
values ('50000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000001','opportunity','asking_price','manual','1000000','test@upperlineco.com');
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,scope,field_path,provenance_type,created_by_email)
  values ('20000000-0000-0000-0000-000000000001','opportunity','asking_price','manual','test@upperlineco.com')$sql$);
update public.opportunity_field_provenance set superseded_at=now() where id='50000000-0000-0000-0000-000000000010';
insert into public.opportunity_field_provenance
  (id, opportunity_id, scope, field_path, provenance_type, supersedes_provenance_id, created_by_email)
values ('50000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000001','opportunity','asking_price','manual_override','50000000-0000-0000-0000-000000000010','test@upperlineco.com');

insert into public.opportunity_field_provenance
  (id, opportunity_id, underwriting_version_id, scope, field_path, provenance_type, created_by_email)
values ('50000000-0000-0000-0000-000000000012','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','underwriting','site.targetFar','manual','test@upperlineco.com');
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,underwriting_version_id,scope,field_path,provenance_type,created_by_email)
  values ('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','underwriting','site.targetFar','manual','test@upperlineco.com')$sql$);

insert into public.opportunity_field_provenance
  (id, opportunity_id, underwriting_version_id, scope, tenant_key, field_path, provenance_type, created_by_email)
values
 ('50000000-0000-0000-0000-000000000013','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','underwriting','60000000-0000-0000-0000-000000000001','rentalRatePerSfYear','manual','test@upperlineco.com'),
 ('50000000-0000-0000-0000-000000000014','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','underwriting','60000000-0000-0000-0000-000000000002','rentalRatePerSfYear','manual','test@upperlineco.com');
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,underwriting_version_id,scope,tenant_key,field_path,provenance_type,created_by_email)
  values ('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','underwriting','60000000-0000-0000-0000-000000000001','rentalRatePerSfYear','manual','test@upperlineco.com')$sql$);

-- Cross-Opportunity source and supersession references fail.
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,opportunity_source_id,scope,field_path,provenance_type,created_by_email)
  values ('20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','opportunity','asking_price','manual','test@upperlineco.com')$sql$);
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,scope,field_path,provenance_type,supersedes_provenance_id,created_by_email)
  values ('20000000-0000-0000-0000-000000000003','opportunity','asking_price','manual_override','50000000-0000-0000-0000-000000000010','test@upperlineco.com')$sql$);
select pg_temp.expect_error($sql$delete from public.opportunity_sources where id='30000000-0000-0000-0000-000000000005'$sql$);

-- Optimistic concurrency primitives for each revisioned mutable table.
do $$
declare affected integer;
begin
  update public.acquisition_opportunities set notes='revision', revision=revision+1
    where id='20000000-0000-0000-0000-000000000001' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=1, 'Opportunity expected revision');
  update public.acquisition_opportunities set notes='stale', revision=revision+1
    where id='20000000-0000-0000-0000-000000000001' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=0, 'Opportunity stale revision');

  update public.opportunity_sources set title='revision', revision=revision+1
    where id='30000000-0000-0000-0000-000000000002' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=1, 'Source expected revision');
  update public.opportunity_sources set title='stale', revision=revision+1
    where id='30000000-0000-0000-0000-000000000002' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=0, 'Source stale revision');

  update public.opportunity_underwriting_versions set warning_count=1, revision=revision+1
    where id='40000000-0000-0000-0000-000000000002' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=1, 'Version expected revision');
  update public.opportunity_underwriting_versions set warning_count=2, revision=revision+1
    where id='40000000-0000-0000-0000-000000000002' and revision=1;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=0, 'Version stale revision');
end;
$$;

-- Draft-only Opportunity cleanup removes all child data.
insert into public.acquisition_opportunities
  (id,name,created_by_email,updated_by_email)
values ('20000000-0000-0000-0000-000000000010','Disposable','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_sources
  (id,opportunity_id,source_type,created_by_email,updated_by_email)
values ('30000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000010','manual','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_underwriting_versions
  (id,opportunity_id,underwriting_type,version_number,input_payload,calculation_policy,created_by_email,updated_by_email)
values ('40000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000010','retail_development',1,
  '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_field_provenance
  (opportunity_id,underwriting_version_id,opportunity_source_id,scope,field_path,provenance_type,created_by_email)
values ('20000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000010','underwriting','site.targetFar','manual','test@upperlineco.com');
delete from public.acquisition_opportunities where id='20000000-0000-0000-0000-000000000010';
select pg_temp.assert_true(not exists(select 1 from public.opportunity_sources where opportunity_id='20000000-0000-0000-0000-000000000010'), 'draft sources cascade');
select pg_temp.assert_true(not exists(select 1 from public.opportunity_underwriting_versions where opportunity_id='20000000-0000-0000-0000-000000000010'), 'draft versions cascade');
select pg_temp.assert_true(not exists(select 1 from public.opportunity_field_provenance where opportunity_id='20000000-0000-0000-0000-000000000010'), 'draft provenance cascade');

-- Historical Opportunity remains intact and can move to dead.
select pg_temp.expect_error($sql$delete from public.acquisition_opportunities where id='20000000-0000-0000-0000-000000000004'$sql$, 'historical');
select pg_temp.assert_true(exists(select 1 from public.acquisition_opportunities where id='20000000-0000-0000-0000-000000000004'), 'historical Opportunity retained');
select pg_temp.assert_true(exists(select 1 from public.opportunity_underwriting_versions where id='40000000-0000-0000-0000-000000000004'), 'final version retained');
select pg_temp.assert_true(exists(select 1 from public.opportunity_sources where id='30000000-0000-0000-0000-000000000005'), 'historical source retained');
select pg_temp.assert_true(exists(select 1 from public.opportunity_field_provenance where id='50000000-0000-0000-0000-000000000001'), 'final provenance retained');
update public.acquisition_opportunities set stage='dead' where id='20000000-0000-0000-0000-000000000004';

-- Browser-like role: grants exist, but policy-free RLS gives empty reads,
-- rejected inserts, and zero-row updates/deletes.
create role opportunity_browser_test nologin;
grant usage on schema public to opportunity_browser_test;
grant select, insert, update, delete on all tables in schema public to opportunity_browser_test;
set local role opportunity_browser_test;
do $$
declare n bigint; affected integer;
begin
  select count(*) into n from public.acquisition_opportunities;
  if n <> 0 then raise exception 'RLS select exposed rows'; end if;
  select count(*) into n from public.opportunity_sources;
  if n <> 0 then raise exception 'RLS source select exposed rows'; end if;
  select count(*) into n from public.opportunity_underwriting_versions;
  if n <> 0 then raise exception 'RLS version select exposed rows'; end if;
  select count(*) into n from public.opportunity_field_provenance;
  if n <> 0 then raise exception 'RLS provenance select exposed rows'; end if;
  begin
    insert into public.acquisition_opportunities (name,created_by_email,updated_by_email)
      values ('RLS','browser@upperlineco.com','browser@upperlineco.com');
    raise exception 'RLS insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.opportunity_sources
      (opportunity_id,source_type,created_by_email,updated_by_email)
      values ('20000000-0000-0000-0000-000000000001','manual','browser@upperlineco.com','browser@upperlineco.com');
    raise exception 'RLS source insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.opportunity_underwriting_versions
      (opportunity_id,underwriting_type,version_number,input_payload,calculation_policy,created_by_email,updated_by_email)
      values ('20000000-0000-0000-0000-000000000001','retail_development',99,
        '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','browser@upperlineco.com','browser@upperlineco.com');
    raise exception 'RLS version insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.opportunity_field_provenance
      (opportunity_id,scope,field_path,provenance_type,created_by_email)
      values ('20000000-0000-0000-0000-000000000001','opportunity','notes','manual','browser@upperlineco.com');
    raise exception 'RLS provenance insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  update public.acquisition_opportunities set notes='RLS';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS update affected rows'; end if;
  update public.opportunity_sources set title='RLS';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS source update affected rows'; end if;
  update public.opportunity_underwriting_versions set warning_count=99;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS version update affected rows'; end if;
  update public.opportunity_field_provenance set original_text='RLS';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS provenance update affected rows'; end if;
  delete from public.acquisition_opportunities;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS delete affected rows'; end if;
  delete from public.opportunity_sources;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS source delete affected rows'; end if;
  delete from public.opportunity_underwriting_versions;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS version delete affected rows'; end if;
  delete from public.opportunity_field_provenance;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS provenance delete affected rows'; end if;
end;
$$;
reset role;

-- Superseding a final provenance row from a new draft must be rejected.
insert into public.opportunity_underwriting_versions
  (id,opportunity_id,underwriting_type,version_number,based_on_version_id,input_payload,
   calculation_policy,created_by_email,updated_by_email)
values ('40000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000004',
  'retail_development',2,'40000000-0000-0000-0000-000000000004',
  '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}',
  'test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_field_provenance
  (id,opportunity_id,underwriting_version_id,scope,field_path,provenance_type,created_by_email)
values ('50000000-0000-0000-0000-000000000020','20000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000006','underwriting','site.landAreaSf','prior_version',
  'test@upperlineco.com');
select pg_temp.expect_error($sql$update public.opportunity_field_provenance
  set supersedes_provenance_id='50000000-0000-0000-0000-000000000001'
  where id='50000000-0000-0000-0000-000000000020'$sql$, 'cannot be superseded');
select pg_temp.expect_error($sql$insert into public.opportunity_field_provenance
  (opportunity_id,underwriting_version_id,scope,field_path,provenance_type,
   supersedes_provenance_id,created_by_email)
  values ('20000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000006',
    'underwriting','site.landAreaSf','prior_version','50000000-0000-0000-0000-000000000001',
    'test@upperlineco.com')$sql$, 'cannot be superseded');

rollback;
