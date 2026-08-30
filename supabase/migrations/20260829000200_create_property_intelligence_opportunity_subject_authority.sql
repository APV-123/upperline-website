-- Phase 4C.6C: durable human authority for an Opportunity's Property/Site subject.
-- Entity-to-entity deduplication remains exclusively in the existing entity-resolution tables.

create table public.intelligence_opportunity_subject_commands (
  command_id uuid primary key,
  operation_kind text not null,
  contract_version text not null,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete restrict,
  canonical_request jsonb not null,
  request_digest text not null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_opportunity_subject_commands_operation_check
    check (operation_kind = 'resolve_primary_target'),
  constraint intelligence_opportunity_subject_commands_version_check
    check (contract_version = 'property-intelligence-opportunity-subject-v1'),
  constraint intelligence_opportunity_subject_commands_request_check
    check (jsonb_typeof(canonical_request) = 'object'),
  constraint intelligence_opportunity_subject_commands_digest_check
    check (request_digest ~ '^[0-9a-f]{64}$'),
  constraint intelligence_opportunity_subject_commands_actor_check
    check (created_by_email = lower(created_by_email) and created_by_email ~ '^[^@[:space:]]+@upperlineco[.]com$')
);

create table public.intelligence_opportunity_subject_proposals (
  id uuid primary key,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete restrict,
  proposal_type text not null,
  existing_entity_id uuid references public.intelligence_entities(id) on delete restrict,
  proposed_display_label text,
  proposed_aliases jsonb not null default '[]'::jsonb,
  corrects_proposal_id uuid references public.intelligence_opportunity_subject_proposals(id) on delete restrict,
  creation_command_id uuid not null unique references public.intelligence_opportunity_subject_commands(command_id) on delete restrict,
  proposed_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_opportunity_subject_proposals_type_check
    check (proposal_type in ('new_property','existing_property')),
  constraint intelligence_opportunity_subject_proposals_shape_check check (
    (proposal_type = 'new_property' and existing_entity_id is null
      and proposed_display_label is not null and length(btrim(proposed_display_label)) between 1 and 200)
    or
    (proposal_type = 'existing_property' and existing_entity_id is not null
      and proposed_display_label is null and proposed_aliases = '[]'::jsonb)
  ),
  constraint intelligence_opportunity_subject_proposals_aliases_check
    check (jsonb_typeof(proposed_aliases) = 'array' and jsonb_array_length(proposed_aliases) <= 5),
  constraint intelligence_opportunity_subject_proposals_actor_check
    check (proposed_by_email = lower(proposed_by_email) and proposed_by_email ~ '^[^@[:space:]]+@upperlineco[.]com$')
);

create table public.intelligence_opportunity_subject_decisions (
  id uuid primary key,
  proposal_id uuid not null references public.intelligence_opportunity_subject_proposals(id) on delete restrict,
  decision_number integer not null,
  expected_decision_number integer not null,
  decision text not null,
  command_id uuid not null references public.intelligence_opportunity_subject_commands(command_id) on delete restrict,
  reviewer_email text not null,
  rationale text,
  materialized_entity_id uuid references public.intelligence_entities(id) on delete restrict deferrable initially deferred,
  materialized_subject_id uuid,
  decided_at timestamptz not null default now(),
  constraint intelligence_opportunity_subject_decisions_number_check
    check (decision_number > 0 and expected_decision_number = decision_number - 1),
  constraint intelligence_opportunity_subject_decisions_decision_check
    check (decision in ('confirmed','rejected','ambiguous','reversed')),
  constraint intelligence_opportunity_subject_decisions_materialized_check check (
    (decision = 'confirmed' and materialized_entity_id is not null and materialized_subject_id is not null)
    or (decision <> 'confirmed' and materialized_entity_id is null and materialized_subject_id is null)
  ),
  constraint intelligence_opportunity_subject_decisions_actor_check
    check (reviewer_email = lower(reviewer_email) and reviewer_email ~ '^[^@[:space:]]+@upperlineco[.]com$'),
  constraint intelligence_opportunity_subject_decisions_rationale_check
    check (rationale is null or (length(btrim(rationale)) between 1 and 2000 and rationale = btrim(rationale))),
  constraint intelligence_opportunity_subject_decisions_proposal_number_key unique (proposal_id, decision_number),
  constraint intelligence_opportunity_subject_decisions_proposal_command_key unique (proposal_id, command_id)
);

