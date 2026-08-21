-- Phase 2C.1 acquisition Opportunity persistence. Private by default: RLS is
-- enabled below and this migration intentionally creates no browser policies.

create table public.acquisition_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null default 'new',
  asset_class text not null default 'retail',
  property_address_line_1 text,
  property_address_line_2 text,
  property_city text,
  property_state text,
  property_postal_code text,
  property_county text,
  property_market text,
  property_latitude numeric(9, 6),
  property_longitude numeric(9, 6),
  land_area_sf numeric(18, 2),
  existing_building_area_sf numeric(18, 2),
  asking_price numeric(18, 2),
  broker_name text,
  broker_company text,
  broker_email text,
  broker_phone text,
  assigned_to_email text,
  notes text,
  dead_reason text,
  promoted_deal_id uuid,
  archived_at timestamptz,
  revision integer not null default 1,
  created_by_email text not null,
  updated_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acquisition_opportunities_stage_check check (stage in (
    'new', 'screening', 'diligence', 'loi_preparation', 'loi_submitted',
    'negotiation', 'under_contract', 'promoted_to_deal', 'dead'
  )),
  constraint acquisition_opportunities_promoted_stage_check check (
    stage <> 'promoted_to_deal' or promoted_deal_id is not null
  ),
  constraint acquisition_opportunities_promoted_deal_key unique (promoted_deal_id),
  constraint acquisition_opportunities_promoted_deal_fkey foreign key (promoted_deal_id)
    references public.deals(id) on delete restrict,
  constraint acquisition_opportunities_revision_check check (revision > 0),
  constraint acquisition_opportunities_land_area_check check (land_area_sf is null or land_area_sf >= 0),
  constraint acquisition_opportunities_building_area_check check (existing_building_area_sf is null or existing_building_area_sf >= 0),
  constraint acquisition_opportunities_asking_price_check check (asking_price is null or asking_price >= 0),
  constraint acquisition_opportunities_latitude_check check (property_latitude is null or property_latitude between -90 and 90),
  constraint acquisition_opportunities_longitude_check check (property_longitude is null or property_longitude between -180 and 180)
);

create table public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  source_type text not null,
  provider text,
  external_id text,
  source_url text,
  storage_path text,
  title text,
  observed_at timestamptz,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_by_email text not null,
  updated_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_sources_opportunity_fkey foreign key (opportunity_id)
    references public.acquisition_opportunities(id) on delete cascade,
  constraint opportunity_sources_source_type_check check (
    source_type in ('manual', 'listing', 'document', 'api', 'email', 'other')
  ),
  constraint opportunity_sources_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint opportunity_sources_revision_check check (revision > 0),
  constraint opportunity_sources_id_opportunity_key unique (id, opportunity_id)
);

create table public.opportunity_underwriting_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  underwriting_type text not null,
  version_number integer not null,
  status text not null default 'draft',
  is_active boolean not null default false,
  based_on_version_id uuid,
  input_payload jsonb not null,
  result_payload jsonb,
  calculation_policy jsonb not null,
  calculation_version text,
  input_hash text,
  calculated_at timestamptz,
  finalized_at timestamptz,
  building_area_sf numeric(18, 2),
  market_rent_per_sf_year numeric(18, 6),
  development_cost_before_financing numeric(20, 2),
  development_cost_per_sf numeric(20, 6),
  stabilized_noi numeric(20, 2),
  return_on_cost numeric(18, 10),
  exit_cap_rate numeric(18, 10),
  development_spread numeric(18, 10),
  unlevered_profit numeric(20, 2),
  net_equity_invested numeric(20, 2),
  equity_multiple numeric(18, 10),
  annualized_equity_return numeric(18, 10),
  screen_result text,
  is_complete boolean,
  blocking_error_count integer not null default 0,
  warning_count integer not null default 0,
  revision integer not null default 1,
  created_by_email text not null,
  updated_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_underwriting_versions_opportunity_fkey foreign key (opportunity_id)
    references public.acquisition_opportunities(id) on delete cascade,
  constraint opportunity_underwriting_versions_based_on_fkey
    foreign key (based_on_version_id, opportunity_id, underwriting_type)
    references public.opportunity_underwriting_versions(id, opportunity_id, underwriting_type)
    on delete no action,
  constraint opportunity_underwriting_versions_not_self_based_check check (
    based_on_version_id is null or based_on_version_id <> id
  ),
  constraint opportunity_underwriting_versions_type_check check (underwriting_type in ('retail_development')),
  constraint opportunity_underwriting_versions_status_check check (status in ('draft', 'final')),
  constraint opportunity_underwriting_versions_screen_check check (
    screen_result is null or screen_result in ('PASS', 'REVIEW', 'PURSUE')
  ),
  constraint opportunity_underwriting_versions_version_check check (version_number > 0),
  constraint opportunity_underwriting_versions_revision_check check (revision > 0),
  constraint opportunity_underwriting_versions_diagnostics_check check (
    blocking_error_count >= 0 and warning_count >= 0
  ),
  constraint opportunity_underwriting_versions_input_check check (
    jsonb_typeof(input_payload) = 'object'
    and input_payload->>'schemaVersion' = 'retail-development-persistence-v1'
    and jsonb_typeof(input_payload->'engineInput') = 'object'
  ),
  constraint opportunity_underwriting_versions_policy_check check (jsonb_typeof(calculation_policy) = 'object'),
  constraint opportunity_underwriting_versions_result_check check (
    result_payload is null or jsonb_typeof(result_payload) = 'object'
  ),
  constraint opportunity_underwriting_versions_final_check check (
    status <> 'final' or (
      result_payload is not null and calculation_version is not null
      and input_hash is not null and calculated_at is not null
      and finalized_at is not null and is_complete is not null
    )
  ),
  constraint opportunity_underwriting_versions_opportunity_type_version_key
    unique (opportunity_id, underwriting_type, version_number),
  constraint opportunity_underwriting_versions_id_opportunity_key unique (id, opportunity_id),
  constraint opportunity_underwriting_versions_lineage_key
    unique (id, opportunity_id, underwriting_type)
);

