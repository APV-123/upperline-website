\set ON_ERROR_STOP off
begin;
\ir ../migrations/20260822000100_create_opportunity_ingestion_foundation.sql
select 1/0;
commit;
\set ON_ERROR_STOP on
do $$ begin if exists(select 1 from pg_class where relnamespace='public'::regnamespace and relname='opportunity_ingestions') then raise exception 'rollback failed'; end if; end $$;