alter table public.intelligence_opportunity_subjects
  add column authority_proposal_id uuid references public.intelligence_opportunity_subject_proposals(id) on delete restrict;

alter table public.intelligence_opportunity_subjects
  drop constraint intelligence_opportunity_subjects_identity_key;

create unique index intelligence_opportunity_subjects_current_identity_idx
  on public.intelligence_opportunity_subjects(opportunity_id, entity_id, subject_role)
  where relationship_status = 'confirmed';

create unique index intelligence_opportunity_subjects_authority_proposal_idx
  on public.intelligence_opportunity_subjects(authority_proposal_id)
  where authority_proposal_id is not null;

alter table public.intelligence_opportunity_subject_decisions
  add constraint intelligence_opportunity_subject_decisions_subject_fkey
  foreign key (materialized_subject_id) references public.intelligence_opportunity_subjects(id)
  on delete restrict deferrable initially deferred;

create function public.validate_intelligence_opportunity_subject_decision_v1()
returns trigger language plpgsql set search_path = '' as $$
declare
  latest_number integer;
  latest_decision text;
  proposal_opportunity uuid;
  command_opportunity uuid;
begin
  select p.opportunity_id into proposal_opportunity
  from public.intelligence_opportunity_subject_proposals p where p.id = new.proposal_id;
  select c.opportunity_id into command_opportunity
  from public.intelligence_opportunity_subject_commands c where c.command_id = new.command_id;
  if proposal_opportunity is null or command_opportunity is distinct from proposal_opportunity then
    raise exception using errcode='23514', message='intelligence_opportunity_subject_decision_scope_invalid';
  end if;
  select d.decision_number, d.decision into latest_number, latest_decision
  from public.intelligence_opportunity_subject_decisions d
  where d.proposal_id = new.proposal_id order by d.decision_number desc limit 1;
  if new.decision_number <> coalesce(latest_number,0)+1
    or new.expected_decision_number <> coalesce(latest_number,0)
    or (latest_number is null and new.decision = 'reversed')
    or (latest_decision = 'confirmed' and new.decision <> 'reversed')
    or latest_decision in ('rejected','ambiguous','reversed') then
    raise exception using errcode='23514', message='intelligence_opportunity_subject_decision_sequence_invalid';
  end if;
  return new;
end;
$$;

create trigger intelligence_opportunity_subject_decisions_validate
before insert on public.intelligence_opportunity_subject_decisions
for each row execute function public.validate_intelligence_opportunity_subject_decision_v1();

create function public.validate_intelligence_opportunity_subject_materialization_v1()
returns trigger language plpgsql set search_path = '' as $$
declare
  proposal_row public.intelligence_opportunity_subject_proposals%rowtype;
  latest_decision public.intelligence_opportunity_subject_decisions%rowtype;
begin
  if new.subject_role <> 'primary_target' then
    if new.authority_proposal_id is not null then
      raise exception using errcode='23514', message='intelligence_opportunity_subject_authority_role_invalid';
    end if;
    return new;
  end if;
  if new.authority_proposal_id is null then
    raise exception using errcode='23514', message='intelligence_opportunity_subject_authority_required';
  end if;
  select * into proposal_row from public.intelligence_opportunity_subject_proposals where id=new.authority_proposal_id;
  select * into latest_decision from public.intelligence_opportunity_subject_decisions
    where proposal_id=new.authority_proposal_id order by decision_number desc limit 1;
  if proposal_row.id is null or proposal_row.opportunity_id<>new.opportunity_id
    or latest_decision.decision<>'confirmed' or latest_decision.materialized_entity_id<>new.entity_id
    or latest_decision.materialized_subject_id<>new.id then
    raise exception using errcode='23514', message='intelligence_opportunity_subject_authority_invalid';
  end if;
  return new;
