\set ON_ERROR_STOP on

create temp table prior_completion_definition as
select pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure) definition;

begin;
\ir ../migrations/20260830000100_admit_rich_traffic_extraction_candidates.sql
do $$ begin
  if position('traffic_count:1' in pg_get_functiondef(
      'public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure))=0 then
    raise exception 'rich traffic migration did not replace completion function';
  end if;
end $$;
rollback;

do $$ begin
  if pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure)
      is distinct from (select definition from prior_completion_definition) then
    raise exception 'rollback did not restore prior completion function';
  end if;
end $$;

select 'rich traffic persistence rollback passed' as result;
