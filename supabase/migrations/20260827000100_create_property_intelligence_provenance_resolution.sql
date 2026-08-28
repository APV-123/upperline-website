-- Phase 4C.3.2B.1: immutable provenance-resolution proposals, decisions, and read model.

create table public.intelligence_provenance_commands (
  command_id uuid primary key,
  operation_kind text not null check (operation_kind in ('establish_byte_bridge','create_resolution_proposal','decide_resolution_proposal')),
  contract_version text not null check (contract_version='property-intelligence-provenance-bridge-v1'),
  canonical_request text not null check (length(canonical_request)>0),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);

create table public.intelligence_provenance_resolution_proposals (
  id uuid primary key default gen_random_uuid(),
  artifact_acquisition_id uuid not null references public.intelligence_artifact_acquisitions(id) on delete restrict,
  proposal_kind text not null check (proposal_kind in ('source_identity','source_edition','artifact_representation','upstream_attribution')),
  proposal_origin text not null check (proposal_origin in ('human_review','deterministic_system','machine_assisted')),
  corrects_proposal_id uuid references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  creation_command_id uuid not null unique references public.intelligence_provenance_commands(command_id) on delete restrict,
  semantic_fingerprint text not null check (semantic_fingerprint ~ '^[0-9a-f]{64}$'),
  proposed_by_email text not null check (proposed_by_email=lower(btrim(proposed_by_email)) and char_length(proposed_by_email) between 3 and 320),
  proposed_at timestamptz not null default clock_timestamp(),
  check (corrects_proposal_id is null or corrects_proposal_id<>id)
);

create table public.intelligence_source_resolution_proposals (
  proposal_id uuid primary key references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  resolution_mode text not null check (resolution_mode in ('select_existing','create_new')),
  existing_source_id uuid references public.intelligence_sources(id) on delete restrict,
  publisher_id uuid references public.intelligence_publishers(id) on delete restrict,
  candidate_title text not null check (candidate_title=btrim(candidate_title) and char_length(candidate_title) between 1 and 500 and candidate_title !~ '[[:cntrl:]]'),
  candidate_source_kind text not null check (candidate_source_kind in ('offering_memorandum','marketing_material','rent_roll','operating_statement','lease','demographic_report','traffic_dataset','parcel_property_data','broker_communication','public_dataset','other')),
  candidate_external_identifier text check (candidate_external_identifier is null or (candidate_external_identifier=btrim(candidate_external_identifier) and char_length(candidate_external_identifier) between 1 and 500 and candidate_external_identifier !~ '[[:cntrl:]]')),
  publisher_evidence text not null check (publisher_evidence in ('none','matching_evidence','preauthorized_identity')),
  match_title boolean not null, match_filename boolean not null, match_property boolean not null,
  match_publisher boolean not null, match_uploader boolean not null,
  check ((resolution_mode='select_existing')=(existing_source_id is not null))
);

create table public.intelligence_edition_resolution_proposals (
  proposal_id uuid primary key references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  source_id uuid not null references public.intelligence_sources(id) on delete restrict,
  resolution_mode text not null check (resolution_mode in ('select_existing','create_new')),
  existing_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  edition_label text check (edition_label is null or (edition_label=btrim(edition_label) and char_length(edition_label) between 1 and 500 and edition_label !~ '[[:cntrl:]]')),
  publication_precision text not null check (publication_precision in ('unknown','year','month','day')),
  publication_year integer, publication_month integer, publication_day integer,
  publication_authority text not null check (publication_authority in ('unknown','source_explicit','human_confirmed')),
  check ((resolution_mode='select_existing')=(existing_edition_id is not null)),
  check ((publication_precision='unknown' and publication_year is null and publication_month is null and publication_day is null and publication_authority='unknown') or
    (publication_precision='year' and publication_year between 1800 and 2200 and publication_month is null and publication_day is null and publication_authority<>'unknown') or
    (publication_precision='month' and publication_year between 1800 and 2200 and publication_month between 1 and 12 and publication_day is null and publication_authority<>'unknown') or
    (publication_precision='day' and publication_year between 1800 and 2200 and publication_month between 1 and 12 and publication_day between 1 and extract(day from (make_date(publication_year,publication_month,1)+interval '1 month - 1 day'))::integer and publication_authority<>'unknown'))
);