end;
$$;

create trigger intelligence_opportunity_subjects_validate_authority
before insert on public.intelligence_opportunity_subjects
for each row execute function public.validate_intelligence_opportunity_subject_materialization_v1();

create function public.protect_intelligence_opportunity_subject_materialization_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='DELETE' then
    raise exception using errcode='55000',message='intelligence_opportunity_subject_history_append_only';
  end if;
  if old.relationship_status='confirmed' and new.relationship_status='reversed'
    and row(old.id,old.opportunity_id,old.entity_id,old.subject_role,old.source_edition_id,old.created_by_email,old.created_at,old.authority_proposal_id)
      is not distinct from
        row(new.id,new.opportunity_id,new.entity_id,new.subject_role,new.source_edition_id,new.created_by_email,new.created_at,new.authority_proposal_id)
    and exists(select 1 from public.intelligence_opportunity_subject_decisions d
      where d.proposal_id=old.authority_proposal_id and d.decision='reversed') then
    return new;
  end if;
  raise exception using errcode='55000',message='intelligence_opportunity_subject_history_append_only';
end;
$$;

create trigger intelligence_opportunity_subjects_protect_history
before update or delete on public.intelligence_opportunity_subjects
for each row execute function public.protect_intelligence_opportunity_subject_materialization_v1();

create function public.protect_intelligence_opportunity_subject_authority_truncate_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode='55000',message='intelligence_opportunity_subject_history_append_only';
end;
$$;

create trigger intelligence_opportunity_subject_commands_no_truncate before truncate on public.intelligence_opportunity_subject_commands execute function public.protect_intelligence_opportunity_subject_authority_truncate_v1();
create trigger intelligence_opportunity_subject_proposals_no_truncate before truncate on public.intelligence_opportunity_subject_proposals execute function public.protect_intelligence_opportunity_subject_authority_truncate_v1();
create trigger intelligence_opportunity_subject_decisions_no_truncate before truncate on public.intelligence_opportunity_subject_decisions execute function public.protect_intelligence_opportunity_subject_authority_truncate_v1();
create trigger intelligence_opportunity_subjects_no_truncate before truncate on public.intelligence_opportunity_subjects execute function public.protect_intelligence_opportunity_subject_authority_truncate_v1();

create trigger intelligence_opportunity_subject_commands_append_only before update or delete on public.intelligence_opportunity_subject_commands for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_opportunity_subject_proposals_append_only before update or delete on public.intelligence_opportunity_subject_proposals for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_opportunity_subject_decisions_append_only before update or delete on public.intelligence_opportunity_subject_decisions for each row execute function public.protect_intelligence_append_only_history();

create function public.resolve_intelligence_opportunity_primary_target_v1(
  p_command_id uuid,
  p_opportunity_id uuid,
  p_action text,
  p_proposal_type text,
  p_existing_entity_id uuid,
  p_display_label text,
  p_aliases jsonb,
  p_corrects_proposal_id uuid,
  p_reviewer_email text
)
returns table(proposal_id uuid,decision_number integer,decision text,subject_entity_id uuid,opportunity_subject_id uuid,inserted boolean)
language plpgsql security definer set search_path='' as $$
declare
  canonical_aliases jsonb;
  canonical_request jsonb;
  expected_digest text;
  existing_command public.intelligence_opportunity_subject_commands%rowtype;
  current_subject public.intelligence_opportunity_subjects%rowtype;
  current_proposal_id uuid;
  new_proposal_id uuid := gen_random_uuid();
  new_decision_id uuid := gen_random_uuid();
  new_entity_id uuid;
  new_subject_id uuid;
  stored_decision text;
  alias_item jsonb;
  alias_type text;
  alias_value text;
  existing_type text;
