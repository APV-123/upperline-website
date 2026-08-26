-- Phase 4C.1: private property-intelligence identity and source foundation.
-- Observations, evidence, extraction, recommendations, and underwriting application
-- are deliberately outside this migration.

create table public.intelligence_publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  publisher_type text not null,
  website_url text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_publishers_name_check check (length(btrim(name)) > 0),
  constraint intelligence_publishers_type_check check (publisher_type in (
    'owner','broker','government','data_provider','professional_firm','tenant','other'
  )),
  constraint intelligence_publishers_website_check check (
    website_url is null or website_url ~ '^https://'
  )
);

create table public.intelligence_sources (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid references public.intelligence_publishers(id) on delete restrict,
  title text not null,
  source_kind text not null,
  external_identifier text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_sources_title_check check (length(btrim(title)) > 0),
  constraint intelligence_sources_kind_check check (source_kind in (
    'offering_memorandum','marketing_material','rent_roll','operating_statement',
    'lease','demographic_report','traffic_dataset','parcel_property_data',
    'broker_communication','public_dataset','other'
  )),
  constraint intelligence_sources_external_id_check check (
    external_identifier is null or length(btrim(external_identifier)) > 0
  )
);

create table public.intelligence_source_editions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.intelligence_sources(id) on delete restrict,
  edition_label text,
  publication_precision text not null default 'unknown',
  publication_year integer,
  publication_month integer,
  publication_day integer,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_source_editions_label_check check (
    edition_label is null or length(btrim(edition_label)) > 0
  ),
  constraint intelligence_source_editions_precision_check check (
    (publication_precision = 'unknown' and publication_year is null and publication_month is null and publication_day is null)
    or (publication_precision = 'year' and publication_year is not null and publication_month is null and publication_day is null)
    or (publication_precision = 'month' and publication_year is not null and publication_month between 1 and 12 and publication_day is null)
    or (publication_precision = 'day' and publication_year is not null and publication_month between 1 and 12
      and publication_day between 1 and extract(day from (make_date(publication_year, publication_month, 1)
        + interval '1 month - 1 day'))::integer)
  ),
  constraint intelligence_source_editions_year_check check (
    publication_year is null or publication_year between 1800 and 2200
  ),
  constraint intelligence_source_editions_id_source_key unique (id, source_id)
);

create table public.intelligence_source_authority_assessments (
  id uuid primary key default gen_random_uuid(),
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  assessment_number integer not null,
  authority_class text not null,
  rationale text,
  assessed_by_email text not null,
  assessed_at timestamptz not null default now(),
  constraint intelligence_source_authority_number_check check (assessment_number > 0),
  constraint intelligence_source_authority_class_check check (authority_class in (
    'executed_legal_document','owner_operating_record','authoritative_dataset',
    'professional_report','marketing_material','broker_communication','derived_model_output'
  )),
  constraint intelligence_source_authority_rationale_check check (
    rationale is null or length(btrim(rationale)) > 0
  ),
  constraint intelligence_source_authority_assessment_key unique (source_edition_id, assessment_number)
);

create table public.intelligence_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  display_name text not null,
  lifecycle_status text not null default 'active',
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_entities_type_check check (entity_type in (
    'property_site','parcel','building','premises','organization','brand','road',
    'road_segment','traffic_station','geographic_study_area'
  )),
  constraint intelligence_entities_name_check check (length(btrim(display_name)) > 0),
  constraint intelligence_entities_lifecycle_check check (lifecycle_status in (
    'provisional','active','inactive','superseded'
  ))
);

create table public.intelligence_property_sites (
  entity_id uuid primary key references public.intelligence_entities(id) on delete restrict,
  development_state text not null default 'unknown',
  created_at timestamptz not null default now(),
  constraint intelligence_property_sites_state_check check (development_state in (
    'unknown','land','improved','mixed_use','redevelopment'
  ))
);

create table public.intelligence_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  alias_type text not null,
  alias_value text not null,
  valid_from date,
  valid_to date,
  source_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_entity_aliases_type_check check (alias_type in (
    'property_name','former_name','address','parcel_number','road_name','suite_number',
    'trade_name','legal_name','other'
  )),
  constraint intelligence_entity_aliases_value_check check (length(btrim(alias_value)) > 0),
  constraint intelligence_entity_aliases_period_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  )
);

