-- Phase 3A.0 narrow transactional persistence primitives for Opportunity services.
-- Business validation, underwriting calculations, hashing, and authorization stay
-- in the server-side TypeScript application layer.

create function public.create_opportunity_underwriting_draft(
  p_opportunity_id uuid,
  p_input_payload jsonb,
  p_calculation_policy jsonb,
  p_actor_email text,
  p_make_active boolean default false
)
returns table (
  version_id uuid,
  opportunity_id uuid,
  underwriting_type text,
  version_number integer,
  status text,
  is_active boolean,
  revision integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_version integer;
  inserted public.opportunity_underwriting_versions%rowtype;
begin
  if p_actor_email is null or length(btrim(p_actor_email)) = 0 then
    raise exception using errcode = '22023', message = 'actor_email_required';
  end if;

  perform 1
  from public.acquisition_opportunities opportunity
  where opportunity.id = p_opportunity_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'opportunity_not_found';
  end if;

  select coalesce(max(version.version_number), 0) + 1
  into next_version
  from public.opportunity_underwriting_versions version
  where version.opportunity_id = p_opportunity_id
    and version.underwriting_type = 'retail_development';

  if p_make_active then
    update public.opportunity_underwriting_versions version
    set is_active = false,
        revision = case when version.status = 'draft'
          then version.revision + 1 else version.revision end,
        updated_by_email = p_actor_email
    where version.opportunity_id = p_opportunity_id
      and version.underwriting_type = 'retail_development'
      and version.is_active;
  end if;

  insert into public.opportunity_underwriting_versions (
    opportunity_id, underwriting_type, version_number, status, is_active,
    input_payload, calculation_policy, created_by_email, updated_by_email
  ) values (
    p_opportunity_id, 'retail_development', next_version, 'draft', p_make_active,
    p_input_payload, p_calculation_policy, p_actor_email, p_actor_email
  ) returning * into inserted;

  return query select inserted.id, inserted.opportunity_id, inserted.underwriting_type,
    inserted.version_number, inserted.status, inserted.is_active, inserted.revision;
end;
$$;

create function public.set_active_opportunity_underwriting(
  p_opportunity_id uuid,
  p_version_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns table (
  version_id uuid,
  opportunity_id uuid,
  underwriting_type text,
  version_number integer,
  status text,
  is_active boolean,
  revision integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.opportunity_underwriting_versions%rowtype;
begin
  if p_actor_email is null or length(btrim(p_actor_email)) = 0 then
    raise exception using errcode = '22023', message = 'actor_email_required';
  end if;

  perform 1
  from public.acquisition_opportunities opportunity
  where opportunity.id = p_opportunity_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'opportunity_not_found';
  end if;

  perform 1
  from public.opportunity_underwriting_versions version
  where version.opportunity_id = p_opportunity_id
    and version.underwriting_type = 'retail_development'
  order by version.id
  for update;

  select * into target
  from public.opportunity_underwriting_versions version
  where version.id = p_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'underwriting_version_not_found';
  end if;
  if target.opportunity_id <> p_opportunity_id
    or target.underwriting_type <> 'retail_development' then
    raise exception using errcode = '22023', message = 'underwriting_version_relationship_invalid';
  end if;
  if target.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'underwriting_revision_conflict';
  end if;

  if not target.is_active then
    update public.opportunity_underwriting_versions version
    set is_active = false,
        revision = case when version.status = 'draft'
          then version.revision + 1 else version.revision end,
        updated_by_email = p_actor_email
    where version.opportunity_id = p_opportunity_id
      and version.underwriting_type = 'retail_development'
      and version.is_active;

    update public.opportunity_underwriting_versions version
    set is_active = true,
        revision = case when version.status = 'draft'
          then version.revision + 1 else version.revision end,
        updated_by_email = p_actor_email
    where version.id = p_version_id
    returning * into target;
  end if;

  return query select target.id, target.opportunity_id, target.underwriting_type,
    target.version_number, target.status, target.is_active, target.revision;
end;
$$;

create function public.replace_opportunity_field_provenance(
  p_opportunity_id uuid,
  p_domain text,
  p_field_path text,
  p_provenance_type text,
  p_actor_email text,
  p_underwriting_version_id uuid default null,
  p_tenant_key uuid default null,
  p_opportunity_source_id uuid default null,
  p_original_text text default null,
  p_original_value jsonb default null,
  p_normalized_value jsonb default null,
  p_unit text default null,
  p_source_locator text default null,
  p_confidence numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  provenance_id uuid,
  supersedes_provenance_id uuid,
  opportunity_id uuid,
  scope text,
  underwriting_version_id uuid,
  tenant_key uuid,
  field_path text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prior public.opportunity_field_provenance%rowtype;
  inserted public.opportunity_field_provenance%rowtype;
  resolved_scope text;
begin
  if p_actor_email is null or length(btrim(p_actor_email)) = 0 then
    raise exception using errcode = '22023', message = 'actor_email_required';
  end if;
  if p_field_path is null or length(btrim(p_field_path)) = 0 then
    raise exception using errcode = '22023', message = 'provenance_field_path_required';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'provenance_metadata_invalid';
  end if;

  if p_domain = 'opportunity' then
    if p_underwriting_version_id is not null or p_tenant_key is not null then
      raise exception using errcode = '22023', message = 'opportunity_provenance_scope_invalid';
    end if;
    resolved_scope := 'opportunity';
  elsif p_domain = 'underwriting' then
    if p_underwriting_version_id is null or p_tenant_key is not null then
      raise exception using errcode = '22023', message = 'underwriting_provenance_scope_invalid';
    end if;
    resolved_scope := 'underwriting';
  elsif p_domain = 'tenant' then
    if p_underwriting_version_id is null or p_tenant_key is null then
      raise exception using errcode = '22023', message = 'tenant_provenance_scope_invalid';
    end if;
    resolved_scope := 'underwriting';
  else
    raise exception using errcode = '22023', message = 'provenance_domain_invalid';
  end if;

  perform 1
  from public.acquisition_opportunities opportunity
  where opportunity.id = p_opportunity_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'opportunity_not_found';
  end if;

  if p_underwriting_version_id is not null then
    perform 1
    from public.opportunity_underwriting_versions version
    where version.id = p_underwriting_version_id
      and version.opportunity_id = p_opportunity_id
      and version.underwriting_type = 'retail_development'
      and version.status = 'draft'
    for update;
    if not found then
      if exists (
        select 1 from public.opportunity_underwriting_versions version
        where version.id = p_underwriting_version_id
          and version.opportunity_id = p_opportunity_id
          and version.status = 'final'
      ) then
        raise exception using errcode = '55000', message = 'final_underwriting_provenance_immutable';
      end if;
      raise exception using errcode = '22023', message = 'underwriting_version_relationship_invalid';
    end if;
  end if;

  if p_opportunity_source_id is not null and not exists (
    select 1 from public.opportunity_sources source
    where source.id = p_opportunity_source_id
      and source.opportunity_id = p_opportunity_id
  ) then
    raise exception using errcode = '22023', message = 'opportunity_source_relationship_invalid';
  end if;

  select * into prior
  from public.opportunity_field_provenance provenance
  where provenance.opportunity_id = p_opportunity_id
    and provenance.scope = resolved_scope
    and provenance.field_path = btrim(p_field_path)
    and provenance.underwriting_version_id is not distinct from p_underwriting_version_id
    and provenance.tenant_key is not distinct from p_tenant_key
    and provenance.superseded_at is null
  for update;

  if found then
    update public.opportunity_field_provenance provenance
    set superseded_at = now()
    where provenance.id = prior.id;
  end if;

  insert into public.opportunity_field_provenance (
    opportunity_id, underwriting_version_id, opportunity_source_id, scope,
    field_path, tenant_key, provenance_type, original_text, original_value,
    normalized_value, unit, source_locator, confidence,
    supersedes_provenance_id, metadata, created_by_email
  ) values (
    p_opportunity_id, p_underwriting_version_id, p_opportunity_source_id,
    resolved_scope, btrim(p_field_path), p_tenant_key, p_provenance_type,
    p_original_text, p_original_value, p_normalized_value, p_unit,
    p_source_locator, p_confidence, prior.id, p_metadata, p_actor_email
  ) returning * into inserted;

  return query select inserted.id, inserted.supersedes_provenance_id,
    inserted.opportunity_id, inserted.scope, inserted.underwriting_version_id,
    inserted.tenant_key, inserted.field_path, inserted.created_at;
end;
$$;

create function public.clone_opportunity_underwriting_version(
  p_source_version_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns table (
  version_id uuid,
  opportunity_id uuid,
  underwriting_type text,
  version_number integer,
  status text,
  is_active boolean,
  revision integer,
  based_on_version_id uuid,
  copied_provenance_count integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source public.opportunity_underwriting_versions%rowtype;
  inserted public.opportunity_underwriting_versions%rowtype;
  next_version integer;
  copied_count integer;
begin
  if p_actor_email is null or length(btrim(p_actor_email)) = 0 then
    raise exception using errcode = '22023', message = 'actor_email_required';
  end if;

  select * into source
  from public.opportunity_underwriting_versions version
  where version.id = p_source_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'underwriting_version_not_found';
  end if;

  perform 1
  from public.acquisition_opportunities opportunity
  where opportunity.id = source.opportunity_id
  for update;

  select * into source
  from public.opportunity_underwriting_versions version
  where version.id = p_source_version_id
  for update;
  if source.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'underwriting_revision_conflict';
  end if;
  if source.underwriting_type <> 'retail_development' then
    raise exception using errcode = '22023', message = 'underwriting_type_invalid';
  end if;

  select coalesce(max(version.version_number), 0) + 1
  into next_version
  from public.opportunity_underwriting_versions version
  where version.opportunity_id = source.opportunity_id
    and version.underwriting_type = source.underwriting_type;

  update public.opportunity_underwriting_versions version
  set is_active = false,
      revision = case when version.status = 'draft'
        then version.revision + 1 else version.revision end,
      updated_by_email = p_actor_email
  where version.opportunity_id = source.opportunity_id
    and version.underwriting_type = source.underwriting_type
    and version.is_active;

  insert into public.opportunity_underwriting_versions (
    opportunity_id, underwriting_type, version_number, status, is_active,
    based_on_version_id, input_payload, calculation_policy,
    created_by_email, updated_by_email
  ) values (
    source.opportunity_id, source.underwriting_type, next_version, 'draft', true,
    source.id, source.input_payload, source.calculation_policy,
    p_actor_email, p_actor_email
  ) returning * into inserted;

  insert into public.opportunity_field_provenance (
    opportunity_id, underwriting_version_id, opportunity_source_id, scope,
    field_path, tenant_key, provenance_type, original_text, original_value,
    normalized_value, unit, source_locator, confidence, metadata, created_by_email
  )
  select provenance.opportunity_id, inserted.id, provenance.opportunity_source_id,
    'underwriting', provenance.field_path, provenance.tenant_key, 'prior_version',
    provenance.original_text, provenance.original_value, provenance.normalized_value,
    provenance.unit, provenance.source_locator, provenance.confidence,
    provenance.metadata || jsonb_build_object(
      'clonedFromVersionId', source.id,
      'clonedFromProvenanceId', provenance.id
    ), p_actor_email
  from public.opportunity_field_provenance provenance
  where provenance.underwriting_version_id = source.id
    and provenance.scope = 'underwriting'
    and provenance.superseded_at is null;
  get diagnostics copied_count = row_count;

  return query select inserted.id, inserted.opportunity_id, inserted.underwriting_type,
    inserted.version_number, inserted.status, inserted.is_active, inserted.revision,
    inserted.based_on_version_id, copied_count;
end;
$$;

revoke execute on function public.create_opportunity_underwriting_draft(uuid, jsonb, jsonb, text, boolean) from public;
revoke execute on function public.create_opportunity_underwriting_draft(uuid, jsonb, jsonb, text, boolean) from anon;
revoke execute on function public.create_opportunity_underwriting_draft(uuid, jsonb, jsonb, text, boolean) from authenticated;
grant execute on function public.create_opportunity_underwriting_draft(uuid, jsonb, jsonb, text, boolean) to service_role;

revoke execute on function public.set_active_opportunity_underwriting(uuid, uuid, integer, text) from public;
revoke execute on function public.set_active_opportunity_underwriting(uuid, uuid, integer, text) from anon;
revoke execute on function public.set_active_opportunity_underwriting(uuid, uuid, integer, text) from authenticated;
grant execute on function public.set_active_opportunity_underwriting(uuid, uuid, integer, text) to service_role;

revoke execute on function public.replace_opportunity_field_provenance(uuid, text, text, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text, numeric, jsonb) from public;
revoke execute on function public.replace_opportunity_field_provenance(uuid, text, text, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text, numeric, jsonb) from anon;
revoke execute on function public.replace_opportunity_field_provenance(uuid, text, text, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text, numeric, jsonb) from authenticated;
grant execute on function public.replace_opportunity_field_provenance(uuid, text, text, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text, numeric, jsonb) to service_role;

revoke execute on function public.clone_opportunity_underwriting_version(uuid, integer, text) from public;
revoke execute on function public.clone_opportunity_underwriting_version(uuid, integer, text) from anon;
revoke execute on function public.clone_opportunity_underwriting_version(uuid, integer, text) from authenticated;
grant execute on function public.clone_opportunity_underwriting_version(uuid, integer, text) to service_role;

comment on function public.create_opportunity_underwriting_draft(uuid, jsonb, jsonb, text, boolean) is
  'Server-only atomic draft version allocation. Authorization and payload validation remain in TypeScript.';
comment on function public.set_active_opportunity_underwriting(uuid, uuid, integer, text) is
  'Server-only atomic active underwriting switch with optimistic concurrency on the selected version.';
comment on function public.replace_opportunity_field_provenance(uuid, text, text, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text, numeric, jsonb) is
  'Server-only atomic append-and-supersede for canonical Opportunity, underwriting, or tenant provenance fields.';
comment on function public.clone_opportunity_underwriting_version(uuid, integer, text) is
  'Server-only atomic clone, version allocation, current provenance copy, and active selection.';