begin
  if p_command_id is null or p_opportunity_id is null then raise exception using errcode='22023',message='intelligence_opportunity_subject_identity_required'; end if;
  if p_action not in ('confirm','reject','ambiguous') then raise exception using errcode='22023',message='intelligence_opportunity_subject_action_invalid'; end if;
  if p_proposal_type not in ('new_property','existing_property') then raise exception using errcode='22023',message='intelligence_opportunity_subject_proposal_type_invalid'; end if;
  if p_reviewer_email is null or p_reviewer_email<>lower(p_reviewer_email) or p_reviewer_email!~'^[^@[:space:]]+@upperlineco[.]com$' then raise exception using errcode='22023',message='intelligence_opportunity_subject_reviewer_invalid'; end if;
  if p_aliases is null or jsonb_typeof(p_aliases)<>'array' or jsonb_array_length(p_aliases)>5 then raise exception using errcode='22023',message='intelligence_opportunity_subject_aliases_invalid'; end if;
  canonical_aliases := '[]'::jsonb;
  for alias_item in select value from jsonb_array_elements(p_aliases) order by value->>'aliasType',value->>'aliasValue' loop
    if jsonb_typeof(alias_item)<>'object' or (select count(*) from jsonb_object_keys(alias_item))<>2
      or not(alias_item?'aliasType' and alias_item?'aliasValue') then raise exception using errcode='22023',message='intelligence_opportunity_subject_alias_invalid'; end if;
    alias_type:=alias_item->>'aliasType'; alias_value:=alias_item->>'aliasValue';
    if alias_type not in ('property_name','other') or alias_value is null or alias_value<>btrim(alias_value)
      or length(alias_value) not between 1 and 200 or alias_value~'[[:cntrl:]]' then raise exception using errcode='22023',message='intelligence_opportunity_subject_alias_invalid'; end if;
    if canonical_aliases @> jsonb_build_array(jsonb_build_object('aliasType',alias_type,'aliasValue',alias_value)) then raise exception using errcode='22023',message='intelligence_opportunity_subject_alias_duplicate'; end if;
    canonical_aliases:=canonical_aliases||jsonb_build_array(jsonb_build_object('aliasType',alias_type,'aliasValue',alias_value));
  end loop;
  if p_proposal_type='new_property' then
    if p_existing_entity_id is not null or p_display_label is null or p_display_label<>btrim(p_display_label)
      or length(p_display_label) not between 1 and 200 or p_display_label~'[[:cntrl:]]' then raise exception using errcode='22023',message='intelligence_opportunity_subject_new_shape_invalid'; end if;
  else
    if p_existing_entity_id is null or p_display_label is not null or canonical_aliases<>'[]'::jsonb then raise exception using errcode='22023',message='intelligence_opportunity_subject_existing_shape_invalid'; end if;
  end if;
  canonical_request:=jsonb_build_object('action',p_action,'aliases',canonical_aliases,'correctsProposalId',p_corrects_proposal_id,'displayLabel',p_display_label,'existingEntityId',p_existing_entity_id,'opportunityId',p_opportunity_id,'proposalType',p_proposal_type,'reviewerEmail',p_reviewer_email,'version','property-intelligence-opportunity-subject-v1');
  expected_digest:=encode(extensions.digest(convert_to(canonical_request::text,'UTF8'),'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('property-intelligence-opportunity-subject-v1|command|'||p_command_id::text,0));
  select * into existing_command from public.intelligence_opportunity_subject_commands where command_id=p_command_id;
  if existing_command.command_id is not null then
    if existing_command.canonical_request<>canonical_request or existing_command.request_digest<>expected_digest then raise exception using errcode='23514',message='intelligence_opportunity_subject_command_semantics_conflict'; end if;
    return query select p.id,d.decision_number,d.decision,d.materialized_entity_id,d.materialized_subject_id,false
      from public.intelligence_opportunity_subject_proposals p join public.intelligence_opportunity_subject_decisions d on d.proposal_id=p.id and d.command_id=p_command_id
      where p.creation_command_id=p_command_id and d.decision<>'reversed' order by d.decision_number desc limit 1;
    if not found then raise exception using errcode='55000',message='intelligence_opportunity_subject_command_result_missing'; end if;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('property-intelligence-opportunity-subject-v1|opportunity|'||p_opportunity_id::text,0));
  if not exists(select 1 from public.acquisition_opportunities where id=p_opportunity_id) then raise exception using errcode='P0002',message='intelligence_opportunity_subject_opportunity_not_found'; end if;
  select * into current_subject from public.intelligence_opportunity_subjects where opportunity_id=p_opportunity_id and subject_role='primary_target' and relationship_status='confirmed';
  current_proposal_id:=current_subject.authority_proposal_id;
  if current_subject.id is not null then
    if p_action<>'confirm' or p_corrects_proposal_id is distinct from current_proposal_id then raise exception using errcode='23514',message='intelligence_opportunity_subject_current_authority_conflict'; end if;
  elsif p_corrects_proposal_id is not null then
    raise exception using errcode='23514',message='intelligence_opportunity_subject_correction_target_invalid';
  end if;
  if p_proposal_type='existing_property' then
    perform pg_advisory_xact_lock(hashtextextended('property-intelligence-opportunity-subject-v1|entity|'||p_existing_entity_id::text,0));
    select e.entity_type into existing_type from public.intelligence_entities e join public.intelligence_property_sites ps on ps.entity_id=e.id where e.id=p_existing_entity_id;
    if existing_type is distinct from 'property_site' then raise exception using errcode='23514',message='intelligence_opportunity_subject_existing_property_invalid'; end if;
  end if;
  insert into public.intelligence_opportunity_subject_commands(command_id,operation_kind,contract_version,opportunity_id,canonical_request,request_digest,created_by_email)
    values(p_command_id,'resolve_primary_target','property-intelligence-opportunity-subject-v1',p_opportunity_id,canonical_request,expected_digest,p_reviewer_email);
  insert into public.intelligence_opportunity_subject_proposals(id,opportunity_id,proposal_type,existing_entity_id,proposed_display_label,proposed_aliases,corrects_proposal_id,creation_command_id,proposed_by_email)
    values(new_proposal_id,p_opportunity_id,p_proposal_type,p_existing_entity_id,p_display_label,canonical_aliases,p_corrects_proposal_id,p_command_id,p_reviewer_email);
  stored_decision:=case p_action when 'confirm' then 'confirmed' when 'reject' then 'rejected' else 'ambiguous' end;
  if stored_decision='confirmed' then
    new_entity_id:=coalesce(p_existing_entity_id,gen_random_uuid()); new_subject_id:=gen_random_uuid();
  end if;
  if current_subject.id is not null then
    insert into public.intelligence_opportunity_subject_decisions(id,proposal_id,decision_number,expected_decision_number,decision,command_id,reviewer_email,rationale)
      select gen_random_uuid(),current_proposal_id,coalesce(max(d.decision_number),0)+1,coalesce(max(d.decision_number),0),'reversed',p_command_id,p_reviewer_email,'Replaced by an explicitly reviewed correction.' from public.intelligence_opportunity_subject_decisions d where d.proposal_id=current_proposal_id;
    update public.intelligence_opportunity_subjects set relationship_status='reversed' where id=current_subject.id;
  end if;
  insert into public.intelligence_opportunity_subject_decisions(id,proposal_id,decision_number,expected_decision_number,decision,command_id,reviewer_email,materialized_entity_id,materialized_subject_id)
    values(new_decision_id,new_proposal_id,1,0,stored_decision,p_command_id,p_reviewer_email,new_entity_id,new_subject_id);
  if stored_decision='confirmed' then
    if p_proposal_type='new_property' then
      insert into public.intelligence_entities(id,entity_type,display_name,lifecycle_status,created_by_email) values(new_entity_id,'property_site',p_display_label,'active',p_reviewer_email);
      insert into public.intelligence_property_sites(entity_id,development_state) values(new_entity_id,'unknown');
      for alias_item in select value from jsonb_array_elements(canonical_aliases) loop
        insert into public.intelligence_entity_aliases(entity_id,alias_type,alias_value,created_by_email) values(new_entity_id,alias_item->>'aliasType',alias_item->>'aliasValue',p_reviewer_email);
      end loop;
    end if;
    insert into public.intelligence_opportunity_subjects(id,opportunity_id,entity_id,subject_role,relationship_status,created_by_email,authority_proposal_id)
      values(new_subject_id,p_opportunity_id,new_entity_id,'primary_target','confirmed',p_reviewer_email,new_proposal_id);
  end if;
  return query select new_proposal_id,1,stored_decision,new_entity_id,new_subject_id,true;
end;
$$;

create function public.get_intelligence_opportunity_primary_target_v1(p_opportunity_id uuid)
returns table(authority_state text,proposal_id uuid,entity_id uuid,opportunity_subject_id uuid,display_name text,proposal_type text,decision_number integer,decided_at timestamptz)
language plpgsql security invoker set search_path='' as $$
declare authority_count integer;
begin
  select count(*) into authority_count from public.intelligence_opportunity_subjects s where s.opportunity_id=p_opportunity_id and s.subject_role='primary_target' and s.relationship_status='confirmed';
  if authority_count>1 then raise exception using errcode='23514',message='intelligence_opportunity_subject_authority_ambiguous'; end if;
  if authority_count=1 then
    return query select 'confirmed'::text,p.id,e.id,s.id,e.display_name,p.proposal_type,d.decision_number,d.decided_at
      from public.intelligence_opportunity_subjects s join public.intelligence_opportunity_subject_proposals p on p.id=s.authority_proposal_id
      join public.intelligence_entities e on e.id=s.entity_id join lateral(select x.decision_number,x.decision,x.decided_at from public.intelligence_opportunity_subject_decisions x where x.proposal_id=p.id order by x.decision_number desc limit 1)d on d.decision='confirmed'
      where s.opportunity_id=p_opportunity_id and s.subject_role='primary_target' and s.relationship_status='confirmed';
    if not found then raise exception using errcode='23514',message='intelligence_opportunity_subject_authority_inconsistent'; end if;
    return;
  end if;
  return query select coalesce(d.decision,'unresolved')::text,p.id,null::uuid,null::uuid,null::text,p.proposal_type,d.decision_number,d.decided_at
    from public.intelligence_opportunity_subject_proposals p join lateral(select x.decision_number,x.decision,x.decided_at from public.intelligence_opportunity_subject_decisions x where x.proposal_id=p.id order by x.decision_number desc limit 1)d on true
    where p.opportunity_id=p_opportunity_id order by p.created_at desc limit 1;
  if not found then return query select 'unresolved'::text,null::uuid,null::uuid,null::uuid,null::text,null::text,null::integer,null::timestamptz; end if;
end;
$$;

alter table public.intelligence_opportunity_subject_commands enable row level security;
alter table public.intelligence_opportunity_subject_proposals enable row level security;
alter table public.intelligence_opportunity_subject_decisions enable row level security;

revoke all on table public.intelligence_opportunity_subject_commands,public.intelligence_opportunity_subject_proposals,public.intelligence_opportunity_subject_decisions,public.intelligence_opportunity_subjects from public,anon,authenticated,service_role;
grant select on table public.intelligence_opportunity_subject_commands,public.intelligence_opportunity_subject_proposals,public.intelligence_opportunity_subject_decisions,public.intelligence_opportunity_subjects to service_role;

revoke all on function public.resolve_intelligence_opportunity_primary_target_v1(uuid,uuid,text,text,uuid,text,jsonb,uuid,text),public.get_intelligence_opportunity_primary_target_v1(uuid) from public,anon,authenticated;
grant execute on function public.resolve_intelligence_opportunity_primary_target_v1(uuid,uuid,text,text,uuid,text,jsonb,uuid,text),public.get_intelligence_opportunity_primary_target_v1(uuid) to service_role;

comment on table public.intelligence_opportunity_subject_proposals is 'Opportunity-scoped reviewed intent; distinct from entity-to-entity identity resolution.';
comment on function public.resolve_intelligence_opportunity_primary_target_v1(uuid,uuid,text,text,uuid,text,jsonb,uuid,text) is 'Atomic human-reviewed Property/Site primary-target authority. It implies no ownership, parcel, observation, comparability, or underwriting truth.';
