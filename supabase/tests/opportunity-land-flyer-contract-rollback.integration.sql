\set ON_ERROR_STOP off
begin;
\ir ../migrations/20260823000100_amend_land_flyer_extraction_contract.sql
select 1/0;
commit;
\set ON_ERROR_STOP on
do $$
declare candidate_definition text; completion_definition text;
begin
  select pg_get_constraintdef(oid) into candidate_definition from pg_constraint
    where conrelid='public.opportunity_candidate_facts'::regclass and conname='opportunity_candidate_facts_destination_check';
  select pg_get_functiondef('public.complete_opportunity_extraction_run(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure)
    into completion_definition;
  if candidate_definition like '%source%' then raise exception 'source destination survived rollback'; end if;
  if completion_definition like '%visual_inference%' or completion_definition like '%document.title%' then
    raise exception 'amended completion function survived rollback';
  end if;
end $$;
