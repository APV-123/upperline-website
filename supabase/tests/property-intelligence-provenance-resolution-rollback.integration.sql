\set ON_ERROR_STOP on
begin;
\ir ../migrations/20260827000100_create_property_intelligence_provenance_resolution.sql
do $$ begin if to_regclass('public.intelligence_provenance_commands') is null then raise exception 'migration did not create provenance tables'; end if; end $$;
rollback;
do $$ begin
  if to_regclass('public.intelligence_provenance_commands') is not null then raise exception 'commands table survived rollback'; end if;
  if to_regclass('public.intelligence_provenance_resolution_decisions') is not null then raise exception 'decisions table survived rollback'; end if;
  if to_regprocedure('public.intelligence_provenance_readiness_v1(uuid)') is not null then raise exception 'readiness function survived rollback'; end if;
  if not exists(select 1 from pg_indexes where indexname='intelligence_source_edition_artifacts_primary_idx') then raise exception 'Phase 4C.1 primary index was not restored'; end if;
end $$;
