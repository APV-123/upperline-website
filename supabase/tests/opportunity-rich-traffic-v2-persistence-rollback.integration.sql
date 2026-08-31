\set ON_ERROR_STOP on
begin;
drop function public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb);
\ir ../migrations/20260830000100_admit_rich_traffic_extraction_candidates.sql
do $$ begin
  if position('traffic_count:2' in pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure))>0 then raise exception 'V2 remained after rollback'; end if;
  if position('traffic_count:1' in pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure))=0 then raise exception 'V1 was not restored'; end if;
end $$;
rollback;
