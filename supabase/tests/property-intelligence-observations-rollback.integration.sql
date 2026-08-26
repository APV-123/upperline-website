\set ON_ERROR_STOP on
begin;
\ir ../migrations/20260826000100_create_property_intelligence_observations.sql
rollback;
do $$ begin
  if to_regclass('public.intelligence_observations') is not null then raise exception 'observation table survived rollback'; end if;
  if to_regprocedure('public.derive_intelligence_annualized_rent_per_square_foot_v1(uuid,uuid,text)') is not null then raise exception 'derivation RPC survived rollback'; end if;
  if exists(select 1 from public.intelligence_entities) then null; end if;
end $$;