create table public.opportunity_field_provenance (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  underwriting_version_id uuid,
  opportunity_source_id uuid,
  scope text not null,
  field_path text not null,
  tenant_key uuid,
  provenance_type text not null,
  original_text text,
  original_value jsonb,
  normalized_value jsonb,
  unit text,
  source_locator text,
  confidence numeric(5, 4),
  supersedes_provenance_id uuid,
  superseded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint opportunity_field_provenance_opportunity_fkey foreign key (opportunity_id)
    references public.acquisition_opportunities(id) on delete cascade,
  constraint opportunity_field_provenance_version_fkey
    foreign key (underwriting_version_id, opportunity_id)
    references public.opportunity_underwriting_versions(id, opportunity_id) on delete cascade,
  constraint opportunity_field_provenance_source_fkey
    foreign key (opportunity_source_id, opportunity_id)
    references public.opportunity_sources(id, opportunity_id) on delete no action,
  constraint opportunity_field_provenance_supersedes_fkey
    foreign key (supersedes_provenance_id, opportunity_id)
    references public.opportunity_field_provenance(id, opportunity_id) on delete no action,
  constraint opportunity_field_provenance_scope_check check (
    (scope = 'opportunity' and underwriting_version_id is null and tenant_key is null)
    or (scope = 'underwriting' and underwriting_version_id is not null)
  ),
  constraint opportunity_field_provenance_type_check check (provenance_type in (
    'manual', 'organization_default', 'listing_extraction', 'document_extraction',
    'api', 'prior_version', 'manual_override'
  )),
  constraint opportunity_field_provenance_field_path_check check (length(btrim(field_path)) > 0),
  constraint opportunity_field_provenance_confidence_check check (
    confidence is null or confidence between 0 and 1
  ),
  constraint opportunity_field_provenance_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint opportunity_field_provenance_not_self_superseding_check check (
    supersedes_provenance_id is null or supersedes_provenance_id <> id
  ),
  constraint opportunity_field_provenance_id_opportunity_key unique (id, opportunity_id)
);

create index acquisition_opportunities_stage_updated_idx
  on public.acquisition_opportunities (stage, updated_at desc) where archived_at is null;
create index acquisition_opportunities_assignee_stage_idx
  on public.acquisition_opportunities (assigned_to_email, stage, updated_at desc) where archived_at is null;
create index acquisition_opportunities_market_idx
  on public.acquisition_opportunities (property_state, property_market) where archived_at is null;
create index acquisition_opportunities_created_by_idx
  on public.acquisition_opportunities (created_by_email, created_at desc);

create unique index opportunity_sources_one_primary_idx
  on public.opportunity_sources (opportunity_id) where is_primary;
create index opportunity_sources_opportunity_created_idx
  on public.opportunity_sources (opportunity_id, created_at desc);
create index opportunity_sources_provider_external_idx on public.opportunity_sources (provider, external_id);
create index opportunity_sources_type_idx on public.opportunity_sources (source_type);

