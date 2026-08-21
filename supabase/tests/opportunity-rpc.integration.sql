\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'assertion failed: %', message; end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_state text, expected_message text)
returns void language plpgsql as $$
declare
  failed boolean := false;
  actual_state text;
  actual_message text;
begin
  begin
    execute statement;
  exception when others then
    failed := true;
    get stacked diagnostics actual_state = returned_sqlstate, actual_message = message_text;
  end;
  if not failed then raise exception 'expected statement to fail: %', statement; end if;
  if actual_state <> expected_state then
    raise exception 'expected SQLSTATE %, received %: %', expected_state, actual_state, actual_message;
  end if;
  if position(expected_message in actual_message) = 0 then
    raise exception 'expected message %, received %', expected_message, actual_message;
  end if;
end;
$$;

insert into public.acquisition_opportunities
  (id,name,created_by_email,updated_by_email)
values
  ('81000000-0000-0000-0000-000000000001','RPC primary','test@upperlineco.com','test@upperlineco.com'),
  ('81000000-0000-0000-0000-000000000002','RPC other','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_sources
  (id,opportunity_id,source_type,created_by_email,updated_by_email)
values
  ('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','listing','test@upperlineco.com','test@upperlineco.com'),
  ('82000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000002','listing','test@upperlineco.com','test@upperlineco.com');

set local role service_role;

select pg_temp.assert_true(
  (select version_number = 1 and not is_active
   from public.create_opportunity_underwriting_draft(
     '81000000-0000-0000-0000-000000000001',
     '{"schemaVersion":"retail-development-persistence-v1","engineInput":{"site":{"landAreaSf":"100"},"leasing":{"mode":"tenantRoster","tenants":[{"tenantKey":"83000000-0000-0000-0000-000000000001","name":"Anchor"}]}}}',
     '{"rounding":"canonical"}', 'creator@upperlineco.com', false)),
  'first draft allocation'
);
select pg_temp.assert_true(
  (select version_number = 2 and is_active
   from public.create_opportunity_underwriting_draft(
     '81000000-0000-0000-0000-000000000001',
     '{"schemaVersion":"retail-development-persistence-v1","engineInput":{"site":{"landAreaSf":"200"}}}',
     '{"rounding":"canonical"}', 'creator@upperlineco.com', true)),
  'second draft allocation and activation'
);
select pg_temp.expect_error(
  $sql$select * from public.create_opportunity_underwriting_draft(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','actor@upperlineco.com',false)$sql$,
  'P0002','opportunity_not_found'
);

select pg_temp.assert_true(
  (select is_active and revision = 2
   from public.set_active_opportunity_underwriting(
     '81000000-0000-0000-0000-000000000001',
     (select id from public.opportunity_underwriting_versions
      where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1),
     1,'switcher@upperlineco.com')),
  'draft activation'
);
select pg_temp.assert_true(
  (select is_active and revision = 2
   from public.set_active_opportunity_underwriting(
     '81000000-0000-0000-0000-000000000001',
     (select id from public.opportunity_underwriting_versions
      where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1),
     2,'switcher@upperlineco.com')),
  'already-active selection is idempotent'
);
select pg_temp.expect_error(
  format($sql$select * from public.set_active_opportunity_underwriting(
    '81000000-0000-0000-0000-000000000001','%s',1,'actor@upperlineco.com')$sql$,
    (select id from public.opportunity_underwriting_versions
     where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1)),
  '40001','underwriting_revision_conflict'
);
select * from public.create_opportunity_underwriting_draft(
  '81000000-0000-0000-0000-000000000002',
  '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}',
  'creator@upperlineco.com',false
);
select pg_temp.expect_error(
  format($sql$select * from public.set_active_opportunity_underwriting(
    '81000000-0000-0000-0000-000000000001','%s',1,'actor@upperlineco.com')$sql$,
    (select id from public.opportunity_underwriting_versions
     where opportunity_id='81000000-0000-0000-0000-000000000002')),
  '22023','underwriting_version_relationship_invalid'
);

select pg_temp.assert_true(
  (select supersedes_provenance_id is null
   from public.replace_opportunity_field_provenance(
     '81000000-0000-0000-0000-000000000001','opportunity','asking_price','manual',
     'actor@upperlineco.com',p_original_value=>'1000000'::jsonb)),
  'initial opportunity provenance'
);
select pg_temp.assert_true(
  (select supersedes_provenance_id is not null
   from public.replace_opportunity_field_provenance(
     '81000000-0000-0000-0000-000000000001','opportunity','asking_price','manual_override',
     'actor@upperlineco.com',p_original_value=>'1100000'::jsonb)),
  'opportunity provenance supersession'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.opportunity_field_provenance
   where opportunity_id='81000000-0000-0000-0000-000000000001'
     and field_path='asking_price' and superseded_at is null),
  'one current opportunity provenance'
);

select pg_temp.expect_error(
  $sql$select * from public.replace_opportunity_field_provenance(
    '81000000-0000-0000-0000-000000000001','tenant','rentalRatePerSfYear','manual',
    'actor@upperlineco.com')$sql$,
  '22023','tenant_provenance_scope_invalid'
);
select pg_temp.expect_error(
  $sql$select * from public.replace_opportunity_field_provenance(
    '81000000-0000-0000-0000-000000000001','opportunity','notes','listing_extraction',
    'actor@upperlineco.com',p_opportunity_source_id=>'82000000-0000-0000-0000-000000000002')$sql$,
  '22023','opportunity_source_relationship_invalid'
);

select * from public.replace_opportunity_field_provenance(
  '81000000-0000-0000-0000-000000000001','underwriting','site.landAreaSf','manual',
  'actor@upperlineco.com',
  p_underwriting_version_id=>(select id from public.opportunity_underwriting_versions
    where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1),
  p_opportunity_source_id=>'82000000-0000-0000-0000-000000000001',
  p_normalized_value=>'100'::jsonb
);
select * from public.replace_opportunity_field_provenance(
  '81000000-0000-0000-0000-000000000001','tenant','rentalRatePerSfYear','manual',
  'actor@upperlineco.com',
  p_underwriting_version_id=>(select id from public.opportunity_underwriting_versions
    where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1),
  p_tenant_key=>'83000000-0000-0000-0000-000000000001',
  p_normalized_value=>'24.50'::jsonb
);

select pg_temp.assert_true(
  (select version_number = 3 and status='draft' and is_active
      and based_on_version_id is not null and copied_provenance_count = 2
   from public.clone_opportunity_underwriting_version(
     (select id from public.opportunity_underwriting_versions
      where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=1),
     2,'cloner@upperlineco.com')),
  'clone contract'
);
select pg_temp.assert_true(
  (select count(*) = 2
   from public.opportunity_field_provenance provenance
   join public.opportunity_underwriting_versions version
     on version.id=provenance.underwriting_version_id
   where version.opportunity_id='81000000-0000-0000-0000-000000000001'
     and version.version_number=3
     and provenance.provenance_type='prior_version'
     and provenance.metadata ? 'clonedFromVersionId'
     and provenance.supersedes_provenance_id is null),
  'clone provenance lineage metadata'
);
select pg_temp.assert_true(
  (select result_payload is null and calculated_at is null and input_hash is null
      and finalized_at is null and screen_result is null
   from public.opportunity_underwriting_versions
   where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=3),
  'clone excludes calculated artifacts'
);
select pg_temp.assert_true(
  (select input_payload #>> '{engineInput,leasing,tenants,0,tenantKey}' =
      '83000000-0000-0000-0000-000000000001'
   from public.opportunity_underwriting_versions
   where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=3),
  'clone preserves durable tenant keys'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.opportunity_underwriting_versions
   where opportunity_id='81000000-0000-0000-0000-000000000001' and is_active),
  'clone leaves exactly one active version'
);