create table public.intelligence_representation_resolution_proposals (
  proposal_id uuid primary key references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  artifact_id uuid not null references public.intelligence_artifacts(id) on delete restrict,
  representation_role text not null check (representation_role in ('primary','supplement','embedded','derivative')),
  is_primary boolean not null,
  content_equivalence_state text not null check (content_equivalence_state in ('same_bytes','reviewed_equivalent','unreviewed_different_bytes')),
  content_equivalence_authority text not null check ((content_equivalence_state in ('same_bytes','unreviewed_different_bytes') and content_equivalence_authority='database_derived') or (content_equivalence_state='reviewed_equivalent' and content_equivalence_authority='human_decision')),
  check (not is_primary or representation_role='primary')
);

create table public.intelligence_upstream_attribution_proposals (
  proposal_id uuid primary key references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  containing_source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  conclusion text not null check (conclusion in ('attributed_upstream','no_upstream_required')),
  relationship_type text check (relationship_type in ('cites','attributes_to','embeds_summary_of','derived_from','revises','supersedes')),
  upstream_source_id uuid references public.intelligence_sources(id) on delete restrict,
  upstream_source_edition_id uuid,
  upstream_edition_state text check (upstream_edition_state in ('preauthorized','unidentified')),
  independence_authority text check (independence_authority='not_established'),
  human_review_rationale text,
  constraint intelligence_upstream_proposal_edition_source_fkey foreign key(upstream_source_edition_id,upstream_source_id) references public.intelligence_source_editions(id,source_id) on delete restrict,
  check ((conclusion='attributed_upstream' and relationship_type is not null and upstream_source_id is not null and upstream_edition_state is not null and independence_authority='not_established' and ((upstream_edition_state='preauthorized')=(upstream_source_edition_id is not null))) or
    (conclusion='no_upstream_required' and relationship_type is null and upstream_source_id is null and upstream_source_edition_id is null and upstream_edition_state is null and independence_authority is null and human_review_rationale is not null and human_review_rationale=btrim(human_review_rationale) and char_length(human_review_rationale) between 1 and 2000 and human_review_rationale !~ '[[:cntrl:]]'))
);

create table public.intelligence_upstream_attribution_evidence (
  proposal_id uuid not null references public.intelligence_upstream_attribution_proposals(proposal_id) on delete restrict,
  evidence_location_id uuid not null references public.intelligence_evidence_locations(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  primary key(proposal_id,evidence_location_id)
);

create table public.intelligence_provenance_resolution_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.intelligence_provenance_resolution_proposals(id) on delete restrict,
  decision_number integer not null check (decision_number>0),
  expected_decision_number integer not null check (expected_decision_number>=0),
  action text not null check (action in ('confirmed','rejected','ambiguous','reversed')),
  command_id uuid not null unique references public.intelligence_provenance_commands(command_id) on delete restrict,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  reviewer_email text not null check (reviewer_email=lower(btrim(reviewer_email)) and char_length(reviewer_email) between 3 and 320),
  materialized_source_id uuid references public.intelligence_sources(id) on delete restrict,
  materialized_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  materialized_representation_id uuid references public.intelligence_source_edition_artifacts(id) on delete restrict,
  materialized_source_relationship_id uuid references public.intelligence_source_relationships(id) on delete restrict,
  rationale text check (rationale is null or (rationale=btrim(rationale) and char_length(rationale) between 1 and 2000 and rationale !~ '[[:cntrl:]]')),
  decided_at timestamptz not null default clock_timestamp(),
  unique(proposal_id,decision_number)
);

drop index public.intelligence_source_edition_artifacts_primary_idx;

create index intelligence_provenance_proposals_context_idx on public.intelligence_provenance_resolution_proposals(artifact_acquisition_id,proposal_kind,proposed_at);
create index intelligence_provenance_proposals_fingerprint_idx on public.intelligence_provenance_resolution_proposals(proposal_kind,semantic_fingerprint);
create index intelligence_provenance_decisions_latest_idx on public.intelligence_provenance_resolution_decisions(proposal_id,decision_number desc);
create index intelligence_representation_proposals_edition_idx on public.intelligence_representation_resolution_proposals(source_edition_id,is_primary);
create index intelligence_upstream_proposals_edition_idx on public.intelligence_upstream_attribution_proposals(containing_source_edition_id,conclusion);

