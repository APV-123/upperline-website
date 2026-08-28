-- Phase 4C.3.2B.1H: remove row-lock privilege coupling and harden provenance ACLs.
-- Normal replay temporarily installs the historical B.2 row-lock implementation; no
-- provenance operation is admitted until this forward migration completes.

create function public.intelligence_provenance_proposal_insert_lock_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-intelligence-provenance-v1|authority|acquisition-kind|'||new.artifact_acquisition_id::text||'|'||new.proposal_kind,0));
  if new.corrects_proposal_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'property-intelligence-provenance-v1|proposal|'||new.corrects_proposal_id::text,0));
  end if;
  return new;
end $$;
create trigger intelligence_provenance_proposals_lock before insert on public.intelligence_provenance_resolution_proposals
for each row execute function public.intelligence_provenance_proposal_insert_lock_v1();

create or replace function public.intelligence_validate_upstream_evidence_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.created_at:=clock_timestamp();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-intelligence-provenance-v1|proposal|'||new.proposal_id::text,0));
  if public.intelligence_provenance_current_state_v1(new.proposal_id)<>'proposed' then
    raise exception using errcode='23514',message='intelligence_upstream_evidence_proposal_finalized';
  end if;
  if not exists(
    select 1
    from public.intelligence_upstream_attribution_proposals u
    join public.intelligence_provenance_resolution_proposals p on p.id=u.proposal_id
    join public.intelligence_artifact_acquisitions a on a.id=p.artifact_acquisition_id
    join public.intelligence_evidence_locations e on e.id=new.evidence_location_id
    where u.proposal_id=new.proposal_id and u.conclusion='attributed_upstream'
      and e.source_edition_id=u.containing_source_edition_id
      and (e.artifact_id is null or e.artifact_id=a.artifact_id)
  ) then raise exception using errcode='23514',message='intelligence_upstream_evidence_context_invalid'; end if; return new;
end $$;