create table public.intelligence_entity_external_identifiers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  namespace text not null,
  identifier_value text not null,
  issuer_publisher_id uuid references public.intelligence_publishers(id) on delete restrict,
  valid_from date,
  valid_to date,
  source_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_entity_external_ids_namespace_check check (length(btrim(namespace)) > 0),
  constraint intelligence_entity_external_ids_value_check check (length(btrim(identifier_value)) > 0),
  constraint intelligence_entity_external_ids_period_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  )
);

create table public.intelligence_entity_relationships (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  relationship_type text not null,
  to_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  valid_from date,
  valid_to date,
  source_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  relationship_status text not null default 'confirmed',
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_entity_relationships_not_self_check check (from_entity_id <> to_entity_id),
  constraint intelligence_entity_relationships_type_check check (relationship_type in (
    'contains','part_of','adjacent_to','predecessor_of','successor_of','associated_with'
  )),
  constraint intelligence_entity_relationships_status_check check (relationship_status in (
    'proposed','confirmed','rejected','reversed'
  )),
  constraint intelligence_entity_relationships_period_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  )
);

create table public.intelligence_opportunity_subjects (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete restrict,
  entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  subject_role text not null,
  relationship_status text not null default 'confirmed',
  source_edition_id uuid references public.intelligence_source_editions(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_opportunity_subjects_role_check check (subject_role in (
    'primary_target','assemblage_component','comparable','adjacent','reference'
  )),
  constraint intelligence_opportunity_subjects_status_check check (relationship_status in (
    'proposed','confirmed','rejected','reversed'
  )),
  constraint intelligence_opportunity_subjects_identity_key unique (opportunity_id, entity_id, subject_role)
);

create table public.intelligence_entity_resolution_proposals (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  candidate_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  resolution_basis text not null,
  proposed_score numeric(5,4),
  proposed_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_entity_resolution_not_self_check check (subject_entity_id <> candidate_entity_id),
  constraint intelligence_entity_resolution_basis_check check (resolution_basis in (
    'manual','external_identifier','address','geometry','name','composite'
  )),
  constraint intelligence_entity_resolution_score_check check (
    proposed_score is null or proposed_score between 0 and 1
  ),
  constraint intelligence_entity_resolution_pair_key unique (subject_entity_id, candidate_entity_id)
);

create table public.intelligence_entity_resolution_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.intelligence_entity_resolution_proposals(id) on delete restrict,
  decision_number integer not null,
  decision text not null,
  rationale text,
  reviewer_email text not null,
  decided_at timestamptz not null default now(),
  constraint intelligence_entity_resolution_decision_number_check check (decision_number > 0),
  constraint intelligence_entity_resolution_decision_check check (decision in (
    'confirmed_match','rejected_match','reversed'
  )),
  constraint intelligence_entity_resolution_rationale_check check (
    rationale is null or length(btrim(rationale)) > 0
  ),
  constraint intelligence_entity_resolution_decision_key unique (proposal_id, decision_number)
);

create table public.intelligence_artifacts (
  id uuid primary key default gen_random_uuid(),
  sha256_digest text not null,
  byte_size bigint not null,
  detected_media_type text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_artifacts_digest_check check (sha256_digest ~ '^[0-9a-f]{64}$'),
  constraint intelligence_artifacts_size_check check (byte_size > 0),
  constraint intelligence_artifacts_media_type_check check (length(btrim(detected_media_type)) > 0),
  constraint intelligence_artifacts_content_identity_key unique (sha256_digest)
);

create table public.intelligence_artifact_acquisitions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.intelligence_artifacts(id) on delete restrict,
  opportunity_id uuid references public.acquisition_opportunities(id) on delete restrict,
  legacy_opportunity_artifact_id uuid unique references public.opportunity_source_artifacts(id) on delete restrict,
  acquisition_channel text not null,
  access_class text not null default 'private',
  storage_bucket text,
  storage_path text,
  original_filename text,
  external_locator text,
  acquired_by_email text not null,
  acquired_at timestamptz not null default now(),
  constraint intelligence_artifact_acquisitions_channel_check check (acquisition_channel in (
    'upload','email','api','download','manual_reference','legacy_link'
  )),
  constraint intelligence_artifact_acquisitions_legacy_channel_check check (
    (acquisition_channel = 'legacy_link' and legacy_opportunity_artifact_id is not null and opportunity_id is not null)
    or (acquisition_channel <> 'legacy_link' and legacy_opportunity_artifact_id is null)
  ),
  constraint intelligence_artifact_acquisitions_access_check check (access_class in (
    'private','restricted','internal','public'
  )),
  constraint intelligence_artifact_acquisitions_storage_check check (
    (storage_bucket is null and storage_path is null)
    or (length(btrim(storage_bucket)) > 0 and length(btrim(storage_path)) > 0)
  ),
  constraint intelligence_artifact_acquisitions_locator_check check (
    external_locator is null or length(btrim(external_locator)) > 0
  ),
  constraint intelligence_artifact_acquisitions_origin_check check (
    storage_path is not null or external_locator is not null or legacy_opportunity_artifact_id is not null
  )
);