create function public.intelligence_provenance_command_guard_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare expected text;
begin
  new.created_at:=clock_timestamp();
  expected:=encode(extensions.digest(convert_to(new.canonical_request,'UTF8'),'sha256'),'hex');
  if new.request_digest<>expected then
    raise exception using errcode='23514',message='intelligence_provenance_command_digest_invalid';
  end if;
  return new;
end $$;
create trigger intelligence_provenance_commands_guard before insert on public.intelligence_provenance_commands for each row execute function public.intelligence_provenance_command_guard_v1();

create function public.intelligence_provenance_current_state_v1(p_proposal_id uuid)
returns text language sql stable security invoker set search_path='' as $$
  select coalesce((select case action when 'confirmed' then 'confirmed' when 'rejected' then 'rejected' when 'ambiguous' then 'ambiguous' else 'reversed' end from public.intelligence_provenance_resolution_decisions where proposal_id=p_proposal_id order by decision_number desc limit 1),'proposed')
$$;

create function public.intelligence_provenance_payload_canonical_v1(p_proposal_id uuid)
returns text language plpgsql stable security invoker set search_path='' as $$
declare p public.intelligence_provenance_resolution_proposals%rowtype; result text;
begin
  select * into p from public.intelligence_provenance_resolution_proposals where id=p_proposal_id;
  if p.proposal_kind='source_identity' then
    select concat_ws('|','source_identity',resolution_mode,coalesce(existing_source_id::text,'null'),coalesce(publisher_id::text,'null'),encode(convert_to(normalize(candidate_title,NFC),'UTF8'),'hex'),candidate_source_kind,coalesce(encode(convert_to(normalize(candidate_external_identifier,NFC),'UTF8'),'hex'),'null'),publisher_evidence,match_title::text,match_filename::text,match_property::text,match_publisher::text,match_uploader::text) into result from public.intelligence_source_resolution_proposals where proposal_id=p_proposal_id;
  elsif p.proposal_kind='source_edition' then
    select concat_ws('|','source_edition',source_id::text,resolution_mode,coalesce(existing_edition_id::text,'null'),coalesce(encode(convert_to(normalize(edition_label,NFC),'UTF8'),'hex'),'null'),publication_precision,coalesce(publication_year::text,'null'),coalesce(publication_month::text,'null'),coalesce(publication_day::text,'null'),publication_authority) into result from public.intelligence_edition_resolution_proposals where proposal_id=p_proposal_id;
  elsif p.proposal_kind='artifact_representation' then
    select concat_ws('|','artifact_representation',source_edition_id::text,artifact_id::text,representation_role,is_primary::text,content_equivalence_state,content_equivalence_authority) into result from public.intelligence_representation_resolution_proposals where proposal_id=p_proposal_id;
  else
    select concat_ws('|','upstream_attribution',u.containing_source_edition_id::text,u.conclusion,coalesce(u.relationship_type,'null'),coalesce(u.upstream_source_id::text,'null'),coalesce(u.upstream_source_edition_id::text,'null'),coalesce(u.upstream_edition_state,'null'),coalesce(u.independence_authority,'null'),coalesce(encode(convert_to(normalize(u.human_review_rationale,NFC),'UTF8'),'hex'),'null'),coalesce((select string_agg(e.evidence_location_id::text,',' order by e.evidence_location_id) from public.intelligence_upstream_attribution_evidence e where e.proposal_id=u.proposal_id),'null')) into result from public.intelligence_upstream_attribution_proposals u where u.proposal_id=p_proposal_id;
  end if;
  return result;
end $$;