create or replace function public.intelligence_validate_provenance_decision_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.intelligence_provenance_resolution_proposals%rowtype; prior text; current_number integer; u public.intelligence_upstream_attribution_proposals%rowtype; r public.intelligence_representation_resolution_proposals%rowtype; acquisition_artifact uuid; refs integer;
begin
  new.decided_at:=clock_timestamp();
  select * into p from public.intelligence_provenance_resolution_proposals where id=new.proposal_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-intelligence-provenance-v1|authority|acquisition-kind|'||p.artifact_acquisition_id::text||'|'||p.proposal_kind,0));
  if p.proposal_kind='upstream_attribution' then
    select * into u from public.intelligence_upstream_attribution_proposals where proposal_id=p.id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'property-intelligence-provenance-v1|authority|upstream-edition|'||u.containing_source_edition_id::text,0));
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-intelligence-provenance-v1|proposal|'||p.id::text,0));
  if not exists(select 1 from public.intelligence_provenance_commands c where c.command_id=new.command_id and c.operation_kind='decide_resolution_proposal' and c.request_digest=new.request_digest) then
    raise exception using errcode='23514',message='intelligence_provenance_decision_command_invalid';
  end if;
  select decision_number,action into current_number,prior from public.intelligence_provenance_resolution_decisions where proposal_id=new.proposal_id order by decision_number desc limit 1;
  current_number:=coalesce(current_number,0);
  if new.expected_decision_number<>current_number or new.decision_number<>current_number+1 then raise exception using errcode='40001',message='intelligence_provenance_stale_revision'; end if;
  if not ((current_number=0 and new.action in ('confirmed','rejected','ambiguous')) or (prior='confirmed' and new.action='reversed')) then raise exception using errcode='23514',message='intelligence_provenance_transition_invalid'; end if;
  select ((new.materialized_source_id is not null)::int+(new.materialized_edition_id is not null)::int+(new.materialized_representation_id is not null)::int+(new.materialized_source_relationship_id is not null)::int) into refs;
  if new.action<>'confirmed' and refs<>0 then raise exception using errcode='23514',message='intelligence_provenance_materialization_forbidden'; end if;
  if new.action='confirmed' then
    if p.proposal_kind='source_identity' then
      if refs<>1 or new.materialized_source_id is null or not exists(select 1 from public.intelligence_source_resolution_proposals s join public.intelligence_sources x on x.id=new.materialized_source_id where s.proposal_id=p.id and ((s.resolution_mode='select_existing' and s.existing_source_id=x.id) or (s.resolution_mode='create_new' and x.title=s.candidate_title and x.source_kind=s.candidate_source_kind and x.publisher_id is not distinct from s.publisher_id and x.external_identifier is not distinct from s.candidate_external_identifier))) then raise exception using errcode='23514',message='intelligence_provenance_source_materialization_invalid'; end if;
    elsif p.proposal_kind='source_edition' then
      if refs<>1 or new.materialized_edition_id is null or not exists(select 1 from public.intelligence_edition_resolution_proposals e join public.intelligence_source_editions x on x.id=new.materialized_edition_id where e.proposal_id=p.id and x.source_id=e.source_id and ((e.resolution_mode='select_existing' and e.existing_edition_id=x.id) or (e.resolution_mode='create_new' and x.edition_label is not distinct from e.edition_label and x.publication_precision=e.publication_precision and x.publication_year is not distinct from e.publication_year and x.publication_month is not distinct from e.publication_month and x.publication_day is not distinct from e.publication_day))) then raise exception using errcode='23514',message='intelligence_provenance_edition_materialization_invalid'; end if;
    elsif p.proposal_kind='artifact_representation' then
      select * into r from public.intelligence_representation_resolution_proposals where proposal_id=p.id;
      select artifact_id into acquisition_artifact from public.intelligence_artifact_acquisitions where id=p.artifact_acquisition_id;
      if refs<>1 or new.materialized_representation_id is null or r.content_equivalence_state='unreviewed_different_bytes' or r.artifact_id<>acquisition_artifact or not exists(select 1 from public.intelligence_source_edition_artifacts x where x.id=new.materialized_representation_id and x.source_edition_id=r.source_edition_id and x.artifact_id=r.artifact_id and x.representation_role=r.representation_role and x.is_primary=r.is_primary) then raise exception using errcode='23514',message='intelligence_provenance_representation_materialization_invalid'; end if;
      if r.is_primary and exists(select 1 from public.intelligence_representation_resolution_proposals other where other.source_edition_id=r.source_edition_id and other.is_primary and other.proposal_id<>p.id and public.intelligence_provenance_current_state_v1(other.proposal_id)='confirmed') then raise exception using errcode='23514',message='intelligence_provenance_primary_conflict'; end if;
    else
      select * into u from public.intelligence_upstream_attribution_proposals where proposal_id=p.id;
      if u.conclusion='no_upstream_required' then
        if refs<>0 then raise exception using errcode='23514',message='intelligence_upstream_negative_materialization_forbidden'; end if;
      elsif refs<>1 or new.materialized_source_relationship_id is null or not exists(select 1 from public.intelligence_source_relationships x where x.id=new.materialized_source_relationship_id and x.containing_source_edition_id=u.containing_source_edition_id and x.relationship_type=u.relationship_type and x.attributed_source_id=u.upstream_source_id and x.attributed_source_edition_id is not distinct from u.upstream_source_edition_id) or not exists(select 1 from public.intelligence_upstream_attribution_evidence where proposal_id=p.id) then
        raise exception using errcode='23514',message='intelligence_upstream_positive_materialization_invalid';
      end if;
      if exists(select 1 from public.intelligence_upstream_attribution_proposals other where other.containing_source_edition_id=u.containing_source_edition_id and other.proposal_id<>p.id and public.intelligence_provenance_current_state_v1(other.proposal_id)='confirmed') then raise exception using errcode='23514',message='intelligence_upstream_current_authority_conflict'; end if;
    end if;
    if p.proposal_kind in ('source_identity','source_edition','artifact_representation') and exists(select 1 from public.intelligence_provenance_resolution_proposals other where other.artifact_acquisition_id=p.artifact_acquisition_id and other.proposal_kind=p.proposal_kind and other.id<>p.id and public.intelligence_provenance_current_state_v1(other.id)='confirmed') then raise exception using errcode='23514',message='intelligence_provenance_current_authority_conflict'; end if;
  end if;
  return new;
end $$;