create table public.intelligence_source_edition_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  artifact_id uuid not null references public.intelligence_artifacts(id) on delete restrict,
  representation_role text not null,
  is_primary boolean not null default false,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_source_edition_artifacts_role_check check (representation_role in (
    'primary','supplement','embedded','derivative'
  )),
  constraint intelligence_source_edition_artifacts_primary_role_check check (
    not is_primary or representation_role = 'primary'
  ),
  constraint intelligence_source_edition_artifacts_identity_key unique (source_edition_id, artifact_id)
);

create table public.intelligence_source_relationships (
  id uuid primary key default gen_random_uuid(),
  containing_source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  relationship_type text not null,
  attributed_source_id uuid not null references public.intelligence_sources(id) on delete restrict,
  attributed_source_edition_id uuid,
  attribution_text text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  constraint intelligence_source_relationships_type_check check (relationship_type in (
    'cites','attributes_to','embeds_summary_of','derived_from','revises','supersedes'
  )),
  constraint intelligence_source_relationships_text_check check (
    attribution_text is null or length(btrim(attribution_text)) > 0
  ),
  constraint intelligence_source_relationships_not_self_check check (
    attributed_source_edition_id is null or attributed_source_edition_id <> containing_source_edition_id
  ),
  constraint intelligence_source_relationships_edition_lineage_check check (
    relationship_type not in ('revises','supersedes') or attributed_source_edition_id is not null
  ),
  constraint intelligence_source_relationships_edition_source_fkey
    foreign key (attributed_source_edition_id, attributed_source_id)
    references public.intelligence_source_editions(id, source_id) on delete restrict,
  constraint intelligence_source_relationships_identity_key unique nulls not distinct (
    containing_source_edition_id, relationship_type, attributed_source_id,
    attributed_source_edition_id
  )
);

create index intelligence_entities_active_name_idx
  on public.intelligence_entities (entity_type, lower(display_name))
  where lifecycle_status in ('provisional','active');
create index intelligence_entity_aliases_lookup_idx
  on public.intelligence_entity_aliases (lower(alias_value), alias_type);
create index intelligence_entity_external_identifiers_current_idx
  on public.intelligence_entity_external_identifiers (lower(namespace), identifier_value)
  where valid_to is null;
create index intelligence_entity_relationships_from_idx
  on public.intelligence_entity_relationships (from_entity_id, relationship_type, valid_to);
create index intelligence_entity_relationships_to_idx
  on public.intelligence_entity_relationships (to_entity_id, relationship_type, valid_to);
create index intelligence_opportunity_subjects_opportunity_idx
  on public.intelligence_opportunity_subjects (opportunity_id, subject_role);
create unique index intelligence_entity_resolution_unordered_pair_idx
  on public.intelligence_entity_resolution_proposals (
    least(subject_entity_id, candidate_entity_id),
    greatest(subject_entity_id, candidate_entity_id)
  );
create unique index intelligence_opportunity_subjects_primary_target_idx
  on public.intelligence_opportunity_subjects (opportunity_id)
  where subject_role = 'primary_target' and relationship_status = 'confirmed';
create index intelligence_source_editions_source_idx
  on public.intelligence_source_editions (source_id, created_at desc);
create index intelligence_source_authority_assessments_edition_idx
  on public.intelligence_source_authority_assessments (source_edition_id, assessment_number desc);
create unique index intelligence_source_edition_artifacts_primary_idx
  on public.intelligence_source_edition_artifacts (source_edition_id)
  where is_primary;
create index intelligence_artifact_acquisitions_artifact_idx
  on public.intelligence_artifact_acquisitions (artifact_id, acquired_at desc);