create function public.intelligence_validate_provenance_proposal_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.intelligence_provenance_resolution_proposals%rowtype; child_count integer; expected text; correction public.intelligence_provenance_resolution_proposals%rowtype; target_id uuid;
begin
  target_id:=coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(new)->>'proposal_id')::uuid);
  select * into p from public.intelligence_provenance_resolution_proposals where id=target_id;
  select (exists(select 1 from public.intelligence_source_resolution_proposals where proposal_id=p.id)::int+exists(select 1 from public.intelligence_edition_resolution_proposals where proposal_id=p.id)::int+exists(select 1 from public.intelligence_representation_resolution_proposals where proposal_id=p.id)::int+exists(select 1 from public.intelligence_upstream_attribution_proposals where proposal_id=p.id)::int) into child_count;
  if child_count<>1 or not ((p.proposal_kind='source_identity' and exists(select 1 from public.intelligence_source_resolution_proposals where proposal_id=p.id)) or (p.proposal_kind='source_edition' and exists(select 1 from public.intelligence_edition_resolution_proposals where proposal_id=p.id)) or (p.proposal_kind='artifact_representation' and exists(select 1 from public.intelligence_representation_resolution_proposals where proposal_id=p.id)) or (p.proposal_kind='upstream_attribution' and exists(select 1 from public.intelligence_upstream_attribution_proposals where proposal_id=p.id))) then raise exception using errcode='23514',message='intelligence_provenance_typed_payload_invalid'; end if;
  if not exists(select 1 from public.intelligence_provenance_commands c where c.command_id=p.creation_command_id and c.operation_kind='create_resolution_proposal') then
    raise exception using errcode='23514',message='intelligence_provenance_creation_command_invalid';
  end if;
  expected:=encode(extensions.digest(convert_to(public.intelligence_provenance_payload_canonical_v1(p.id),'UTF8'),'sha256'),'hex');
  if p.semantic_fingerprint<>expected then raise exception using errcode='23514',message='intelligence_provenance_fingerprint_invalid'; end if;
  if p.corrects_proposal_id is not null then
    select * into correction from public.intelligence_provenance_resolution_proposals where id=p.corrects_proposal_id;
    if correction.proposal_kind<>p.proposal_kind or correction.artifact_acquisition_id<>p.artifact_acquisition_id or public.intelligence_provenance_current_state_v1(correction.id)<>'reversed' then
      raise exception using errcode='23514',message='intelligence_provenance_correction_context_invalid';
    end if;
  end if;
  return null;
end $$;

create constraint trigger intelligence_provenance_proposals_validate after insert on public.intelligence_provenance_resolution_proposals deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();
create constraint trigger intelligence_source_proposals_validate after insert on public.intelligence_source_resolution_proposals deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();
create constraint trigger intelligence_edition_proposals_validate after insert on public.intelligence_edition_resolution_proposals deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();
create constraint trigger intelligence_representation_proposals_validate after insert on public.intelligence_representation_resolution_proposals deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();
create constraint trigger intelligence_upstream_proposals_validate after insert on public.intelligence_upstream_attribution_proposals deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();

create function public.intelligence_validate_upstream_evidence_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.created_at:=clock_timestamp();
  perform 1
  from public.intelligence_provenance_resolution_proposals
  where id=new.proposal_id
  for update;
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
create trigger intelligence_upstream_evidence_validate before insert on public.intelligence_upstream_attribution_evidence for each row execute function public.intelligence_validate_upstream_evidence_v1();
create constraint trigger intelligence_upstream_evidence_fingerprint_validate after insert on public.intelligence_upstream_attribution_evidence deferrable initially deferred for each row execute function public.intelligence_validate_provenance_proposal_v1();

create function public.intelligence_validate_provenance_decision_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.intelligence_provenance_resolution_proposals%rowtype; prior text; current_number integer; u public.intelligence_upstream_attribution_proposals%rowtype; r public.intelligence_representation_resolution_proposals%rowtype; acquisition_artifact uuid; refs integer;
begin
  new.decided_at:=clock_timestamp();
  perform 1 from public.intelligence_provenance_resolution_proposals where id=new.proposal_id for update;
  select * into p from public.intelligence_provenance_resolution_proposals where id=new.proposal_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p.artifact_acquisition_id::text||':'||p.proposal_kind,0));
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
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u.containing_source_edition_id::text||':upstream',0));
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
create trigger intelligence_provenance_decisions_validate before insert on public.intelligence_provenance_resolution_decisions for each row execute function public.intelligence_validate_provenance_decision_v1();

