-- Phase 4B.2.1: transactional, candidate-only human review decisions.

create function public.record_opportunity_candidate_fact_decision(
  p_opportunity_id uuid,
  p_candidate_fact_id uuid,
  p_decision text,
  p_expected_decision_number integer,
  p_reviewer_email text
)
returns table (
  candidate_fact_id uuid,
  review_state text,
  decision_number integer,
  decided_at timestamptz,
  inserted boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_artifact_id uuid;
  v_ingestion_id uuid;
  v_run_id uuid;
  v_candidate public.opportunity_candidate_facts%rowtype;
  v_current public.opportunity_candidate_fact_decisions%rowtype;
  v_inserted public.opportunity_candidate_fact_decisions%rowtype;
  v_database_decision text;
  v_current_state text;
  v_current_number integer;
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'candidate_decision_invalid';
  end if;
  if p_expected_decision_number is null or p_expected_decision_number < 0 then
    raise exception using errcode = '22023', message = 'candidate_decision_revision_invalid';
  end if;
  if p_reviewer_email is null or length(btrim(p_reviewer_email)) = 0 then
    raise exception using errcode = '22023', message = 'candidate_decision_reviewer_required';
  end if;

  -- Match Phase 4B.1 exactly: newest valid artifact across this Opportunity's
  -- PDF ingestions, then greatest succeeded attempt for that artifact.
  select artifact.id, artifact.ingestion_id
    into v_artifact_id, v_ingestion_id
  from public.opportunity_source_artifacts artifact
  join public.opportunity_ingestions ingestion on ingestion.id = artifact.ingestion_id
  where ingestion.opportunity_id = p_opportunity_id
    and ingestion.entry_type = 'pdf'
    and artifact.validation_status = 'valid'
  order by artifact.created_at desc
  limit 1;

  if v_artifact_id is null then
    raise exception using errcode = 'P0002', message = 'candidate_not_currently_reviewable';
  end if;

  select run.id into v_run_id
  from public.opportunity_extraction_runs run
  where run.ingestion_id = v_ingestion_id
    and run.artifact_id = v_artifact_id
    and run.status = 'succeeded'
  order by run.attempt_number desc
  limit 1;

  if v_run_id is null then
    raise exception using errcode = 'P0002', message = 'candidate_not_currently_reviewable';
  end if;

  -- This row exists for both reviewed and unreviewed candidates, so it is the
  -- serialization primitive for the two-concurrent-first-write case.
  select * into v_candidate
  from public.opportunity_candidate_facts candidate
  where candidate.id = p_candidate_fact_id
    and candidate.ingestion_id = v_ingestion_id
    and candidate.artifact_id = v_artifact_id
    and candidate.extraction_run_id = v_run_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'candidate_not_currently_reviewable';
  end if;

  select * into v_current
  from public.opportunity_candidate_fact_decisions decision
  where decision.candidate_fact_id = p_candidate_fact_id
  order by decision.decision_number desc
  limit 1;

  v_current_number := coalesce(v_current.decision_number, 0);
  v_current_state := case v_current.decision
    when 'accepted' then 'approved'
    when 'edited_and_accepted' then 'approved'
    when 'rejected' then 'rejected'
    else null
  end;

  -- Exact replay wins over a stale expected number: the requested state is
  -- already authoritative and no redundant history row is useful.
  if v_current_state = p_decision then
    return query select p_candidate_fact_id, v_current_state,
      v_current.decision_number, v_current.decided_at, false;
    return;
  end if;

  if p_expected_decision_number <> v_current_number then
    raise exception using errcode = '40001', message = 'candidate_decision_revision_conflict';
  end if;

  v_database_decision := case p_decision when 'approved' then 'accepted' else 'rejected' end;
  if v_database_decision = 'accepted'
    and (v_candidate.normalized_value_type is null or v_candidate.normalized_value is null) then
    raise exception using errcode = '22023', message = 'candidate_not_approvable';
  end if;

  insert into public.opportunity_candidate_fact_decisions (
    candidate_fact_id, decision_number, decision, reviewer_email,
    accepted_value_type, accepted_value, accepted_unit,
    selected_destination_domain, selected_field_path, selected_candidate_tenant_key,
    conflict_disposition, application_reference, metadata
  ) values (
    v_candidate.id, v_current_number + 1, v_database_decision, lower(btrim(p_reviewer_email)),
    case when v_database_decision = 'accepted' then v_candidate.normalized_value_type end,
    case when v_database_decision = 'accepted' then v_candidate.normalized_value end,
    case when v_database_decision = 'accepted' then v_candidate.unit end,
    v_candidate.destination_domain, v_candidate.field_path, v_candidate.candidate_tenant_key,
    'deferred', null, '{}'::jsonb
  ) returning * into v_inserted;

  return query select v_inserted.candidate_fact_id, p_decision,
    v_inserted.decision_number, v_inserted.decided_at, true;
end;
$$;

revoke execute on function public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)
  from public, anon, authenticated;
grant execute on function public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text)
  to service_role;

comment on function public.record_opportunity_candidate_fact_decision(uuid,uuid,text,integer,text) is
  'Appends or idempotently replays candidate-only human review state for the current successful extraction; it never applies candidate values.';