-- A final snapshot can be selected active, but its economic/provenance state stays immutable.
update public.opportunity_underwriting_versions
set result_payload='{}', calculation_version='test-v1', input_hash='hash', calculated_at=now(),
    finalized_at=now(), is_complete=false, status='final', revision=revision+1,
    updated_by_email='finalizer@upperlineco.com'
where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=2;
select pg_temp.assert_true(
  (select is_active from public.set_active_opportunity_underwriting(
    '81000000-0000-0000-0000-000000000001',
    (select id from public.opportunity_underwriting_versions
     where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=2),
    3,'switcher@upperlineco.com')),
  'final version can become active'
);
select pg_temp.assert_true(
  (select is_active from public.set_active_opportunity_underwriting(
    '81000000-0000-0000-0000-000000000001',
    (select id from public.opportunity_underwriting_versions
     where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=3),
    2,'switcher@upperlineco.com')),
  'draft can become active after final'
);
select pg_temp.assert_true(
  (select revision = 3 and not is_active
   from public.opportunity_underwriting_versions
   where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=2),
  'final active changes preserve immutable revision'
);
select pg_temp.expect_error(
  format($sql$select * from public.replace_opportunity_field_provenance(
    '81000000-0000-0000-0000-000000000001','underwriting','site.landAreaSf','manual_override',
    'actor@upperlineco.com',p_underwriting_version_id=>'%s')$sql$,
    (select id from public.opportunity_underwriting_versions
     where opportunity_id='81000000-0000-0000-0000-000000000001' and version_number=2)),
  '55000','final_underwriting_provenance_immutable'
);

reset role;

-- Browser-like roles have neither table visibility nor RPC execution rights.
set local role authenticated;
select pg_temp.expect_error(
  $sql$select * from public.create_opportunity_underwriting_draft(
    '81000000-0000-0000-0000-000000000001',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','browser@upperlineco.com',false)$sql$,
  '42501','permission denied'
);
reset role;
set local role anon;
select pg_temp.expect_error(
  $sql$select * from public.create_opportunity_underwriting_draft(
    '81000000-0000-0000-0000-000000000001',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','anon@invalid',false)$sql$,
  '42501','permission denied'
);
reset role;
set local role rpc_browser;
select pg_temp.expect_error(
  $sql$select * from public.create_opportunity_underwriting_draft(
    '81000000-0000-0000-0000-000000000001',
    '{"schemaVersion":"retail-development-persistence-v1","engineInput":{}}','{}','public@invalid',false)$sql$,
  '42501','permission denied'
);
reset role;

select pg_temp.assert_true(
  (select bool_and(relrowsecurity) from pg_class
   where relnamespace='public'::regnamespace and relname in (
     'acquisition_opportunities','opportunity_sources',
     'opportunity_underwriting_versions','opportunity_field_provenance')),
  'RLS remains enabled'
);

rollback;
