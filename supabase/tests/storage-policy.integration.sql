\set ON_ERROR_STOP on

begin;
set local role anon;
insert into storage.objects(bucket_id,name) values ('deal-images','policy-test/image');
insert into storage.objects(bucket_id,name) values ('deal-documents-public','policy-test/document');
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='deal-documents-private') then
    raise exception 'anon private SELECT unexpectedly allowed';
  end if;
  begin
    insert into storage.objects(bucket_id,name) values ('deal-documents-private','policy-test/private');
    raise exception 'anon private INSERT unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('future-private-bucket','policy-test/future');
    raise exception 'anon future-bucket INSERT unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

begin;
set local role authenticated;
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='deal-documents-private') then
    raise exception 'authenticated private SELECT unexpectedly allowed';
  end if;
  begin
    insert into storage.objects(bucket_id,name) values ('deal-documents-private','policy-test/private');
    raise exception 'authenticated private INSERT unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

begin;
set local role service_role;
insert into storage.objects(bucket_id,name) values ('deal-documents-private','policy-test/service');
rollback;