create index intelligence_source_relationships_containing_idx
  on public.intelligence_source_relationships (containing_source_edition_id, relationship_type);

create function public.validate_intelligence_property_site_type()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.intelligence_entities entity
    where entity.id = new.entity_id and entity.entity_type = 'property_site'
  ) then
    raise exception using errcode = '23514', message = 'intelligence_property_site_type_invalid';
  end if;
  return new;
end;
$$;

create trigger intelligence_property_sites_validate_type
before insert or update on public.intelligence_property_sites
for each row execute function public.validate_intelligence_property_site_type();

create function public.protect_intelligence_entity_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.entity_type is distinct from old.entity_type then
    raise exception using errcode = '55000', message = 'intelligence_entity_identity_immutable';
  end if;
  return new;
end;
$$;

create trigger intelligence_entities_protect_identity
before update on public.intelligence_entities
for each row execute function public.protect_intelligence_entity_identity();

create function public.validate_intelligence_authority_assessment_sequence()
returns trigger language plpgsql set search_path = '' as $$
declare latest_number integer;
begin
  perform 1 from public.intelligence_source_editions where id = new.source_edition_id for update;
  select max(assessment_number) into latest_number
  from public.intelligence_source_authority_assessments
  where source_edition_id = new.source_edition_id;
  if new.assessment_number <> coalesce(latest_number, 0) + 1 then
    raise exception using errcode = '23514', message = 'intelligence_source_authority_sequence_invalid';
  end if;
  return new;
end;
$$;

create trigger intelligence_source_authority_assessments_validate_sequence
before insert on public.intelligence_source_authority_assessments
for each row execute function public.validate_intelligence_authority_assessment_sequence();

create function public.validate_intelligence_resolution_decision_sequence()
returns trigger language plpgsql set search_path = '' as $$
declare latest_number integer; latest_decision text;
begin
  perform 1 from public.intelligence_entity_resolution_proposals where id = new.proposal_id for update;
  select decision_number, decision into latest_number, latest_decision
  from public.intelligence_entity_resolution_decisions
  where proposal_id = new.proposal_id
  order by decision_number desc limit 1;
  if new.decision_number <> coalesce(latest_number, 0) + 1
    or (latest_number is null and new.decision = 'reversed')
    or (latest_number is not null and latest_decision <> 'reversed' and new.decision <> 'reversed')
    or (latest_decision = 'reversed' and new.decision = 'reversed') then
    raise exception using errcode = '23514', message = 'intelligence_resolution_decision_sequence_invalid';
  end if;
  return new;
end;
$$;

create trigger intelligence_resolution_decisions_validate_sequence
before insert on public.intelligence_entity_resolution_decisions
for each row execute function public.validate_intelligence_resolution_decision_sequence();

create function public.validate_intelligence_acquisition_legacy_link()
returns trigger language plpgsql set search_path = '' as $$
declare
  global_artifact public.intelligence_artifacts%rowtype;
  legacy_digest text;
  legacy_size bigint;
  legacy_opportunity_id uuid;
begin
  if new.legacy_opportunity_artifact_id is null then return new; end if;
  select * into global_artifact from public.intelligence_artifacts where id = new.artifact_id;
  select legacy.sha256_digest, legacy.byte_size, ingestion.opportunity_id
    into legacy_digest, legacy_size, legacy_opportunity_id
  from public.opportunity_source_artifacts legacy
  join public.opportunity_ingestions ingestion on ingestion.id = legacy.ingestion_id
  where legacy.id = new.legacy_opportunity_artifact_id;
  if not found or legacy_digest <> global_artifact.sha256_digest or legacy_size <> global_artifact.byte_size then
    raise exception using errcode = '23514', message = 'intelligence_legacy_artifact_identity_mismatch';
  end if;
  if legacy_opportunity_id is distinct from new.opportunity_id then
    raise exception using errcode = '23514', message = 'intelligence_legacy_artifact_opportunity_mismatch';
  end if;
  return new;
end;
$$;

create trigger intelligence_artifact_acquisitions_validate_legacy
before insert or update on public.intelligence_artifact_acquisitions
for each row execute function public.validate_intelligence_acquisition_legacy_link();

create function public.protect_intelligence_append_only_history()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'intelligence_history_append_only';
end;
$$;

