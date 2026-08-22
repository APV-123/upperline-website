-- Phase 4A.1 Opportunity ingestion persistence foundation. No storage objects,
-- extraction execution, candidate application, browser policies, or RPCs.

create table public.opportunity_ingestions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.acquisition_opportunities(id) on delete restrict,
  entry_type text not null,
  status text not null default 'awaiting_source',
  idempotency_key text,
  requested_by_email text not null,
  failure_code text,
  failure_message text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_ingestions_entry_type_check check (entry_type in ('pdf')),
  constraint opportunity_ingestions_status_check check (status in (
    'awaiting_source','ready','extracting','review_ready','partially_reviewed','applied','failed','cancelled'
  )),
  constraint opportunity_ingestions_idempotency_check check (
    idempotency_key is null or length(btrim(idempotency_key)) between 1 and 200
  ),
  constraint opportunity_ingestions_failure_check check (
    (status = 'failed' and failure_code is not null and failure_message is not null)
    or (status <> 'failed' and failure_code is null and failure_message is null)
  ),
  constraint opportunity_ingestions_revision_check check (revision > 0),
  constraint opportunity_ingestions_id_opportunity_key unique (id, opportunity_id)
);

create unique index opportunity_ingestions_idempotency_idx
  on public.opportunity_ingestions (requested_by_email, idempotency_key)
  where idempotency_key is not null;
create index opportunity_ingestions_opportunity_created_idx
  on public.opportunity_ingestions (opportunity_id, created_at desc) where opportunity_id is not null;

create table public.opportunity_source_artifacts (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null,
  opportunity_source_id uuid,
  artifact_kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text,
  display_filename text,
  declared_mime_type text,
  detected_mime_type text,
  byte_size bigint not null,
  sha256_digest text not null,
  original_url text,
  canonical_url text,
  acquired_at timestamptz not null default now(),
  page_count integer,
  document_metadata jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending',
  validation_message text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_source_artifacts_ingestion_fkey foreign key (ingestion_id)
    references public.opportunity_ingestions(id) on delete restrict,
  constraint opportunity_source_artifacts_source_fkey foreign key (opportunity_source_id)
    references public.opportunity_sources(id) on delete no action,
  constraint opportunity_source_artifacts_kind_check check (artifact_kind in ('pdf')),
  constraint opportunity_source_artifacts_storage_check check (
    length(btrim(storage_bucket)) > 0 and length(btrim(storage_path)) > 0
  ),
  constraint opportunity_source_artifacts_size_check check (byte_size > 0),
  constraint opportunity_source_artifacts_digest_check check (sha256_digest ~ '^[0-9a-f]{64}$'),
  constraint opportunity_source_artifacts_page_count_check check (page_count is null or page_count > 0),
  constraint opportunity_source_artifacts_metadata_check check (jsonb_typeof(document_metadata) = 'object'),
  constraint opportunity_source_artifacts_validation_check check (
    validation_status in ('pending','valid','rejected','quarantined')
  ),
  constraint opportunity_source_artifacts_id_ingestion_key unique (id, ingestion_id),
  constraint opportunity_source_artifacts_digest_identity_key unique (ingestion_id, sha256_digest)
);

create index opportunity_source_artifacts_source_idx
  on public.opportunity_source_artifacts (opportunity_source_id) where opportunity_source_id is not null;

