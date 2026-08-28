\set ON_ERROR_STOP on
begin;
\ir ../migrations/20260827000100_create_property_intelligence_provenance_resolution.sql
\ir ../migrations/20260828000100_create_property_intelligence_provenance_orchestration.sql
rollback;
do $$begin if to_regprocedure('public.create_intelligence_provenance_proposal_v1(uuid,text,uuid,text,text,uuid,text,text,jsonb)') is not null then raise exception 'orchestration migration escaped rollback';end if;end$$;
