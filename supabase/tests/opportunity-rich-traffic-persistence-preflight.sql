\set ON_ERROR_STOP on

create temp table rich_traffic_acl_before on commit preserve rows as
select oid, relacl
from pg_class
where oid in (
  'public.opportunity_ingestions'::regclass,
  'public.opportunity_source_artifacts'::regclass,
  'public.opportunity_extraction_runs'::regclass,
  'public.opportunity_candidate_facts'::regclass,
  'public.opportunity_candidate_fact_evidence'::regclass,
  'public.opportunity_candidate_fact_decisions'::regclass
);