create trigger intelligence_source_editions_append_only before update or delete on public.intelligence_source_editions
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_publishers_append_only before update or delete on public.intelligence_publishers
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_sources_append_only before update or delete on public.intelligence_sources
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_source_authority_assessments_append_only before update or delete on public.intelligence_source_authority_assessments
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_artifacts_append_only before update or delete on public.intelligence_artifacts
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_artifact_acquisitions_append_only before update or delete on public.intelligence_artifact_acquisitions
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_source_edition_artifacts_append_only before update or delete on public.intelligence_source_edition_artifacts
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_source_relationships_append_only before update or delete on public.intelligence_source_relationships
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_resolution_proposals_append_only before update or delete on public.intelligence_entity_resolution_proposals
for each row execute function public.protect_intelligence_append_only_history();
create trigger intelligence_resolution_decisions_append_only before update or delete on public.intelligence_entity_resolution_decisions
for each row execute function public.protect_intelligence_append_only_history();

alter table public.intelligence_publishers enable row level security;
alter table public.intelligence_sources enable row level security;
alter table public.intelligence_source_editions enable row level security;
alter table public.intelligence_source_authority_assessments enable row level security;
alter table public.intelligence_entities enable row level security;
alter table public.intelligence_property_sites enable row level security;
alter table public.intelligence_entity_aliases enable row level security;
alter table public.intelligence_entity_external_identifiers enable row level security;
alter table public.intelligence_entity_relationships enable row level security;
alter table public.intelligence_opportunity_subjects enable row level security;
alter table public.intelligence_entity_resolution_proposals enable row level security;
alter table public.intelligence_entity_resolution_decisions enable row level security;
alter table public.intelligence_artifacts enable row level security;
alter table public.intelligence_artifact_acquisitions enable row level security;
alter table public.intelligence_source_edition_artifacts enable row level security;
alter table public.intelligence_source_relationships enable row level security;

revoke all on table
  public.intelligence_publishers, public.intelligence_sources,
  public.intelligence_source_editions, public.intelligence_source_authority_assessments,
  public.intelligence_entities,
  public.intelligence_property_sites, public.intelligence_entity_aliases,
  public.intelligence_entity_external_identifiers, public.intelligence_entity_relationships,
  public.intelligence_opportunity_subjects, public.intelligence_entity_resolution_proposals,
  public.intelligence_entity_resolution_decisions, public.intelligence_artifacts,
  public.intelligence_artifact_acquisitions, public.intelligence_source_edition_artifacts,
  public.intelligence_source_relationships
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.intelligence_publishers, public.intelligence_sources,
  public.intelligence_source_editions, public.intelligence_source_authority_assessments,
  public.intelligence_entities,
  public.intelligence_property_sites, public.intelligence_entity_aliases,
  public.intelligence_entity_external_identifiers, public.intelligence_entity_relationships,
  public.intelligence_opportunity_subjects, public.intelligence_entity_resolution_proposals,
  public.intelligence_entity_resolution_decisions, public.intelligence_artifacts,
  public.intelligence_artifact_acquisitions, public.intelligence_source_edition_artifacts,
  public.intelligence_source_relationships
to service_role;

revoke execute on function public.validate_intelligence_property_site_type(),
  public.protect_intelligence_entity_identity(),
  public.validate_intelligence_authority_assessment_sequence(),
  public.validate_intelligence_resolution_decision_sequence(),
  public.validate_intelligence_acquisition_legacy_link(),
  public.protect_intelligence_append_only_history()
from public, anon, authenticated;
grant execute on function public.validate_intelligence_property_site_type(),
  public.protect_intelligence_entity_identity(),
  public.validate_intelligence_authority_assessment_sequence(),
  public.validate_intelligence_resolution_decision_sequence(),
  public.validate_intelligence_acquisition_legacy_link(),
  public.protect_intelligence_append_only_history()
to service_role;

comment on table public.intelligence_entities is
  'Durable subject identity independent of Opportunity workflow. Phase 4C.1 implements only the property_site typed extension.';
comment on table public.intelligence_source_editions is
  'Immutable publication identity with non-manufactured date precision; authority is independently assessed in append-only history.';
comment on table public.intelligence_artifacts is
  'Global immutable content identity. Storage and workflow acquisition context live separately.';
comment on table public.intelligence_source_relationships is
  'Claim/source lineage vocabulary for direct citations, attributed upstream sources, embedded summaries, derivations, and edition lineage.';