create or replace function public.create_intelligence_provenance_proposal_v1(
  p_command_id uuid,
  p_canonical_request text,
  p_artifact_acquisition_id uuid,
  p_proposal_kind text,
  p_proposal_origin text,
  p_corrects_proposal_id uuid,
  p_semantic_fingerprint text,
  p_proposed_by_email text,
  p_payload jsonb
) returns table(proposal_id uuid, inserted boolean, readiness text)
language plpgsql security invoker set search_path='' as $$
declare
  existing public.intelligence_provenance_commands%rowtype;
  expected_digest text;
  new_proposal_id uuid:=gen_random_uuid();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-intelligence-provenance-v1|command|'||p_command_id::text,0));
  expected_digest:=encode(extensions.digest(convert_to(p_canonical_request,'UTF8'),'sha256'),'hex');
  select * into existing from public.intelligence_provenance_commands where command_id=p_command_id;
  if found then
    if existing.operation_kind<>'create_resolution_proposal' or existing.contract_version<>'property-intelligence-provenance-bridge-v1'
      or existing.canonical_request<>p_canonical_request or existing.request_digest<>expected_digest then
      raise exception using errcode='23514',message='intelligence_provenance_command_semantics_conflict';
    end if;
    select p.id,false,public.intelligence_provenance_readiness_v1(p.artifact_acquisition_id)
      into proposal_id,inserted,readiness
      from public.intelligence_provenance_resolution_proposals p where p.creation_command_id=p_command_id;
    if proposal_id is null then raise exception using errcode='55000',message='intelligence_provenance_command_result_missing'; end if;
    return next; return;
  end if;

  insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest)
  values(p_command_id,'create_resolution_proposal','property-intelligence-provenance-bridge-v1',p_canonical_request,expected_digest);
  insert into public.intelligence_provenance_resolution_proposals(id,artifact_acquisition_id,proposal_kind,proposal_origin,corrects_proposal_id,creation_command_id,semantic_fingerprint,proposed_by_email)
  values(new_proposal_id,p_artifact_acquisition_id,p_proposal_kind,p_proposal_origin,p_corrects_proposal_id,p_command_id,p_semantic_fingerprint,p_proposed_by_email);

  if p_proposal_kind='source_identity' then
    insert into public.intelligence_source_resolution_proposals values(
      new_proposal_id,p_payload->>'resolutionMode',(p_payload->>'existingSourceId')::uuid,(p_payload->>'publisherId')::uuid,
      p_payload->>'candidateTitle',p_payload->>'candidateSourceKind',p_payload->>'candidateExternalIdentifier',p_payload->>'publisherEvidence',
      (p_payload->>'matchTitle')::boolean,(p_payload->>'matchFilename')::boolean,(p_payload->>'matchProperty')::boolean,
      (p_payload->>'matchPublisher')::boolean,(p_payload->>'matchUploader')::boolean);
  elsif p_proposal_kind='source_edition' then
    insert into public.intelligence_edition_resolution_proposals values(
      new_proposal_id,(p_payload->>'sourceId')::uuid,p_payload->>'resolutionMode',(p_payload->>'existingEditionId')::uuid,
      p_payload->>'editionLabel',p_payload->>'publicationPrecision',(p_payload->>'publicationYear')::integer,
      (p_payload->>'publicationMonth')::integer,(p_payload->>'publicationDay')::integer,p_payload->>'publicationAuthority');
  elsif p_proposal_kind='artifact_representation' then
    insert into public.intelligence_representation_resolution_proposals values(
      new_proposal_id,(p_payload->>'sourceEditionId')::uuid,(p_payload->>'artifactId')::uuid,p_payload->>'representationRole',
      (p_payload->>'isPrimary')::boolean,p_payload->>'contentEquivalenceState',p_payload->>'contentEquivalenceAuthority');
  elsif p_proposal_kind='upstream_attribution' then
    insert into public.intelligence_upstream_attribution_proposals values(
      new_proposal_id,(p_payload->>'containingSourceEditionId')::uuid,p_payload->>'conclusion',p_payload->>'relationshipType',
      (p_payload->>'upstreamSourceId')::uuid,(p_payload->>'upstreamSourceEditionId')::uuid,p_payload->>'upstreamEditionState',
      p_payload->>'independenceAuthority',p_payload->>'humanReviewRationale');
    insert into public.intelligence_upstream_attribution_evidence(proposal_id,evidence_location_id)
      select new_proposal_id,value::uuid from jsonb_array_elements_text(coalesce(p_payload->'evidenceLocationIds','[]'::jsonb));
  else
    raise exception using errcode='22023',message='intelligence_provenance_proposal_kind_invalid';
  end if;

  proposal_id:=new_proposal_id; inserted:=true;
  readiness:=public.intelligence_provenance_readiness_v1(p_artifact_acquisition_id);
  return next;