create function public.intelligence_provenance_readiness_v1(p_acquisition_id uuid)
returns text language plpgsql stable security invoker set search_path='' as $$
declare source_count integer; edition_count integer; representation_count integer; upstream_count integer; ambiguous_count integer; proposed_conflict integer; resolved_source uuid; resolved_edition uuid; acquisition_artifact uuid;
begin
  select artifact_id into acquisition_artifact from public.intelligence_artifact_acquisitions where id=p_acquisition_id;
  if acquisition_artifact is null then return 'artifact_unestablished'; end if;
  select count(*) filter(where public.intelligence_provenance_current_state_v1(id)='confirmed'),count(*) filter(where public.intelligence_provenance_current_state_v1(id)='ambiguous') into source_count,ambiguous_count from public.intelligence_provenance_resolution_proposals where artifact_acquisition_id=p_acquisition_id and proposal_kind='source_identity';
  if ambiguous_count>0 or source_count>1 then return 'source_ambiguous'; elsif source_count<>1 then return 'source_unresolved'; end if;
  select d.materialized_source_id into resolved_source from public.intelligence_provenance_resolution_proposals p join lateral (select x.materialized_source_id from public.intelligence_provenance_resolution_decisions x where x.proposal_id=p.id order by x.decision_number desc limit 1) d on true where p.artifact_acquisition_id=p_acquisition_id and p.proposal_kind='source_identity' and public.intelligence_provenance_current_state_v1(p.id)='confirmed';
  if resolved_source is null then return 'source_ambiguous'; end if;
  select count(*) filter(where public.intelligence_provenance_current_state_v1(id)='confirmed'),count(*) filter(where public.intelligence_provenance_current_state_v1(id)='ambiguous') into edition_count,ambiguous_count from public.intelligence_provenance_resolution_proposals where artifact_acquisition_id=p_acquisition_id and proposal_kind='source_edition';
  if ambiguous_count>0 or edition_count>1 then return 'edition_ambiguous'; elsif edition_count<>1 then return 'edition_unresolved'; end if;
  select d.materialized_edition_id into resolved_edition from public.intelligence_provenance_resolution_proposals p join lateral (select x.materialized_edition_id from public.intelligence_provenance_resolution_decisions x where x.proposal_id=p.id order by x.decision_number desc limit 1) d on true join public.intelligence_source_editions e on e.id=d.materialized_edition_id where p.artifact_acquisition_id=p_acquisition_id and p.proposal_kind='source_edition' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' and e.source_id=resolved_source;
  if resolved_edition is null then return 'edition_ambiguous'; end if;
  select count(*) filter(where public.intelligence_provenance_current_state_v1(id)='confirmed'),count(*) filter(where public.intelligence_provenance_current_state_v1(id)='ambiguous') into representation_count,ambiguous_count from public.intelligence_provenance_resolution_proposals where artifact_acquisition_id=p_acquisition_id and proposal_kind='artifact_representation';
  if ambiguous_count>0 or representation_count>1 then return 'representation_ambiguous'; elsif representation_count<>1 then return 'representation_unresolved'; end if;
  if not exists(select 1 from public.intelligence_provenance_resolution_proposals p join lateral (select x.materialized_representation_id from public.intelligence_provenance_resolution_decisions x where x.proposal_id=p.id order by x.decision_number desc limit 1) d on true join public.intelligence_source_edition_artifacts r on r.id=d.materialized_representation_id where p.artifact_acquisition_id=p_acquisition_id and p.proposal_kind='artifact_representation' and public.intelligence_provenance_current_state_v1(p.id)='confirmed' and r.source_edition_id=resolved_edition and r.artifact_id=acquisition_artifact) then return 'representation_ambiguous'; end if;
  select count(*) filter(where public.intelligence_provenance_current_state_v1(p.id)='confirmed'),count(*) filter(where public.intelligence_provenance_current_state_v1(p.id)='ambiguous') into upstream_count,ambiguous_count from public.intelligence_provenance_resolution_proposals p where p.artifact_acquisition_id=p_acquisition_id and p.proposal_kind='upstream_attribution';
  select count(*) into proposed_conflict from public.intelligence_provenance_resolution_proposals p join public.intelligence_upstream_attribution_proposals u on u.proposal_id=p.id where p.artifact_acquisition_id=p_acquisition_id and public.intelligence_provenance_current_state_v1(p.id)='proposed' and exists(select 1 from public.intelligence_provenance_resolution_proposals cp join public.intelligence_upstream_attribution_proposals cu on cu.proposal_id=cp.id where cp.artifact_acquisition_id=p_acquisition_id and public.intelligence_provenance_current_state_v1(cp.id)='confirmed' and cu.conclusion<>u.conclusion);
  if ambiguous_count>0 or upstream_count>1 or proposed_conflict>0 then return 'upstream_provenance_ambiguous'; elsif upstream_count<>1 then return 'upstream_provenance_unresolved'; end if;
  if not exists(select 1 from public.intelligence_provenance_resolution_proposals p join public.intelligence_upstream_attribution_proposals u on u.proposal_id=p.id where p.artifact_acquisition_id=p_acquisition_id and public.intelligence_provenance_current_state_v1(p.id)='confirmed' and u.containing_source_edition_id=resolved_edition) then return 'upstream_provenance_ambiguous'; end if;
  return 'provenance_ready';
