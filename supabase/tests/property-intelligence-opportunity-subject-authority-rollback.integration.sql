\set ON_ERROR_STOP on
begin;
\ir ../migrations/20260829000200_create_property_intelligence_opportunity_subject_authority.sql
rollback;
do $$begin if to_regclass('public.intelligence_opportunity_subject_commands') is not null then raise exception 'authority migration rollback failed';end if;if exists(select 1 from information_schema.columns where table_schema='public' and table_name='intelligence_opportunity_subjects' and column_name='authority_proposal_id')then raise exception 'subject alteration rollback failed';end if;end$$;
