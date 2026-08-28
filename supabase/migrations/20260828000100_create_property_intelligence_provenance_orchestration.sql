-- Phase 4C.3.2B.2: service-role-only transactional provenance orchestration.

create function public.create_intelligence_provenance_proposal_v1(
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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('provenance-command:'||p_command_id::text,0));
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

create function public.decide_intelligence_provenance_proposal_v1(
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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('provenance-command:'||p_command_id::text,0));
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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(proposal.artifact_acquisition_id::text||':'||proposal.proposal_kind,0));
  if proposal.proposal_kind='upstream_attribution' then
    select * into upstream_payload from public.intelligence_upstream_attribution_proposals u where u.proposal_id=proposal.id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(upstream_payload.containing_source_edition_id::text||':upstream',0));
  end if;
  select * into proposal from public.intelligence_provenance_resolution_proposals where id=p_proposal_id for update;

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

create function public.get_intelligence_provenance_readiness_v1(p_artifact_acquisition_id uuid)
returns table(readiness text,source_id uuid,edition_id uuid,representation_id uuid,source_relationship_id uuid)
language sql stable security invoker set search_path='' as $$
  select public.intelligence_provenance_readiness_v1(p_artifact_acquisition_id),
    (select d.materialized_source_id from public.intelligence_provenance_resolution_proposals p join public.intelligence_provenance_resolution_decisions d on d.proposal_id=p.id where p.artifact_acquisition_id=p_artifact_acquisition_id and p.proposal_kind='source_identity' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' order by d.decision_number desc limit 1),
    (select d.materialized_edition_id from public.intelligence_provenance_resolution_proposals p join public.intelligence_provenance_resolution_decisions d on d.proposal_id=p.id where p.artifact_acquisition_id=p_artifact_acquisition_id and p.proposal_kind='source_edition' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' order by d.decision_number desc limit 1),
    (select d.materialized_representation_id from public.intelligence_provenance_resolution_proposals p join public.intelligence_provenance_resolution_decisions d on d.proposal_id=p.id where p.artifact_acquisition_id=p_artifact_acquisition_id and p.proposal_kind='artifact_representation' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' order by d.decision_number desc limit 1),
    (select d.materialized_source_relationship_id from public.intelligence_provenance_resolution_proposals p join public.intelligence_provenance_resolution_decisions d on d.proposal_id=p.id where p.artifact_acquisition_id=p_artifact_acquisition_id and p.proposal_kind='upstream_attribution' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' order by d.decision_number desc limit 1)
$$;

revoke execute on function public.create_intelligence_provenance_proposal_v1(uuid,text,uuid,text,text,uuid,text,text,jsonb),public.decide_intelligence_provenance_proposal_v1(uuid,text,uuid,text,integer,text,text),public.get_intelligence_provenance_readiness_v1(uuid) from public,anon,authenticated;
grant execute on function public.create_intelligence_provenance_proposal_v1(uuid,text,uuid,text,text,uuid,text,text,jsonb),public.decide_intelligence_provenance_proposal_v1(uuid,text,uuid,text,integer,text,text),public.get_intelligence_provenance_readiness_v1(uuid) to service_role;

comment on function public.create_intelligence_provenance_proposal_v1(uuid,text,uuid,text,text,uuid,text,text,jsonb) is 'Atomic service-role proposal creation with immutable command replay.';
comment on function public.decide_intelligence_provenance_proposal_v1(uuid,text,uuid,text,integer,text,text) is 'Atomic trusted-review decision, materialization, reversal, and replay boundary.';
