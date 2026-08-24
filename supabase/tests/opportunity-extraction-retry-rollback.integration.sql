\set ON_ERROR_STOP off
begin;
\ir ../migrations/20260823000300_add_extraction_retry_semantics.sql
select 1/0;
commit;
\set ON_ERROR_STOP on
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='opportunity_extraction_runs' and column_name='retry_command_id') then raise exception 'rollback column remained'; end if;
  if to_regprocedure('public.allocate_opportunity_extraction_retry(uuid,uuid,uuid,text,uuid,text,text,text,text,text,text,text,text,text)') is not null then raise exception 'rollback RPC remained'; end if;
  if to_regprocedure('public.enforce_opportunity_extraction_retry_parent()') is not null then raise exception 'rollback guard remained'; end if;
  if exists(select 1 from pg_trigger where tgname='opportunity_extraction_runs_retry_parent_guard' and not tgisinternal) then raise exception 'rollback trigger remained'; end if;
  if exists(
    select 1 from public.opportunity_extraction_runs r
    join public.retry_migration_predecessor_snapshot s using(id)
    where to_jsonb(r) is distinct from s.original
  ) then raise exception 'rollback changed predecessor rows'; end if;
  if (select count(*) from public.opportunity_extraction_runs r join public.retry_migration_predecessor_snapshot s using(id))<>5 then
    raise exception 'rollback changed predecessor row count';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='public.opportunity_extraction_runs'::regclass
    and tgname in ('opportunity_extraction_runs_protect','opportunity_extraction_runs_set_updated_at')
    and tgenabled<>'O') then raise exception 'rollback left predecessor trigger disabled'; end if;
  begin
    update public.opportunity_extraction_runs set provider='changed'
    where id='f3000000-0000-4000-8000-000000000001';
    raise exception 'rollback weakened terminal immutability';
  exception when others then if sqlerrm='rollback weakened terminal immutability' then raise; end if; end;
end $$;
drop table public.retry_migration_predecessor_snapshot;
