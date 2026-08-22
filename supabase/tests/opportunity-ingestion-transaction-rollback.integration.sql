\set ON_ERROR_STOP off
begin;
\ir ../migrations/20260822000200_create_opportunity_ingestion_transaction_rpcs.sql
select 1/0;
commit;
\set ON_ERROR_STOP on
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='opportunity_extraction_runs' and column_name='diagnostics') then raise exception 'rollback failed'; end if;
  if to_regprocedure('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)') is not null then raise exception 'rollback function remained'; end if;
end $$;