end $$;

create or replace function public.decide_intelligence_provenance_proposal_v1(
  p_command_id uuid,
  p_canonical_request text,
  p_proposal_id uuid,
  p_action text,
  p_expected_decision_number integer,
  p_reviewer_email text,
  p_rationale text default null
) returns table(proposal_id uuid,decision_number integer,current_state text,inserted boolean,readiness text,
  materialized_source_id uuid,materialized_edition_id uuid,materialized_representation_id uuid,materialized_source_relationship_id uuid)
language plpgsql security invoker set search_path='' as $$
declare
  existing public.intelligence_provenance_commands%rowtype;
  existing_decision public.intelligence_provenance_resolution_decisions%rowtype;
  proposal public.intelligence_provenance_resolution_proposals%rowtype;
  source_payload public.intelligence_source_resolution_proposals%rowtype;
  edition_payload public.intelligence_edition_resolution_proposals%rowtype;
  representation_payload public.intelligence_representation_resolution_proposals%rowtype;
  upstream_payload public.intelligence_upstream_attribution_proposals%rowtype;
  expected_digest text; stored_action text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-intelligence-provenance-v1|command|'||p_command_id::text,0));
  expected_digest:=encode(extensions.digest(convert_to(p_canonical_request,'UTF8'),'sha256'),'hex');
  select * into existing from public.intelligence_provenance_commands where command_id=p_command_id;
  if found then
    if existing.operation_kind<>'decide_resolution_proposal' or existing.contract_version<>'property-intelligence-provenance-bridge-v1'
      or existing.canonical_request<>p_canonical_request or existing.request_digest<>expected_digest then
      raise exception using errcode='23514',message='intelligence_provenance_command_semantics_conflict';
    end if;
    select * into existing_decision from public.intelligence_provenance_resolution_decisions where command_id=p_command_id;
    if existing_decision.id is null then raise exception using errcode='55000',message='intelligence_provenance_command_result_missing'; end if;
    select * into proposal from public.intelligence_provenance_resolution_proposals where id=existing_decision.proposal_id;
    proposal_id:=proposal.id; decision_number:=existing_decision.decision_number;
    current_state:=public.intelligence_provenance_current_state_v1(proposal.id); inserted:=false;
    readiness:=public.intelligence_provenance_readiness_v1(proposal.artifact_acquisition_id);
    materialized_source_id:=existing_decision.materialized_source_id; materialized_edition_id:=existing_decision.materialized_edition_id;
    materialized_representation_id:=existing_decision.materialized_representation_id;
    materialized_source_relationship_id:=existing_decision.materialized_source_relationship_id;
    return next; return;
  end if;

  if p_action not in ('confirm','reject','mark_ambiguous','reverse') then
    raise exception using errcode='22023',message='intelligence_provenance_decision_action_invalid';
  end if;
  stored_action:=case p_action when 'confirm' then 'confirmed' when 'reject' then 'rejected' when 'mark_ambiguous' then 'ambiguous' else 'reversed' end;
  -- Proposal routing keys are immutable. Read them first so every orchestrated
  -- decision takes authority locks before the proposal row lock.
  select * into proposal from public.intelligence_provenance_resolution_proposals where id=p_proposal_id;
  if proposal.id is null then raise exception using errcode='P0002',message='intelligence_provenance_proposal_not_found'; end if;

  -- Canonical order: acquisition/kind, containing edition (upstream only), proposal row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-intelligence-provenance-v1|authority|acquisition-kind|'||proposal.artifact_acquisition_id::text||'|'||proposal.proposal_kind,0));
  if proposal.proposal_kind='upstream_attribution' then
    select * into upstream_payload from public.intelligence_upstream_attribution_proposals u where u.proposal_id=proposal.id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-intelligence-provenance-v1|authority|upstream-edition|'||upstream_payload.containing_source_edition_id::text,0));
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-intelligence-provenance-v1|proposal|'||proposal.id::text,0));

  insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest)
  values(p_command_id,'decide_resolution_proposal','property-intelligence-provenance-bridge-v1',p_canonical_request,expected_digest);

  if stored_action='confirmed' then
    if proposal.proposal_kind='source_identity' then
      select * into source_payload from public.intelligence_source_resolution_proposals s where s.proposal_id=proposal.id;
      if source_payload.resolution_mode='select_existing' then materialized_source_id:=source_payload.existing_source_id;
      else
        insert into public.intelligence_sources(publisher_id,title,source_kind,external_identifier,created_by_email)
        values(source_payload.publisher_id,source_payload.candidate_title,source_payload.candidate_source_kind,source_payload.candidate_external_identifier,p_reviewer_email)
        returning id into materialized_source_id;
      end if;
    elsif proposal.proposal_kind='source_edition' then
      select * into edition_payload from public.intelligence_edition_resolution_proposals e where e.proposal_id=proposal.id;
      if edition_payload.resolution_mode='select_existing' then materialized_edition_id:=edition_payload.existing_edition_id;
      else
        insert into public.intelligence_source_editions(source_id,edition_label,publication_precision,publication_year,publication_month,publication_day,created_by_email)
        values(edition_payload.source_id,edition_payload.edition_label,edition_payload.publication_precision,edition_payload.publication_year,edition_payload.publication_month,edition_payload.publication_day,p_reviewer_email)
        returning id into materialized_edition_id;
      end if;
    elsif proposal.proposal_kind='artifact_representation' then
      select * into representation_payload from public.intelligence_representation_resolution_proposals r where r.proposal_id=proposal.id;
      insert into public.intelligence_source_edition_artifacts(source_edition_id,artifact_id,representation_role,is_primary,created_by_email)
      values(representation_payload.source_edition_id,representation_payload.artifact_id,representation_payload.representation_role,representation_payload.is_primary,p_reviewer_email)
      on conflict(source_edition_id,artifact_id) do nothing;
      select id into materialized_representation_id from public.intelligence_source_edition_artifacts
        where source_edition_id=representation_payload.source_edition_id and artifact_id=representation_payload.artifact_id;
    else
      if upstream_payload.conclusion='attributed_upstream' then
        insert into public.intelligence_source_relationships(containing_source_edition_id,relationship_type,attributed_source_id,attributed_source_edition_id,created_by_email)
        values(upstream_payload.containing_source_edition_id,upstream_payload.relationship_type,upstream_payload.upstream_source_id,upstream_payload.upstream_source_edition_id,p_reviewer_email)
        on conflict on constraint intelligence_source_relationships_identity_key do nothing;
        select id into materialized_source_relationship_id from public.intelligence_source_relationships
          where containing_source_edition_id=upstream_payload.containing_source_edition_id and relationship_type=upstream_payload.relationship_type
            and attributed_source_id=upstream_payload.upstream_source_id and attributed_source_edition_id is not distinct from upstream_payload.upstream_source_edition_id;
      end if;
    end if;
  end if;

  insert into public.intelligence_provenance_resolution_decisions(
    proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,
    materialized_source_id,materialized_edition_id,materialized_representation_id,materialized_source_relationship_id,rationale)
  values(proposal.id,p_expected_decision_number+1,p_expected_decision_number,stored_action,p_command_id,expected_digest,p_reviewer_email,
    materialized_source_id,materialized_edition_id,materialized_representation_id,materialized_source_relationship_id,p_rationale)
  returning intelligence_provenance_resolution_decisions.decision_number into decision_number;
  proposal_id:=proposal.id; current_state:=public.intelligence_provenance_current_state_v1(proposal.id); inserted:=true;
  readiness:=public.intelligence_provenance_readiness_v1(proposal.artifact_acquisition_id);
  return next;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array[
    'intelligence_provenance_commands','intelligence_provenance_resolution_proposals',
    'intelligence_source_resolution_proposals','intelligence_edition_resolution_proposals',
    'intelligence_representation_resolution_proposals','intelligence_upstream_attribution_proposals',
    'intelligence_upstream_attribution_evidence','intelligence_provenance_resolution_decisions'
  ] loop
    execute format('revoke all privileges on table public.%I from service_role',table_name);
    execute format('grant select,insert on table public.%I to service_role',table_name);
    execute format('revoke all privileges on table public.%I from public,anon,authenticated',table_name);
  end loop;
end $$;

revoke execute on function public.intelligence_provenance_proposal_insert_lock_v1() from public,anon,authenticated,service_role;

comment on function public.intelligence_provenance_proposal_insert_lock_v1() is
  'Transaction advisory serialization for provenance proposal creation and correction without UPDATE privilege.';