create unique index opportunity_underwriting_versions_one_active_idx
  on public.opportunity_underwriting_versions (opportunity_id, underwriting_type) where is_active;
create index opportunity_underwriting_versions_lookup_idx
  on public.opportunity_underwriting_versions (opportunity_id, underwriting_type, created_at desc);
create index opportunity_underwriting_versions_status_idx
  on public.opportunity_underwriting_versions (status, updated_at desc);
create index opportunity_underwriting_versions_screen_roc_idx
  on public.opportunity_underwriting_versions (screen_result, return_on_cost desc) where is_active;

create index opportunity_field_provenance_field_idx
  on public.opportunity_field_provenance (opportunity_id, scope, field_path);
create index opportunity_field_provenance_version_idx
  on public.opportunity_field_provenance (underwriting_version_id, field_path);
create index opportunity_field_provenance_source_idx
  on public.opportunity_field_provenance (opportunity_source_id);
create unique index opportunity_field_provenance_current_opportunity_idx
  on public.opportunity_field_provenance (opportunity_id, field_path)
  where scope = 'opportunity' and superseded_at is null;
create unique index opportunity_field_provenance_current_underwriting_idx
  on public.opportunity_field_provenance (underwriting_version_id, field_path)
  where scope = 'underwriting' and tenant_key is null and superseded_at is null;
create unique index opportunity_field_provenance_current_tenant_idx
  on public.opportunity_field_provenance (underwriting_version_id, tenant_key, field_path)
  where scope = 'underwriting' and tenant_key is not null and superseded_at is null;

create function public.set_acquisition_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger acquisition_opportunities_set_updated_at before update on public.acquisition_opportunities
  for each row execute function public.set_acquisition_updated_at();
create trigger opportunity_sources_set_updated_at before update on public.opportunity_sources
  for each row execute function public.set_acquisition_updated_at();
create trigger opportunity_underwriting_versions_set_updated_at
  before update on public.opportunity_underwriting_versions
  for each row execute function public.set_acquisition_updated_at();

create function public.protect_historical_opportunity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.opportunity_underwriting_versions
    where opportunity_id = old.id and status = 'final'
  ) then
    raise exception 'Opportunities with finalized underwriting are historical and cannot be deleted; retire them through lifecycle stage';
  end if;
  return old;
end;
$$;

create trigger acquisition_opportunities_protect_historical
before delete on public.acquisition_opportunities
for each row execute function public.protect_historical_opportunity();

create function public.protect_final_underwriting_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'final' then
      raise exception 'Final underwriting versions are historical and cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'draft' and new.status = 'final' then
    perform pg_advisory_xact_lock(hashtextextended(new.id::text, 0));
    if exists (
      select 1
      from public.opportunity_field_provenance original
      join public.opportunity_field_provenance successor
        on successor.supersedes_provenance_id = original.id
       and successor.opportunity_id = original.opportunity_id
      where original.underwriting_version_id = new.id
    ) then
      raise exception 'Cannot finalize underwriting whose provenance has been superseded';
    end if;
  end if;

  if old.status = 'final' and (
    new.opportunity_id is distinct from old.opportunity_id
    or new.underwriting_type is distinct from old.underwriting_type
    or new.version_number is distinct from old.version_number
    or new.status is distinct from old.status
    or new.based_on_version_id is distinct from old.based_on_version_id
    or new.input_payload is distinct from old.input_payload
    or new.result_payload is distinct from old.result_payload
    or new.calculation_policy is distinct from old.calculation_policy
    or new.calculation_version is distinct from old.calculation_version
    or new.input_hash is distinct from old.input_hash
    or new.calculated_at is distinct from old.calculated_at
    or new.finalized_at is distinct from old.finalized_at
    or new.building_area_sf is distinct from old.building_area_sf
    or new.market_rent_per_sf_year is distinct from old.market_rent_per_sf_year
    or new.development_cost_before_financing is distinct from old.development_cost_before_financing
    or new.development_cost_per_sf is distinct from old.development_cost_per_sf
    or new.stabilized_noi is distinct from old.stabilized_noi
    or new.return_on_cost is distinct from old.return_on_cost
    or new.exit_cap_rate is distinct from old.exit_cap_rate
    or new.development_spread is distinct from old.development_spread
    or new.unlevered_profit is distinct from old.unlevered_profit
    or new.net_equity_invested is distinct from old.net_equity_invested
    or new.equity_multiple is distinct from old.equity_multiple
    or new.annualized_equity_return is distinct from old.annualized_equity_return
    or new.screen_result is distinct from old.screen_result
    or new.is_complete is distinct from old.is_complete
    or new.blocking_error_count is distinct from old.blocking_error_count
    or new.warning_count is distinct from old.warning_count
    or new.revision is distinct from old.revision
    or new.created_by_email is distinct from old.created_by_email
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Final underwriting economic state is immutable';
  end if;
  return new;
end;
$$;

create trigger opportunity_underwriting_versions_protect_final
before update or delete on public.opportunity_underwriting_versions
for each row execute function public.protect_final_underwriting_version();

create function public.protect_final_underwriting_provenance()
returns trigger language plpgsql set search_path = '' as $$
declare
  protected_version_id uuid;
  superseded_version_id uuid;
begin
  protected_version_id = case
    when tg_op = 'DELETE' then old.underwriting_version_id
    else new.underwriting_version_id
  end;
  if protected_version_id is not null and exists (
    select 1 from public.opportunity_underwriting_versions
    where id = protected_version_id and status = 'final'
  ) then
    raise exception 'Provenance associated with a final underwriting version is immutable';
  end if;
  if tg_op = 'UPDATE'
    and old.underwriting_version_id is distinct from new.underwriting_version_id
    and old.underwriting_version_id is not null
    and exists (
      select 1 from public.opportunity_underwriting_versions
      where id = old.underwriting_version_id and status = 'final'
    )
  then
    raise exception 'Provenance associated with a final underwriting version is immutable';
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.supersedes_provenance_id is not null then
    select referenced.underwriting_version_id
    into superseded_version_id
    from public.opportunity_field_provenance referenced
    where referenced.id = new.supersedes_provenance_id
      and referenced.opportunity_id = new.opportunity_id;

    if superseded_version_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(superseded_version_id::text, 0));
      if exists (
        select 1 from public.opportunity_underwriting_versions
        where id = superseded_version_id and status = 'final'
      ) then
        raise exception 'Provenance associated with a final underwriting version cannot be superseded';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger opportunity_field_provenance_protect_final