end $$;

create function public.intelligence_provenance_authoritative_timestamp_v1() returns trigger language plpgsql security invoker set search_path='' as $$ begin if tg_table_name='intelligence_provenance_commands' then new.created_at:=clock_timestamp(); elsif tg_table_name='intelligence_provenance_resolution_proposals' then new.proposed_at:=clock_timestamp(); elsif tg_table_name='intelligence_provenance_resolution_decisions' then new.decided_at:=clock_timestamp(); else new.created_at:=clock_timestamp(); end if; return new; end $$;
create trigger intelligence_provenance_commands_timestamp before insert on public.intelligence_provenance_commands for each row execute function public.intelligence_provenance_authoritative_timestamp_v1();
create trigger intelligence_provenance_proposals_timestamp before insert on public.intelligence_provenance_resolution_proposals for each row execute function public.intelligence_provenance_authoritative_timestamp_v1();

create function public.intelligence_provenance_append_only_v1() returns trigger language plpgsql security invoker set search_path='' as $$ begin raise exception using errcode='55000',message='intelligence_provenance_history_append_only'; end $$;
do $$ declare t text; begin foreach t in array array['intelligence_provenance_commands','intelligence_provenance_resolution_proposals','intelligence_source_resolution_proposals','intelligence_edition_resolution_proposals','intelligence_representation_resolution_proposals','intelligence_upstream_attribution_proposals','intelligence_upstream_attribution_evidence','intelligence_provenance_resolution_decisions'] loop execute format('create trigger %I_append_only before update or delete on public.%I for each row execute function public.intelligence_provenance_append_only_v1()',t,t); execute format('alter table public.%I enable row level security',t); execute format('revoke all on table public.%I from public,anon,authenticated',t); execute format('grant select,insert on table public.%I to service_role',t); end loop; end $$;

revoke execute on function public.intelligence_provenance_current_state_v1(uuid),public.intelligence_provenance_payload_canonical_v1(uuid),public.intelligence_provenance_command_guard_v1(),public.intelligence_validate_provenance_proposal_v1(),public.intelligence_validate_upstream_evidence_v1(),public.intelligence_validate_provenance_decision_v1(),public.intelligence_provenance_readiness_v1(uuid),public.intelligence_provenance_authoritative_timestamp_v1(),public.intelligence_provenance_append_only_v1() from public,anon,authenticated;
revoke execute on function public.intelligence_provenance_command_guard_v1(),public.intelligence_validate_provenance_proposal_v1(),public.intelligence_validate_upstream_evidence_v1(),public.intelligence_validate_provenance_decision_v1(),public.intelligence_provenance_authoritative_timestamp_v1(),public.intelligence_provenance_append_only_v1() from service_role;
grant execute on function public.intelligence_provenance_current_state_v1(uuid),public.intelligence_provenance_payload_canonical_v1(uuid),public.intelligence_provenance_readiness_v1(uuid) to service_role;

comment on table public.intelligence_provenance_resolution_proposals is 'Immutable reviewed provenance proposal spine; current authority is derived from append-only decisions.';
comment on table public.intelligence_upstream_attribution_proposals is 'Persistence-compatible upstream_attribution kind implementing attributed_upstream and affirmative no_upstream_required conclusions.';
