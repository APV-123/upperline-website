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
end $$;