before insert or update or delete on public.opportunity_field_provenance
for each row execute function public.protect_final_underwriting_provenance();

create function public.enforce_no_final_provenance_supersession()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.supersedes_provenance_id is not null and exists (
    select 1
    from public.opportunity_field_provenance referenced
    join public.opportunity_underwriting_versions version
      on version.id = referenced.underwriting_version_id
     and version.opportunity_id = referenced.opportunity_id
    where referenced.id = new.supersedes_provenance_id
      and referenced.opportunity_id = new.opportunity_id
      and version.status = 'final'
  ) then
    raise exception 'Provenance associated with a final underwriting version cannot be superseded';
  end if;
  return new;
end;
$$;

create constraint trigger opportunity_field_provenance_enforce_final_supersession
after insert or update on public.opportunity_field_provenance
deferrable initially deferred
for each row execute function public.enforce_no_final_provenance_supersession();

create function public.enforce_final_underwriting_not_superseded()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'final' and exists (
    select 1
    from public.opportunity_field_provenance original
    join public.opportunity_field_provenance successor
      on successor.supersedes_provenance_id = original.id
     and successor.opportunity_id = original.opportunity_id
    where original.underwriting_version_id = new.id
  ) then
    raise exception 'Cannot finalize underwriting whose provenance has been superseded';
  end if;
  return new;
end;
$$;

create constraint trigger opportunity_underwriting_versions_enforce_unsuperseded
after insert or update on public.opportunity_underwriting_versions
deferrable initially deferred
for each row execute function public.enforce_final_underwriting_not_superseded();

alter table public.acquisition_opportunities enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.opportunity_underwriting_versions enable row level security;
alter table public.opportunity_field_provenance enable row level security;

comment on column public.opportunity_underwriting_versions.input_payload is
  'Versioned persistence envelope. Tenant-roster entries carry durable tenantKey UUIDs; the application mapper strips them before invoking the pure engine.';
comment on column public.opportunity_field_provenance.tenant_key is
  'Authoritative durable tenant identity for tenant-specific provenance. Null for non-tenant fields; never duplicated in field_path or represented by an array index.';
comment on column public.opportunity_field_provenance.field_path is
  'Opportunity or underwriting field path. Tenant-specific rows use a tenant-relative path such as rentalRatePerSfYear; tenant_key carries identity.';
comment on table public.acquisition_opportunities is
  'Acquisition workspace before first final underwriting; durable history afterward. Historical Opportunities are retired with lifecycle stage (normally dead), not hard-deleted.';
