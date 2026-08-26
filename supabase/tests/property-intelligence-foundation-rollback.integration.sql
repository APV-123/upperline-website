\set ON_ERROR_STOP off
begin;
\ir ../migrations/20260825000100_create_property_intelligence_identity_source_foundation.sql
select 1/0;
commit;
\set ON_ERROR_STOP on

do $$ begin
  if to_regclass('public.intelligence_entities') is not null
    or to_regclass('public.intelligence_sources') is not null
    or to_regclass('public.intelligence_source_authority_assessments') is not null
    or to_regclass('public.intelligence_artifacts') is not null then
    raise exception 'Phase 4C.1 tables survived rollback';
  end if;
  if to_regprocedure('public.protect_intelligence_append_only_history()') is not null
    or to_regprocedure('public.validate_intelligence_authority_assessment_sequence()') is not null
    or to_regprocedure('public.validate_intelligence_resolution_decision_sequence()') is not null
    or to_regprocedure('public.validate_intelligence_acquisition_legacy_link()') is not null then
    raise exception 'Phase 4C.1 functions survived rollback';
  end if;
end $$;