create table public.opportunity_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null,
  artifact_id uuid not null,
  attempt_number integer not null,
  run_idempotency_key text not null,
  status text not null default 'pending',
  extraction_strategy text not null,
  extraction_version text not null,
  provider text,
  model text,
  parser_version text,
  prompt_version text,
  schema_version text not null,
  input_digest text not null,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message text,
  input_token_count bigint,
  output_token_count bigint,
  cost_metadata jsonb not null default '{}'::jsonb,
  latency_ms bigint,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_extraction_runs_artifact_fkey foreign key (artifact_id, ingestion_id)
    references public.opportunity_source_artifacts(id, ingestion_id) on delete restrict,
  constraint opportunity_extraction_runs_attempt_check check (attempt_number > 0),
  constraint opportunity_extraction_runs_idempotency_check check (length(btrim(run_idempotency_key)) between 1 and 200),
  constraint opportunity_extraction_runs_status_check check (status in ('pending','running','succeeded','failed','cancelled')),
  constraint opportunity_extraction_runs_versions_check check (
    length(btrim(extraction_strategy)) > 0 and length(btrim(extraction_version)) > 0
    and length(btrim(schema_version)) > 0
  ),
  constraint opportunity_extraction_runs_digest_check check (input_digest ~ '^[0-9a-f]{64}$'),
  constraint opportunity_extraction_runs_time_check check (completed_at is null or started_at is not null),
  constraint opportunity_extraction_runs_failure_check check (
    (status = 'failed' and failure_code is not null and failure_message is not null)
    or (status <> 'failed' and failure_code is null and failure_message is null)
  ),
  constraint opportunity_extraction_runs_metrics_check check (
    (input_token_count is null or input_token_count >= 0) and
    (output_token_count is null or output_token_count >= 0) and
    (latency_ms is null or latency_ms >= 0) and jsonb_typeof(cost_metadata) = 'object'
  ),
  constraint opportunity_extraction_runs_id_relationship_key unique (id, artifact_id, ingestion_id),
  constraint opportunity_extraction_runs_attempt_key unique (artifact_id, attempt_number),
  constraint opportunity_extraction_runs_idempotency_key unique (artifact_id, run_idempotency_key)
);

create index opportunity_extraction_runs_ingestion_created_idx
  on public.opportunity_extraction_runs (ingestion_id, created_at desc);

create function public.opportunity_candidate_value_valid(value_type text, value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare value_text text;
begin
  if value is null then return false; end if;
  if value_type in ('decimal','integer','date','text','enum') then
    if jsonb_typeof(value) <> 'string' then return false; end if;
    value_text := value #>> '{}';
    if value_type = 'decimal' then return value_text ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'; end if;
    if value_type = 'integer' then return value_text ~ '^-?(0|[1-9][0-9]*)$'; end if;
    if value_type = 'date' then
      if value_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
      begin return to_char(value_text::date, 'YYYY-MM-DD') = value_text; exception when others then return false; end;
    end if;
    return length(btrim(value_text)) > 0;
  end if;
  if value_type = 'boolean' then return jsonb_typeof(value) = 'boolean'; end if;
  if value_type = 'json' then return true; end if;
  return false;
end;
$$;

create table public.opportunity_candidate_facts (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null,
  artifact_id uuid not null,
  extraction_run_id uuid not null,
  destination_domain text not null,
  field_path text not null,
  candidate_tenant_key uuid,
  assertion_basis text not null,
  economic_role text not null,
  raw_value jsonb,
  normalized_value_type text,
  normalized_value jsonb,
  unit text,
  confidence numeric(5,4),
  validation_state text not null,
  validation_issues jsonb not null default '[]'::jsonb,
  group_key text,
  ordinal integer not null,
  candidate_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint opportunity_candidate_facts_run_fkey foreign key (extraction_run_id, artifact_id, ingestion_id)
    references public.opportunity_extraction_runs(id, artifact_id, ingestion_id) on delete restrict,
  constraint opportunity_candidate_facts_destination_check check (
    (destination_domain in ('opportunity','underwriting') and candidate_tenant_key is null)
    or (destination_domain = 'tenant' and candidate_tenant_key is not null
      and candidate_tenant_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ),
  constraint opportunity_candidate_facts_field_path_check check (
    field_path ~ '^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$'
  ),
  constraint opportunity_candidate_facts_assertion_check check (
    assertion_basis in ('source_stated','deterministically_derived','system_proposed')
  ),
  constraint opportunity_candidate_facts_role_check check (
    economic_role in ('descriptive_fact','contractual_fact','source_assumption','upperline_assumption')
  ),
  constraint opportunity_candidate_facts_value_check check (
    (normalized_value_type is null and normalized_value is null)
    or (normalized_value_type in ('decimal','integer','date','text','boolean','enum','json')
      and public.opportunity_candidate_value_valid(normalized_value_type, normalized_value))
  ),
  constraint opportunity_candidate_facts_unit_check check (
    (normalized_value is not null or unit is null) and
    (unit is null or unit in ('USD','USD_PER_SF','USD_PER_SF_YEAR','SF','PERCENT_DECIMAL','MONTHS','DAYS','COUNT','NONE'))
  ),
  constraint opportunity_candidate_facts_confidence_check check (confidence is null or confidence between 0 and 1),
  constraint opportunity_candidate_facts_validation_check check (
    validation_state in ('valid','invalid','warning') and jsonb_typeof(validation_issues) = 'array'
  ),
  constraint opportunity_candidate_facts_ordinal_check check (ordinal >= 0),
  constraint opportunity_candidate_facts_fingerprint_check check (candidate_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint opportunity_candidate_facts_id_relationship_key unique (id, extraction_run_id, artifact_id, ingestion_id),
  constraint opportunity_candidate_facts_run_fingerprint_key unique (extraction_run_id, candidate_fingerprint)
);

create index opportunity_candidate_facts_destination_idx
  on public.opportunity_candidate_facts (ingestion_id, destination_domain, field_path);

create table public.opportunity_candidate_fact_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_fact_id uuid not null,
  extraction_run_id uuid not null,
  artifact_id uuid not null,
  ingestion_id uuid not null,
  page_number integer,
  snippet text,
  bounding_box jsonb,
  section_label text,
  extraction_method text not null,
  extraction_version text,
  ordinal integer not null default 0,
  created_at timestamptz not null default now(),
  constraint opportunity_candidate_fact_evidence_candidate_fkey
    foreign key (candidate_fact_id, extraction_run_id, artifact_id, ingestion_id)
    references public.opportunity_candidate_facts(id, extraction_run_id, artifact_id, ingestion_id) on delete restrict,
  constraint opportunity_candidate_fact_evidence_page_check check (page_number is null or page_number > 0),
  constraint opportunity_candidate_fact_evidence_content_check check (
    snippet is not null or page_number is not null or section_label is not null
  ),
  constraint opportunity_candidate_fact_evidence_bbox_check check (
    bounding_box is null or jsonb_typeof(bounding_box) = 'object'
  ),
  constraint opportunity_candidate_fact_evidence_method_check check (length(btrim(extraction_method)) > 0),
  constraint opportunity_candidate_fact_evidence_ordinal_check check (ordinal >= 0)
);

create index opportunity_candidate_fact_evidence_candidate_idx
  on public.opportunity_candidate_fact_evidence (candidate_fact_id, ordinal);

create table public.opportunity_candidate_fact_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_fact_id uuid not null references public.opportunity_candidate_facts(id) on delete restrict,
  decision_number integer not null,
  decision text not null,
  reviewer_email text not null,
  decided_at timestamptz not null default now(),
  accepted_value_type text,
  accepted_value jsonb,
  accepted_unit text,
  selected_destination_domain text not null,
  selected_field_path text not null,
  selected_candidate_tenant_key uuid,
  conflict_disposition text not null,
  application_reference jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint opportunity_candidate_fact_decisions_decision_check check (
    decision in ('accepted','rejected','edited_and_accepted')
  ),
  constraint opportunity_candidate_fact_decisions_number_check check (decision_number > 0),
  constraint opportunity_candidate_fact_decisions_value_check check (
    (decision = 'rejected' and accepted_value_type is null and accepted_value is null and accepted_unit is null)
    or (decision in ('accepted','edited_and_accepted') and accepted_value_type is not null
      and public.opportunity_candidate_value_valid(accepted_value_type, accepted_value))
  ),
  constraint opportunity_candidate_fact_decisions_unit_check check (
    accepted_unit is null or accepted_unit in ('USD','USD_PER_SF','USD_PER_SF_YEAR','SF','PERCENT_DECIMAL','MONTHS','DAYS','COUNT','NONE')
  ),
  constraint opportunity_candidate_fact_decisions_destination_check check (
    (selected_destination_domain in ('opportunity','underwriting') and selected_candidate_tenant_key is null)
    or (selected_destination_domain = 'tenant' and selected_candidate_tenant_key is not null
      and selected_candidate_tenant_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ),
  constraint opportunity_candidate_fact_decisions_field_path_check check (
    selected_field_path ~ '^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$'
  ),
  constraint opportunity_candidate_fact_decisions_conflict_check check (
    conflict_disposition in ('no_conflict','kept_existing','replaced_existing','deferred')
  ),
  constraint opportunity_candidate_fact_decisions_metadata_check check (
    (application_reference is null or jsonb_typeof(application_reference) = 'object')
    and jsonb_typeof(metadata) = 'object'
  ),
  constraint opportunity_candidate_fact_decisions_candidate_number_key unique (candidate_fact_id, decision_number)
);

create index opportunity_candidate_fact_decisions_candidate_idx
  on public.opportunity_candidate_fact_decisions (candidate_fact_id, decision_number desc);

create function public.protect_opportunity_ingestion_history()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'opportunity_ingestions' then
    if old.opportunity_id is not null and new.opportunity_id is distinct from old.opportunity_id then
      raise exception 'ingestion_opportunity_attachment_immutable';
    end if;
  elsif tg_table_name = 'opportunity_source_artifacts' then
    if tg_op = 'DELETE' then raise exception 'ingestion_artifact_immutable'; end if;
    if new.ingestion_id is distinct from old.ingestion_id or new.artifact_kind is distinct from old.artifact_kind
      or new.storage_bucket is distinct from old.storage_bucket or new.storage_path is distinct from old.storage_path
      or new.byte_size is distinct from old.byte_size or new.sha256_digest is distinct from old.sha256_digest
      or new.acquired_at is distinct from old.acquired_at then raise exception 'ingestion_artifact_identity_immutable'; end if;
    if old.opportunity_source_id is not null and new.opportunity_source_id is distinct from old.opportunity_source_id then
      raise exception 'artifact_opportunity_source_attachment_immutable';
    end if;
  elsif tg_table_name = 'opportunity_extraction_runs' then
    if tg_op = 'DELETE' then raise exception 'extraction_run_history_immutable'; end if;
    if new.ingestion_id is distinct from old.ingestion_id or new.artifact_id is distinct from old.artifact_id
      or new.attempt_number is distinct from old.attempt_number or new.run_idempotency_key is distinct from old.run_idempotency_key
      or new.extraction_strategy is distinct from old.extraction_strategy
      or new.extraction_version is distinct from old.extraction_version or new.provider is distinct from old.provider
      or new.model is distinct from old.model or new.parser_version is distinct from old.parser_version
      or new.prompt_version is distinct from old.prompt_version or new.schema_version is distinct from old.schema_version
      or new.input_digest is distinct from old.input_digest then raise exception 'extraction_run_identity_immutable'; end if;
    if old.status in ('succeeded','failed','cancelled') then raise exception 'completed_extraction_run_immutable'; end if;
  else
    raise exception 'ingestion_append_only_record';
  end if;
  return new;
end;
$$;

create function public.ensure_extraction_output_is_open()
returns trigger language plpgsql set search_path = '' as $$
declare run_status text;
begin
  select status into run_status from public.opportunity_extraction_runs where id = new.extraction_run_id;
  if run_status not in ('pending','running') then raise exception 'terminal_extraction_output_immutable'; end if;
  return new;
end;
$$;

create function public.validate_opportunity_artifact_source_relationship()
returns trigger language plpgsql set search_path = '' as $$
declare ingestion_opportunity uuid; source_opportunity uuid;
begin
  if new.opportunity_source_id is null then return new; end if;
  select opportunity_id into ingestion_opportunity from public.opportunity_ingestions where id = new.ingestion_id;
  select opportunity_id into source_opportunity from public.opportunity_sources where id = new.opportunity_source_id;
  if ingestion_opportunity is null or source_opportunity is distinct from ingestion_opportunity then
    raise exception 'artifact_opportunity_source_relationship_invalid';
  end if;
  return new;
end;
$$;

create trigger opportunity_source_artifacts_protect before update or delete on public.opportunity_source_artifacts
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_extraction_runs_protect before update or delete on public.opportunity_extraction_runs
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_candidate_facts_append_only before update or delete on public.opportunity_candidate_facts
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_candidate_fact_evidence_append_only before update or delete on public.opportunity_candidate_fact_evidence
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_candidate_fact_decisions_append_only before update or delete on public.opportunity_candidate_fact_decisions
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_ingestions_protect before update on public.opportunity_ingestions
  for each row execute function public.protect_opportunity_ingestion_history();
create trigger opportunity_candidate_facts_require_open_run before insert on public.opportunity_candidate_facts
  for each row execute function public.ensure_extraction_output_is_open();
create trigger opportunity_candidate_fact_evidence_require_open_run before insert on public.opportunity_candidate_fact_evidence
  for each row execute function public.ensure_extraction_output_is_open();
create trigger opportunity_source_artifacts_validate_source before insert or update on public.opportunity_source_artifacts
  for each row execute function public.validate_opportunity_artifact_source_relationship();
create trigger opportunity_ingestions_set_updated_at before update on public.opportunity_ingestions
  for each row execute function public.set_acquisition_updated_at();
create trigger opportunity_source_artifacts_set_updated_at before update on public.opportunity_source_artifacts
  for each row execute function public.set_acquisition_updated_at();
create trigger opportunity_extraction_runs_set_updated_at before update on public.opportunity_extraction_runs
  for each row execute function public.set_acquisition_updated_at();

alter table public.opportunity_ingestions enable row level security;
alter table public.opportunity_source_artifacts enable row level security;
alter table public.opportunity_extraction_runs enable row level security;
alter table public.opportunity_candidate_facts enable row level security;
alter table public.opportunity_candidate_fact_evidence enable row level security;
alter table public.opportunity_candidate_fact_decisions enable row level security;

revoke all on table public.opportunity_ingestions, public.opportunity_source_artifacts,
  public.opportunity_extraction_runs, public.opportunity_candidate_facts,
  public.opportunity_candidate_fact_evidence, public.opportunity_candidate_fact_decisions
  from public, anon, authenticated;
grant all on table public.opportunity_ingestions, public.opportunity_source_artifacts,
  public.opportunity_extraction_runs, public.opportunity_candidate_facts,
  public.opportunity_candidate_fact_evidence, public.opportunity_candidate_fact_decisions
  to service_role;
revoke execute on function public.opportunity_candidate_value_valid(text,jsonb),
  public.protect_opportunity_ingestion_history(), public.ensure_extraction_output_is_open(),
  public.validate_opportunity_artifact_source_relationship() from public, anon, authenticated;
grant execute on function public.opportunity_candidate_value_valid(text,jsonb),
  public.protect_opportunity_ingestion_history(), public.ensure_extraction_output_is_open(),
  public.validate_opportunity_artifact_source_relationship() to service_role;

comment on table public.opportunity_candidate_facts is
  'Untrusted extraction output. Persistence does not make a candidate authoritative Opportunity or underwriting provenance.';
comment on table public.opportunity_candidate_fact_decisions is
  'Append-only human review history. Authoritative application is intentionally outside Phase 4A.1.';
comment on column public.opportunity_candidate_facts.candidate_tenant_key is
  'Ingestion-scoped UUID identity for a candidate tenant; field_path remains tenant-relative and never uses array indexes.';
