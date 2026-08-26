-- Phase 4C.2.3: immutable property-intelligence observations and derivations.
-- Private by default. All authoritative writes are server-side.

create table public.intelligence_tenancies (
  id uuid primary key default gen_random_uuid(),
  property_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  identity_status text not null check (identity_status in ('provisional','resolved')),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now()
);

create table public.intelligence_reported_spaces (
  id uuid primary key default gen_random_uuid(),
  property_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  label text check (label is null or (char_length(label) between 1 and 256 and label !~ '[[:cntrl:]]')),
  identity_status text not null check (identity_status in ('provisional','resolved')),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now()
);

create table public.intelligence_tenancy_participants (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.intelligence_tenancies(id) on delete restrict,
  participant_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  participant_role text not null check (participant_role in ('tenant_organization','brand','landlord_organization')),
  created_at timestamptz not null default now(),
  unique (tenancy_id, participant_entity_id, participant_role)
);

create table public.intelligence_leases (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid references public.intelligence_tenancies(id) on delete restrict,
  identity_status text not null check (identity_status in ('provisional','resolved')),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now()
);

create table public.intelligence_lease_parties (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.intelligence_leases(id) on delete restrict,
  party_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  party_role text not null check (party_role in ('tenant','landlord','guarantor','assignor','assignee')),
  created_at timestamptz not null default now(),
  unique (lease_id, party_entity_id, party_role)
);

create table public.intelligence_lease_premises (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.intelligence_leases(id) on delete restrict,
  premises_entity_id uuid references public.intelligence_entities(id) on delete restrict,
  reported_space_id uuid references public.intelligence_reported_spaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint intelligence_lease_premises_target_check check (num_nonnulls(premises_entity_id, reported_space_id) = 1),
  unique nulls not distinct (lease_id, premises_entity_id, reported_space_id)
);

create table public.intelligence_lease_instruments (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.intelligence_leases(id) on delete restrict,
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  instrument_type text not null check (instrument_type in ('original_lease','amendment','assignment','renewal_extension','termination','memorandum','source_summary')),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now(),
  unique (lease_id, source_edition_id, instrument_type)
);

create table public.intelligence_lease_instrument_relationships (
  id uuid primary key default gen_random_uuid(),
  from_instrument_id uuid not null references public.intelligence_lease_instruments(id) on delete restrict,
  relationship_type text not null check (relationship_type in ('governs','amends','assigns','extends','terminates','summarizes')),
  to_instrument_id uuid not null references public.intelligence_lease_instruments(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (from_instrument_id <> to_instrument_id),
  unique (from_instrument_id, relationship_type, to_instrument_id)
);

create table public.intelligence_observations (
  id uuid primary key default gen_random_uuid(),
  observation_family text not null check (observation_family in ('rent','lease_term','area')),
  origin text not null check (origin in ('source_stated','contractual_document_stated','deterministic_derived','model_inferred','human_entered')),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now()
);

create table public.intelligence_observation_subjects (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  subject_role text not null check (subject_role in ('property','building','premises','reported_space','tenant_organization','brand','tenancy','lease','lease_instrument','landlord_organization')),
  entity_id uuid references public.intelligence_entities(id) on delete restrict,
  tenancy_id uuid references public.intelligence_tenancies(id) on delete restrict,
  lease_id uuid references public.intelligence_leases(id) on delete restrict,
  lease_instrument_id uuid references public.intelligence_lease_instruments(id) on delete restrict,
  reported_space_id uuid references public.intelligence_reported_spaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint intelligence_observation_subject_target_check check (num_nonnulls(entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id)=1),
  constraint intelligence_observation_subject_role_target_check check (
    (subject_role in ('property','building','premises','tenant_organization','brand','landlord_organization') and entity_id is not null) or
    (subject_role='tenancy' and tenancy_id is not null) or
    (subject_role='lease' and lease_id is not null) or
    (subject_role='lease_instrument' and lease_instrument_id is not null) or
    (subject_role='reported_space' and reported_space_id is not null)
  ),
  unique nulls not distinct (observation_id, subject_role, entity_id, tenancy_id, lease_id, lease_instrument_id, reported_space_id)
);

create table public.intelligence_observation_temporal_assertions (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  temporal_role text not null check (temporal_role in ('as_of','effective_start','effective_end','reporting_period_start','reporting_period_end','measurement','lease_commencement','rent_commencement','lease_expiration','vintage')),
  boundary text not null check (boundary in ('point','closed','open')),
  precision text not null check (precision in ('unknown','year','month','day')),
  year_value integer,
  month_value integer,
  day_value integer,
  created_at timestamptz not null default now(),
  unique (observation_id, temporal_role),
  constraint intelligence_temporal_boundary_role_check check (
    (temporal_role in ('as_of','measurement','lease_commencement','rent_commencement','lease_expiration','vintage') and boundary='point') or
    (temporal_role in ('effective_start','effective_end','reporting_period_start','reporting_period_end') and boundary in ('closed','open'))
  ),
  constraint intelligence_temporal_value_shape_check check (
    (boundary='open' and precision='unknown' and year_value is null and month_value is null and day_value is null) or
    (boundary<>'open' and (
      (precision='unknown' and year_value is null and month_value is null and day_value is null) or
      (precision='year' and year_value between 1 and 9999 and month_value is null and day_value is null) or
      (precision='month' and year_value between 1 and 9999 and month_value between 1 and 12 and day_value is null) or
      (precision='day' and year_value between 1 and 9999 and month_value between 1 and 12 and day_value between 1 and 31)
    ))
  )
);

create table public.intelligence_observation_source_assertions (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  assertion_role text not null check (assertion_role in ('containing','attributed_upstream','human_attestation')),
  source_relationship_id uuid references public.intelligence_source_relationships(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((assertion_role='attributed_upstream') = (source_relationship_id is not null)),
  unique nulls not distinct (observation_id, source_edition_id, assertion_role, source_relationship_id)
);

create table public.intelligence_evidence_locations (
  id uuid primary key default gen_random_uuid(),
  source_edition_id uuid not null references public.intelligence_source_editions(id) on delete restrict,
  artifact_id uuid references public.intelligence_artifacts(id) on delete restrict,
  locator_type text not null check (locator_type in ('pdf','spreadsheet','delimited','document','structured_record','human_attestation')),
  section_label text check (section_label is null or (char_length(section_label) between 1 and 256 and section_label !~ '[[:cntrl:]]')),
  created_at timestamptz not null default now()
);

create table public.intelligence_pdf_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  page_number integer not null check (page_number between 1 and 100000),
  x numeric(18,8), y numeric(18,8), width numeric(18,8), height numeric(18,8),
  text_anchor text check (text_anchor is null or (char_length(text_anchor) between 1 and 512 and text_anchor !~ '[[:cntrl:]]')),
  check (num_nonnulls(x,y,width,height) in (0,4)),
  check (width is null or (x>=0 and y>=0 and width>0 and height>0))
);

create table public.intelligence_spreadsheet_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  sheet_name text not null check (char_length(sheet_name) between 1 and 128 and sheet_name !~ '[[:cntrl:]]'),
  cell_reference text check (cell_reference is null or char_length(cell_reference) between 1 and 64),
  range_reference text check (range_reference is null or char_length(range_reference) between 1 and 128),
  row_number integer check (row_number is null or row_number > 0),
  check (num_nonnulls(cell_reference,range_reference,row_number)=1),
  check (cell_reference is null or cell_reference ~ '^[A-Z]+[1-9][0-9]*$'),
  check (range_reference is null or range_reference ~ '^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$')
);

create table public.intelligence_delimited_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  row_number integer not null check (row_number > 0),
  column_name text check (column_name is null or (char_length(column_name) between 1 and 128 and column_name !~ '[[:cntrl:]]'))
);

create table public.intelligence_document_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  section_reference text,
  clause_reference text,
  paragraph_number integer check (paragraph_number is null or paragraph_number > 0),
  check (num_nonnulls(section_reference,clause_reference,paragraph_number)>=1),
  check (section_reference is null or (char_length(section_reference) between 1 and 256 and section_reference !~ '[[:cntrl:]]')),
  check (clause_reference is null or (char_length(clause_reference) between 1 and 256 and clause_reference !~ '[[:cntrl:]]'))
);

create table public.intelligence_structured_record_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  record_identifier text not null check (char_length(record_identifier) between 1 and 256 and record_identifier !~ '[[:cntrl:]]'),
  field_path text check (field_path is null or (char_length(field_path) between 1 and 512 and field_path !~ '[[:cntrl:]]'))
);

create table public.intelligence_human_attestation_evidence_locators (
  evidence_location_id uuid primary key references public.intelligence_evidence_locations(id) on delete restrict,
  note_reference text not null check (char_length(note_reference) between 1 and 256 and note_reference !~ '[[:cntrl:]]')
);

create table public.intelligence_observation_evidence (
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  evidence_location_id uuid not null references public.intelligence_evidence_locations(id) on delete restrict,
  evidence_role text not null check (evidence_role in ('supports','contradicts')),
  evidence_aspect text not null check (evidence_aspect in ('whole','value','classification','temporal','subject')),
  created_at timestamptz not null default now(),
  primary key (observation_id,evidence_location_id,evidence_role,evidence_aspect)
);

create table public.intelligence_observation_admission_decisions (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  decision_number integer not null check (decision_number > 0),
  action text not null check (action in ('admitted','rejected','reversed')),
  command_id uuid not null,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  reviewer_email text not null check (char_length(reviewer_email) between 3 and 320),
  rationale text check (rationale is null or (char_length(rationale) between 1 and 2000 and rationale !~ '[[:cntrl:]]')),
  decided_at timestamptz not null default now(),
  unique (observation_id,decision_number), unique (command_id)
);

create table public.intelligence_observation_relationships (
  id uuid primary key default gen_random_uuid(),
  from_observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  relationship_type text not null check (relationship_type in ('contradicts','restates')),
  to_observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now(),
  check (from_observation_id<>to_observation_id),
  unique (from_observation_id,relationship_type,to_observation_id)
);

create table public.intelligence_observation_independence_assessments (
  id uuid primary key default gen_random_uuid(),
  observation_a_id uuid not null references public.intelligence_observations(id) on delete restrict,
  observation_b_id uuid not null references public.intelligence_observations(id) on delete restrict,
  assessment_number integer not null check (assessment_number>0),
  classification text not null check (classification in ('independent','derivative','same_logical_source','same_artifact','unknown')),
  assessed_by_email text not null check (char_length(assessed_by_email) between 3 and 320),
  assessed_at timestamptz not null default now(),
  check (observation_a_id < observation_b_id),
  unique (observation_a_id,observation_b_id,assessment_number)
);

create table public.intelligence_derivation_methods (
  method_key text not null check (char_length(method_key) between 1 and 128 and method_key ~ '^[a-z][a-z0-9_]*$'),
  method_version integer not null check (method_version>0),
  canonical_manifest jsonb not null,
  contract_sha256 text not null check (contract_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (method_key,method_version)
);

create table public.intelligence_observation_derivations (
  id uuid primary key default gen_random_uuid(),
  output_observation_id uuid not null unique references public.intelligence_observations(id) on delete restrict,
  method_key text not null,
  method_version integer not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  created_by_email text not null check (char_length(created_by_email) between 3 and 320),
  created_at timestamptz not null default now(),
  foreign key (method_key,method_version) references public.intelligence_derivation_methods(method_key,method_version) on delete restrict,
  unique (method_key,method_version,request_fingerprint)
);

create table public.intelligence_observation_derivation_inputs (
  derivation_id uuid not null references public.intelligence_observation_derivations(id) on delete restrict,
  input_ordinal integer not null check (input_ordinal>0),
  input_role text not null check (char_length(input_role) between 1 and 64 and input_role ~ '^[a-z][a-z0-9_]*$'),
  input_observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  primary key (derivation_id,input_ordinal),
  unique (derivation_id,input_role)
);

create table public.intelligence_rent_observations (
  observation_id uuid primary key references public.intelligence_observations(id) on delete restrict,
  amount numeric(30,12) not null check (amount>=0 and amount<=100000000000000000),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  meaning text not null check (meaning in ('asking','contractual','market_opinion')),
  commitment text not null check (commitment in ('marketed_uncommitted','executed','reported_contractual','option','not_applicable')),
  component text not null check (component in ('base','additional','percentage','total')),
  amount_basis text not null check (amount_basis in ('monetary_absolute','monetary_per_area','percentage')),
  time_basis text not null check (time_basis in ('monthly','annual','term','one_time','not_applicable')),
  area_basis text not null check (area_basis in ('square_feet','acres','not_applicable')),
  lease_structure text not null check (lease_structure in ('nnn','gross','modified_gross','ground_lease','percentage_lease','not_stated','unknown')),
  lifecycle text not null check (lifecycle in ('historical','current','future_scheduled','prospective')),
  constraint intelligence_rent_measure_shape_check check (
    (amount_basis='percentage' and currency_code is null and component='percentage' and time_basis='not_applicable' and area_basis='not_applicable') or
    (amount_basis='monetary_per_area' and currency_code is not null and area_basis<>'not_applicable' and time_basis<>'not_applicable') or
    (amount_basis='monetary_absolute' and currency_code is not null and area_basis='not_applicable' and time_basis<>'not_applicable')
  ),
  constraint intelligence_rent_classification_check check (
    (meaning<>'asking' or commitment='marketed_uncommitted') and
    (meaning<>'contractual' or commitment in ('executed','reported_contractual','option')) and
    (meaning<>'market_opinion' or commitment='not_applicable') and
    (commitment<>'option' or lifecycle='prospective') and
    (lifecycle<>'future_scheduled' or commitment in ('executed','reported_contractual'))
  )
);

create table public.intelligence_lease_term_observations (
  observation_id uuid primary key references public.intelligence_observations(id) on delete restrict,
  term_type text not null check (term_type in ('lease_commencement','rent_commencement','lease_expiration')),
  value_precision text not null check (value_precision in ('unknown','year','month','day')),
  year_value integer, month_value integer, day_value integer,
  check (
    (value_precision='unknown' and year_value is null and month_value is null and day_value is null) or
    (value_precision='year' and year_value between 1 and 9999 and month_value is null and day_value is null) or
    (value_precision='month' and year_value between 1 and 9999 and month_value between 1 and 12 and day_value is null) or
    (value_precision='day' and year_value between 1 and 9999 and month_value between 1 and 12 and day_value between 1 and 31)
  )
);

create table public.intelligence_area_observations (
  observation_id uuid primary key references public.intelligence_observations(id) on delete restrict,
  amount numeric(30,12) not null check (amount>0 and amount<=100000000000000000),
  unit text not null check (unit in ('square_feet','acres')),
  area_meaning text not null check (area_meaning in ('site_area','building_area','premises_area','reported_space_area'))
);

insert into public.intelligence_derivation_methods(method_key,method_version,canonical_manifest,contract_sha256) values
('annualized_rent_per_square_foot',1,
 '{"annualization_factor":12,"arithmetic_type":"exact_numeric","both_effective_boundary_roles_required":true,"closed_boundary_inclusive":true,"closed_boundary_required_precision":"day","denominator_identity":"rent_supplied_exact_premises_or_reported_space","denominator_unit":"square_feet","effective_temporal_compatibility":"complete_affirmative_interval_containment","eligible_boundary_pairs":["closed_day:closed_day","closed_day:open","open:closed_day"],"formula":"monthly_absolute_rent*12/square_feet","lone_known_boundary_proves_exact_instant":false,"omitted_as_open":false,"omitted_boundary_eligible":false,"open_open_eligible":false,"origin":"deterministic_derived","output_scale":8,"partial_date_expansion":"forbidden","premises_containment":"identity_level_unique_confirmed_property_contains_premises_dates_ignored","reporting_period_substitution":"forbidden","rounding_mode":"half_away_from_zero","rounding_stage":"final_output_only","subject_projection":"exact_rent_subject_set","unknown_as_open":false,"version":1}'::jsonb,
 '4135a2f3be9e9ef1a71ab4890871f3b0acfd1063aa0028b412fc0646f5ffa3dc'),
('acres_to_square_feet',1,
 '{"arithmetic_type":"exact_numeric","formula":"acres*43560","input_unit":"acres","origin":"deterministic_derived","output_unit":"square_feet","premises_containment":"identity_level_unique_confirmed_property_contains_premises_dates_ignored","rounding_stage":"none","subject_projection":"exact_area_subject_set","temporal_projection":"exact_area_temporal_set","version":1}'::jsonb,
 '4d76c6d8354c1c2cf4a42d33c36d8162fce0dd6b851235ccd3c2aa38673388fe');

create or replace function public.intelligence_history_append_only_v2()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception using errcode='55000', message='intelligence_history_append_only'; end $$;

create or replace function public.intelligence_validate_calendar_date_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.precision='day' then
    begin perform make_date(new.year_value,new.month_value,new.day_value);
    exception when datetime_field_overflow then
      raise exception using errcode='23514', message='intelligence_temporal_date_invalid';
    end;
  end if;
  return new;
end $$;

create trigger intelligence_temporal_calendar_validate
before insert on public.intelligence_observation_temporal_assertions
for each row execute function public.intelligence_validate_calendar_date_v1();

create or replace function public.intelligence_validate_lease_term_date_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.value_precision='day' then
    begin perform make_date(new.year_value,new.month_value,new.day_value);
    exception when datetime_field_overflow then raise exception using errcode='23514',message='intelligence_lease_term_date_invalid'; end;
  end if;
  return new;
end $$;
create trigger intelligence_lease_term_calendar_validate before insert on public.intelligence_lease_term_observations
for each row execute function public.intelligence_validate_lease_term_date_v1();

create or replace function public.intelligence_validate_observation_v1(p_observation_id uuid)
returns void language plpgsql set search_path = '' as $$
declare
  family text; origin_value text; payload_count integer; property_count integer;
  premises_count integer; reported_count integer; building_count integer; lease_count integer; area_kind text;
  start_boundary text; end_boundary text; start_precision text; end_precision text;
  start_date date; end_date date; start_earliest date; end_latest date;
  report_start_boundary text; report_end_boundary text; report_start_precision text; report_end_precision text;
  report_start_date date; report_end_date date; report_start_earliest date; report_end_latest date;
  property_id uuid; premises_id uuid; reported_property_id uuid; containment_count integer;
begin
  select observation_family,origin into family,origin_value
  from public.intelligence_observations where id=p_observation_id;
  if family is null then return; end if;

  select ((exists(select 1 from public.intelligence_rent_observations where observation_id=p_observation_id))::int +
          (exists(select 1 from public.intelligence_lease_term_observations where observation_id=p_observation_id))::int +
          (exists(select 1 from public.intelligence_area_observations where observation_id=p_observation_id))::int)
    into payload_count;
  if payload_count<>1 or
     (family='rent' and not exists(select 1 from public.intelligence_rent_observations where observation_id=p_observation_id)) or
     (family='lease_term' and not exists(select 1 from public.intelligence_lease_term_observations where observation_id=p_observation_id)) or
     (family='area' and not exists(select 1 from public.intelligence_area_observations where observation_id=p_observation_id)) then
    raise exception using errcode='23514',message='intelligence_observation_payload_invalid';
  end if;

  if exists(select 1 from public.intelligence_observation_subjects where observation_id=p_observation_id group by subject_role having count(*)>1) then
    raise exception using errcode='23514',message='intelligence_observation_subject_cardinality_invalid';
  end if;
  select count(*) filter(where subject_role='property'),count(*) filter(where subject_role='premises'),count(*) filter(where subject_role='reported_space'),
         count(*) filter(where subject_role='building'),count(*) filter(where subject_role='lease')
    into property_count,premises_count,reported_count,building_count,lease_count from public.intelligence_observation_subjects where observation_id=p_observation_id;
  if family='rent' and (property_count<>1 or premises_count+reported_count>1) then
    raise exception using errcode='23514',message='intelligence_observation_subject_cardinality_invalid';
  end if;
  if family='area' then
    select area_meaning into area_kind from public.intelligence_area_observations where observation_id=p_observation_id;
    if property_count<>1 or
       (area_kind='site_area' and building_count+premises_count+reported_count<>0) or
       (area_kind='building_area' and (building_count<>1 or premises_count+reported_count<>0)) or
       (area_kind='premises_area' and (premises_count<>1 or building_count+reported_count<>0)) or
       (area_kind='reported_space_area' and (reported_count<>1 or building_count+premises_count<>0)) or
       exists(select 1 from public.intelligence_observation_subjects where observation_id=p_observation_id and subject_role not in ('property','building','premises','reported_space','tenancy','lease')) then
      raise exception using errcode='23514',message='intelligence_observation_subject_cardinality_invalid';
    end if;
  end if;
  if family='lease_term' and (property_count<>1 or lease_count<>1) then
    raise exception using errcode='23514',message='intelligence_observation_subject_cardinality_invalid';
  end if;

  select entity_id into property_id from public.intelligence_observation_subjects where observation_id=p_observation_id and subject_role='property';
  select entity_id into premises_id from public.intelligence_observation_subjects where observation_id=p_observation_id and subject_role='premises';
  if premises_id is not null then
    select count(*) into containment_count
    from public.intelligence_entity_relationships r
    join public.intelligence_entities p on p.id=r.from_entity_id and p.entity_type='property_site' and p.lifecycle_status<>'superseded'
    join public.intelligence_entities s on s.id=r.to_entity_id and s.entity_type='premises' and s.lifecycle_status<>'superseded'
    where r.relationship_type='contains' and r.relationship_status='confirmed' and r.to_entity_id=premises_id;
    if containment_count<>1 or not exists(
      select 1 from public.intelligence_entity_relationships r
      where r.relationship_type='contains' and r.relationship_status='confirmed'
        and r.from_entity_id=property_id and r.to_entity_id=premises_id
    ) then raise exception using errcode='23514',message='intelligence_premises_property_resolution_invalid'; end if;
  end if;
  if reported_count=1 then
    select rs.property_entity_id into reported_property_id
    from public.intelligence_observation_subjects s join public.intelligence_reported_spaces rs on rs.id=s.reported_space_id
    where s.observation_id=p_observation_id and s.subject_role='reported_space';
    if reported_property_id is distinct from property_id then
      raise exception using errcode='23514',message='intelligence_reported_space_property_mismatch';
    end if;
  end if;
  if exists(
    select 1 from public.intelligence_observation_subjects s join public.intelligence_tenancies t on t.id=s.tenancy_id
    where s.observation_id=p_observation_id and s.subject_role='tenancy' and t.property_entity_id<>property_id
  ) or exists(
    select 1 from public.intelligence_observation_subjects s join public.intelligence_leases l on l.id=s.lease_id
    join public.intelligence_tenancies t on t.id=l.tenancy_id
    where s.observation_id=p_observation_id and s.subject_role='lease' and t.property_entity_id<>property_id
  ) then raise exception using errcode='23514',message='intelligence_observation_property_context_conflict'; end if;

  select boundary,precision,case when precision='day' then make_date(year_value,month_value,day_value) end
    into start_boundary,start_precision,start_date from public.intelligence_observation_temporal_assertions
    where observation_id=p_observation_id and temporal_role='effective_start';
  select boundary,precision,case when precision='day' then make_date(year_value,month_value,day_value) end
    into end_boundary,end_precision,end_date from public.intelligence_observation_temporal_assertions
    where observation_id=p_observation_id and temporal_role='effective_end';
  if (start_boundary='open' and end_boundary is null) or (end_boundary='open' and start_boundary is null) or
     (start_boundary='open' and end_boundary='open') then
    raise exception using errcode='23514',message='intelligence_effective_interval_shape_invalid';
  end if;
  if start_boundary='closed' then
    start_earliest:=case start_precision when 'year' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_start'),1,1) when 'month' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_start'),(select month_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_start'),1) when 'day' then start_date end;
  end if;
  if end_boundary='closed' then
    end_latest:=case end_precision when 'year' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_end'),12,31) when 'month' then (make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_end'),(select month_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='effective_end'),1)+interval '1 month - 1 day')::date when 'day' then end_date end;
  end if;
  if start_earliest is not null and end_latest is not null and start_earliest>end_latest then
    raise exception using errcode='23514',message='intelligence_effective_interval_order_invalid';
  end if;
  select boundary,precision,case when precision='day' then make_date(year_value,month_value,day_value) end
    into report_start_boundary,report_start_precision,report_start_date from public.intelligence_observation_temporal_assertions
    where observation_id=p_observation_id and temporal_role='reporting_period_start';
  select boundary,precision,case when precision='day' then make_date(year_value,month_value,day_value) end
    into report_end_boundary,report_end_precision,report_end_date from public.intelligence_observation_temporal_assertions
    where observation_id=p_observation_id and temporal_role='reporting_period_end';
  if (report_start_boundary='open' and report_end_boundary is null) or (report_end_boundary='open' and report_start_boundary is null) or
     (report_start_boundary='open' and report_end_boundary='open') then
    raise exception using errcode='23514',message='intelligence_reporting_interval_shape_invalid';
  end if;
  if report_start_boundary='closed' then
    report_start_earliest:=case report_start_precision when 'year' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_start'),1,1) when 'month' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_start'),(select month_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_start'),1) when 'day' then report_start_date end;
  end if;
  if report_end_boundary='closed' then
    report_end_latest:=case report_end_precision when 'year' then make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_end'),12,31) when 'month' then (make_date((select year_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_end'),(select month_value from public.intelligence_observation_temporal_assertions where observation_id=p_observation_id and temporal_role='reporting_period_end'),1)+interval '1 month - 1 day')::date when 'day' then report_end_date end;
  end if;
  if report_start_earliest is not null and report_end_latest is not null and report_start_earliest>report_end_latest then
    raise exception using errcode='23514',message='intelligence_reporting_interval_order_invalid';
  end if;
  if origin_value='deterministic_derived' then
    if not exists(select 1 from public.intelligence_observation_derivations where output_observation_id=p_observation_id) or
       exists(select 1 from public.intelligence_observation_source_assertions where observation_id=p_observation_id) or
       exists(select 1 from public.intelligence_observation_evidence where observation_id=p_observation_id) then
      raise exception using errcode='23514',message='intelligence_derived_observation_provenance_invalid';
    end if;
  end if;
end $$;

create or replace function public.intelligence_observation_constraint_trigger_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='intelligence_observations' then
    perform public.intelligence_validate_observation_v1(new.id);
  else
    perform public.intelligence_validate_observation_v1(new.observation_id);
  end if;
  return new;
end $$;

create constraint trigger intelligence_observations_validate after insert on public.intelligence_observations
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_observation_subjects_validate after insert on public.intelligence_observation_subjects
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_observation_temporal_validate after insert on public.intelligence_observation_temporal_assertions
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_rent_observations_validate after insert on public.intelligence_rent_observations
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_lease_term_observations_validate after insert on public.intelligence_lease_term_observations
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_area_observations_validate after insert on public.intelligence_area_observations
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_source_assertions_observation_validate after insert on public.intelligence_observation_source_assertions
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();
create constraint trigger intelligence_observation_evidence_observation_validate after insert on public.intelligence_observation_evidence
deferrable initially deferred for each row execute function public.intelligence_observation_constraint_trigger_v1();

create or replace function public.intelligence_validate_typed_locator_v1()
returns trigger language plpgsql set search_path = '' as $$
declare expected text; location_id uuid;
begin
  location_id:=new.evidence_location_id;
  select locator_type into expected from public.intelligence_evidence_locations where id=location_id;
  if expected is distinct from tg_argv[0] then raise exception using errcode='23514',message='intelligence_evidence_locator_type_invalid'; end if;
  return new;
end $$;

create trigger intelligence_pdf_locator_type before insert on public.intelligence_pdf_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('pdf');
create trigger intelligence_spreadsheet_locator_type before insert on public.intelligence_spreadsheet_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('spreadsheet');
create trigger intelligence_delimited_locator_type before insert on public.intelligence_delimited_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('delimited');
create trigger intelligence_document_locator_type before insert on public.intelligence_document_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('document');
create trigger intelligence_structured_locator_type before insert on public.intelligence_structured_record_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('structured_record');
create trigger intelligence_attestation_locator_type before insert on public.intelligence_human_attestation_evidence_locators for each row execute function public.intelligence_validate_typed_locator_v1('human_attestation');

create or replace function public.intelligence_current_admission_state_v1(p_observation_id uuid)
returns text language sql stable set search_path = '' as $$
  select case (select action from public.intelligence_observation_admission_decisions where observation_id=p_observation_id order by decision_number desc limit 1)
    when 'admitted' then 'admitted' when 'rejected' then 'rejected' else 'pending' end
$$;

-- Once review history exists, the immutable proposition and its direct provenance
-- are closed. Reversal changes eligibility; it does not reopen the historical fact.
create or replace function public.intelligence_reject_finalized_observation_insert_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.intelligence_observation_admission_decisions where observation_id=new.observation_id) then
    raise exception using errcode='55000',message='intelligence_observation_finalized';
  end if;
  return new;
end $$;

create trigger intelligence_subject_insert_pending_only before insert on public.intelligence_observation_subjects for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_temporal_insert_pending_only before insert on public.intelligence_observation_temporal_assertions for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_source_assertion_insert_pending_only before insert on public.intelligence_observation_source_assertions for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_evidence_insert_pending_only before insert on public.intelligence_observation_evidence for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_rent_payload_insert_pending_only before insert on public.intelligence_rent_observations for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_lease_term_payload_insert_pending_only before insert on public.intelligence_lease_term_observations for each row execute function public.intelligence_reject_finalized_observation_insert_v1();
create trigger intelligence_area_payload_insert_pending_only before insert on public.intelligence_area_observations for each row execute function public.intelligence_reject_finalized_observation_insert_v1();

create or replace function public.intelligence_validate_observation_admission_v1(p_observation_id uuid)
returns void language plpgsql set search_path = '' as $$
declare assertion_row record; has_support boolean; origin_value text;
begin
  perform public.intelligence_validate_observation_v1(p_observation_id);
  select origin into origin_value from public.intelligence_observations where id=p_observation_id;
  if origin_value='deterministic_derived' then
    perform public.intelligence_validate_derivation_for_output_v1(p_observation_id);
    return;
  end if;
  if not exists(select 1 from public.intelligence_observation_source_assertions where observation_id=p_observation_id) then
    raise exception using errcode='23514',message='intelligence_admission_provenance_incomplete';
  end if;
  for assertion_row in select * from public.intelligence_observation_source_assertions where observation_id=p_observation_id loop
    has_support:=false;
    if assertion_row.assertion_role='containing' then
      select exists(
        select 1 from public.intelligence_observation_evidence oe
        join public.intelligence_evidence_locations e on e.id=oe.evidence_location_id
        where oe.observation_id=p_observation_id and oe.evidence_role='supports'
          and e.source_edition_id=assertion_row.source_edition_id
          and (e.artifact_id is null or exists(select 1 from public.intelligence_source_edition_artifacts sea where sea.source_edition_id=assertion_row.source_edition_id and sea.artifact_id=e.artifact_id))
      ) into has_support;
    elsif assertion_row.assertion_role='attributed_upstream' then
      select exists(
        select 1 from public.intelligence_source_relationships sr
        where sr.id=assertion_row.source_relationship_id and sr.attributed_source_edition_id=assertion_row.source_edition_id
          and exists(select 1 from public.intelligence_observation_source_assertions c where c.observation_id=p_observation_id and c.assertion_role='containing' and c.source_edition_id=sr.containing_source_edition_id)
          and exists(
            select 1 from public.intelligence_observation_evidence oe join public.intelligence_evidence_locations e on e.id=oe.evidence_location_id
            where oe.observation_id=p_observation_id and oe.evidence_role='supports'
              and e.source_edition_id in (sr.containing_source_edition_id,sr.attributed_source_edition_id)
          )
      ) into has_support;
    elsif assertion_row.assertion_role='human_attestation' then
      select exists(
        select 1 from public.intelligence_observation_evidence oe
        join public.intelligence_evidence_locations e on e.id=oe.evidence_location_id
        join public.intelligence_human_attestation_evidence_locators h on h.evidence_location_id=e.id
        where oe.observation_id=p_observation_id and oe.evidence_role='supports'
          and e.source_edition_id=assertion_row.source_edition_id and e.locator_type='human_attestation' and e.artifact_id is null
      ) into has_support;
    end if;
    if not has_support then raise exception using errcode='23514',message='intelligence_admission_provenance_incomplete'; end if;
  end loop;
end $$;

create or replace function public.intelligence_validate_admission_decision_v1()
returns trigger language plpgsql set search_path = '' as $$
declare previous_number integer; previous_action text; previous_state text; authoritative_digest text;
begin
  new.decided_at:=clock_timestamp();
  authoritative_digest:=encode(extensions.digest(concat_ws('|','admission-v1',new.observation_id::text,new.action,(new.decision_number-1)::text,new.reviewer_email,coalesce(new.rationale,'')),'sha256'),'hex');
  if new.request_digest is distinct from authoritative_digest then raise exception using errcode='23514',message='intelligence_admission_request_digest_invalid'; end if;
  perform 1 from public.intelligence_observations where id=new.observation_id for update;
  select d.decision_number,d.action into previous_number,previous_action
    from public.intelligence_observation_admission_decisions d where d.observation_id=new.observation_id order by d.decision_number desc limit 1;
  previous_number:=coalesce(previous_number,0);
  previous_state:=case previous_action when 'admitted' then 'admitted' when 'rejected' then 'rejected' else 'pending' end;
  if new.decision_number<>previous_number+1 then raise exception using errcode='23514',message='intelligence_admission_sequence_invalid'; end if;
  if not ((previous_state='pending' and new.action in ('admitted','rejected')) or (previous_state in ('admitted','rejected') and new.action='reversed')) then
    raise exception using errcode='23514',message='intelligence_admission_transition_invalid';
  end if;
  if new.action='admitted' then perform public.intelligence_validate_observation_admission_v1(new.observation_id); end if;
  return new;
end $$;
create trigger intelligence_observation_admission_decisions_validate before insert on public.intelligence_observation_admission_decisions
for each row execute function public.intelligence_validate_admission_decision_v1();

create or replace function public.decide_intelligence_observation_admission(
  p_observation_id uuid,p_action text,p_expected_decision_number integer,p_command_id uuid,p_reviewer_email text,p_rationale text default null)
returns table(observation_id uuid,decision_number integer,admission_state text)
language plpgsql security invoker set search_path = '' as $$
declare current_number integer; current_state text; existing public.intelligence_observation_admission_decisions%rowtype;
  request_digest text;
begin
  request_digest:=encode(extensions.digest(concat_ws('|','admission-v1',p_observation_id::text,p_action,p_expected_decision_number::text,p_reviewer_email,coalesce(p_rationale,'')),'sha256'),'hex');
  select d.* into existing from public.intelligence_observation_admission_decisions d where d.command_id=p_command_id;
  if found then
    if existing.request_digest<>request_digest then raise exception using errcode='23505',message='intelligence_admission_idempotency_conflict'; end if;
    return query select existing.observation_id,existing.decision_number,case existing.action when 'admitted' then 'admitted' when 'rejected' then 'rejected' else 'pending' end; return;
  end if;
  perform 1 from public.intelligence_observations where id=p_observation_id for update;
  if not found then raise exception using errcode='P0001',message='intelligence_observation_not_found'; end if;
  select coalesce(max(d.decision_number),0) into current_number from public.intelligence_observation_admission_decisions d where d.observation_id=p_observation_id;
  if current_number<>p_expected_decision_number then raise exception using errcode='40001',message='intelligence_admission_stale_revision'; end if;
  current_state:=public.intelligence_current_admission_state_v1(p_observation_id);
  if not ((current_state='pending' and p_action in ('admitted','rejected')) or (current_state in ('admitted','rejected') and p_action='reversed')) then
    raise exception using errcode='23514',message='intelligence_admission_transition_invalid';
  end if;
  insert into public.intelligence_observation_admission_decisions(observation_id,decision_number,action,command_id,request_digest,reviewer_email,rationale)
  values(p_observation_id,current_number+1,p_action,p_command_id,request_digest,p_reviewer_email,p_rationale);
  return query select p_observation_id,current_number+1,public.intelligence_current_admission_state_v1(p_observation_id);
end $$;

create or replace function public.intelligence_observation_proposition_equal_v1(a uuid,b uuid)
returns boolean language sql stable set search_path = '' as $$
  select
    (select observation_family from public.intelligence_observations where id=a)
      is not distinct from (select observation_family from public.intelligence_observations where id=b)
    and (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_subjects x where observation_id=a)
      is not distinct from (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_subjects x where observation_id=b)
    and (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_temporal_assertions x where observation_id=a)
      is not distinct from (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_temporal_assertions x where observation_id=b)
    and coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_rent_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_rent_observations x where observation_id=b),'null'::jsonb)
    and coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_lease_term_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_lease_term_observations x where observation_id=b),'null'::jsonb)
    and coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_area_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id' from public.intelligence_area_observations x where observation_id=b),'null'::jsonb)
$$;

create or replace function public.intelligence_observation_comparison_context_equal_v1(a uuid,b uuid)
returns boolean language sql stable set search_path = '' as $$
  select
    (select observation_family from public.intelligence_observations where id=a)
      is not distinct from (select observation_family from public.intelligence_observations where id=b)
    and (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_subjects x where observation_id=a)
      is not distinct from (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_subjects x where observation_id=b)
    and (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_temporal_assertions x where observation_id=a)
      is not distinct from (select jsonb_agg(to_jsonb(x)-'observation_id'-'id'-'created_at' order by (to_jsonb(x)-'observation_id'-'id'-'created_at')::text) from public.intelligence_observation_temporal_assertions x where observation_id=b)
    and coalesce((select to_jsonb(x)-'observation_id'-'amount' from public.intelligence_rent_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id'-'amount' from public.intelligence_rent_observations x where observation_id=b),'null'::jsonb)
    and coalesce((select to_jsonb(x)-'observation_id'-'value_precision'-'year_value'-'month_value'-'day_value' from public.intelligence_lease_term_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id'-'value_precision'-'year_value'-'month_value'-'day_value' from public.intelligence_lease_term_observations x where observation_id=b),'null'::jsonb)
    and coalesce((select to_jsonb(x)-'observation_id'-'amount' from public.intelligence_area_observations x where observation_id=a),'null'::jsonb)
      = coalesce((select to_jsonb(x)-'observation_id'-'amount' from public.intelligence_area_observations x where observation_id=b),'null'::jsonb)
$$;

create or replace function public.intelligence_validate_observation_relationship_v1()
returns trigger language plpgsql set search_path = '' as $$
declare from_family text; to_family text; equal_value boolean; equal_context boolean;
begin
  select observation_family into from_family from public.intelligence_observations where id=new.from_observation_id;
  select observation_family into to_family from public.intelligence_observations where id=new.to_observation_id;
  if from_family is distinct from to_family then raise exception using errcode='23514',message='intelligence_observation_relationship_family_invalid'; end if;
  equal_value:=public.intelligence_observation_proposition_equal_v1(new.from_observation_id,new.to_observation_id);
  equal_context:=public.intelligence_observation_comparison_context_equal_v1(new.from_observation_id,new.to_observation_id);
  if new.relationship_type='restates' and not equal_value then raise exception using errcode='23514',message='intelligence_observation_relationship_equality_invalid'; end if;
  if new.relationship_type='contradicts' and (equal_value or not equal_context) then raise exception using errcode='23514',message='intelligence_observation_relationship_contradiction_invalid'; end if;
  if new.relationship_type='contradicts' and exists(
    select 1 from public.intelligence_observation_relationships where from_observation_id=new.to_observation_id and to_observation_id=new.from_observation_id and relationship_type=new.relationship_type
  ) then raise exception using errcode='23505',message='intelligence_observation_relationship_inverse_duplicate'; end if;
  return new;
end $$;
create trigger intelligence_observation_relationships_validate before insert on public.intelligence_observation_relationships for each row execute function public.intelligence_validate_observation_relationship_v1();

create or replace function public.intelligence_validate_independence_sequence_v1()
returns trigger language plpgsql set search_path = '' as $$
declare expected integer;
begin
  perform 1 from public.intelligence_observations where id=new.observation_a_id for update;
  perform 1 from public.intelligence_observations where id=new.observation_b_id for update;
  select coalesce(max(assessment_number),0)+1 into expected from public.intelligence_observation_independence_assessments where observation_a_id=new.observation_a_id and observation_b_id=new.observation_b_id;
  if new.assessment_number<>expected then raise exception using errcode='23514',message='intelligence_independence_sequence_invalid'; end if;
  return new;
end $$;
create trigger intelligence_observation_independence_validate before insert on public.intelligence_observation_independence_assessments for each row execute function public.intelligence_validate_independence_sequence_v1();

create or replace function public.intelligence_validate_derivation_v1(p_derivation_id uuid)
returns void language plpgsql set search_path = '' as $$
declare d public.intelligence_observation_derivations%rowtype; rent_id uuid; area_id uuid; actual numeric; expected numeric; expected_digest text; expected_fingerprint text;
begin
  select * into d from public.intelligence_observation_derivations where id=p_derivation_id;
  if d.id is null then return; end if;
  if not exists(select 1 from public.intelligence_observations where id=d.output_observation_id and origin='deterministic_derived') then
    raise exception using errcode='23514',message='intelligence_derivation_output_invalid';
  end if;
  if public.intelligence_current_admission_state_v1(d.output_observation_id)<>'pending' then
    raise exception using errcode='23514',message='intelligence_derivation_output_not_pending';
  end if;
  expected_digest:=case when d.method_key='annualized_rent_per_square_foot' and d.method_version=1 then '4135a2f3be9e9ef1a71ab4890871f3b0acfd1063aa0028b412fc0646f5ffa3dc' when d.method_key='acres_to_square_feet' and d.method_version=1 then '4d76c6d8354c1c2cf4a42d33c36d8162fce0dd6b851235ccd3c2aa38673388fe' end;
  if expected_digest is null or not exists(select 1 from public.intelligence_derivation_methods m where m.method_key=d.method_key and m.method_version=d.method_version and m.contract_sha256=expected_digest) then
    raise exception using errcode='55000',message='intelligence_derivation_method_contract_mismatch';
  end if;
  select encode(extensions.digest(concat_ws('|',d.method_key,d.method_version::text,expected_digest,
    string_agg(i.input_observation_id::text||':'||i.input_ordinal::text||':'||i.input_role,'|' order by i.input_ordinal)),'sha256'),'hex')
    into expected_fingerprint from public.intelligence_observation_derivation_inputs i where i.derivation_id=d.id;
  if d.request_fingerprint is distinct from expected_fingerprint then
    raise exception using errcode='23514',message='intelligence_derivation_fingerprint_invalid';
  end if;
  if exists(select 1 from public.intelligence_observation_derivation_inputs i where i.derivation_id=d.id and public.intelligence_current_admission_state_v1(i.input_observation_id)<>'admitted') then
    raise exception using errcode='23514',message='intelligence_derivation_input_not_admitted';
  end if;
  if d.method_key='annualized_rent_per_square_foot' and d.method_version=1 then
    if (select count(*) from public.intelligence_observation_derivation_inputs where derivation_id=d.id)<>2 then raise exception using errcode='23514',message='intelligence_derivation_input_cardinality_invalid'; end if;
    select input_observation_id into rent_id from public.intelligence_observation_derivation_inputs where derivation_id=d.id and input_role='rent_input' and input_ordinal=1;
    select input_observation_id into area_id from public.intelligence_observation_derivation_inputs where derivation_id=d.id and input_role='area_input' and input_ordinal=2;
    if rent_id is null or area_id is null then raise exception using errcode='23514',message='intelligence_derivation_input_role_invalid'; end if;
    if not exists(
      select 1 from public.intelligence_observation_subjects rp join public.intelligence_observation_subjects ap on ap.subject_role='property' and ap.entity_id=rp.entity_id
      where rp.observation_id=rent_id and rp.subject_role='property' and ap.observation_id=area_id
    ) or not exists(
      select 1 from public.intelligence_observation_subjects rs join public.intelligence_observation_subjects ars
        on ars.subject_role=rs.subject_role and ars.entity_id is not distinct from rs.entity_id and ars.reported_space_id is not distinct from rs.reported_space_id
      where rs.observation_id=rent_id and ars.observation_id=area_id and rs.subject_role in ('premises','reported_space')
    ) or not exists(select 1 from public.intelligence_observation_subjects where observation_id=rent_id and subject_role in ('premises','reported_space')) then
      raise exception using errcode='23514',message='intelligence_derivation_subject_incompatible';
    end if;
    perform public.intelligence_validate_observation_v1(rent_id);
    perform public.intelligence_validate_observation_v1(area_id);
    select round(r.amount*12/a.amount,8) into expected from public.intelligence_rent_observations r,public.intelligence_area_observations a
      where r.observation_id=rent_id and r.amount_basis='monetary_absolute' and r.time_basis='monthly' and a.observation_id=area_id and a.unit='square_feet';
    select amount into actual from public.intelligence_rent_observations where observation_id=d.output_observation_id and amount_basis='monetary_per_area' and time_basis='annual' and area_basis='square_feet';
    if actual is distinct from expected or not exists(
      select 1 from public.intelligence_rent_observations output join public.intelligence_rent_observations input
        on input.observation_id=rent_id
      where output.observation_id=d.output_observation_id and output.currency_code is not distinct from input.currency_code
        and output.meaning=input.meaning and output.commitment=input.commitment and output.component=input.component
        and output.lease_structure=input.lease_structure and output.lifecycle=input.lifecycle
        and output.amount_basis='monetary_per_area' and output.time_basis='annual' and output.area_basis='square_feet'
    ) then
      raise exception using errcode='23514',message='intelligence_derivation_output_value_invalid';
    end if;
    if exists((select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=d.output_observation_id
      except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=rent_id)
      union all
      (select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=rent_id
      except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=d.output_observation_id)) then
      raise exception using errcode='23514',message='intelligence_derivation_subject_projection_invalid';
    end if;
    if exists((select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=d.output_observation_id
      except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=rent_id)
      union all
      (select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=rent_id
      except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=d.output_observation_id)) then
      raise exception using errcode='23514',message='intelligence_derivation_temporal_projection_invalid';
    end if;
  elsif d.method_key='acres_to_square_feet' and d.method_version=1 then
    if (select count(*) from public.intelligence_observation_derivation_inputs where derivation_id=d.id)<>1 then raise exception using errcode='23514',message='intelligence_derivation_input_cardinality_invalid'; end if;
    select input_observation_id into area_id from public.intelligence_observation_derivation_inputs where derivation_id=d.id and input_role='area_input' and input_ordinal=1;
    if area_id is null then raise exception using errcode='23514',message='intelligence_derivation_input_role_invalid'; end if;
    perform public.intelligence_validate_observation_v1(area_id);
    select amount*43560 into expected from public.intelligence_area_observations where observation_id=area_id and unit='acres';
    select amount into actual from public.intelligence_area_observations where observation_id=d.output_observation_id and unit='square_feet';
    if actual is distinct from expected or not exists(
      select 1 from public.intelligence_area_observations output join public.intelligence_area_observations input on input.observation_id=area_id
      where output.observation_id=d.output_observation_id and output.area_meaning=input.area_meaning and output.unit='square_feet'
    ) then raise exception using errcode='23514',message='intelligence_derivation_output_value_invalid'; end if;
    if exists((select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=d.output_observation_id
      except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=area_id)
      union all
      (select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=area_id
      except select subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=d.output_observation_id)) then
      raise exception using errcode='23514',message='intelligence_derivation_subject_projection_invalid';
    end if;
    if exists((select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=d.output_observation_id
      except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=area_id)
      union all
      (select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=area_id
      except select temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=d.output_observation_id)) then
      raise exception using errcode='23514',message='intelligence_derivation_temporal_projection_invalid';
    end if;
  else raise exception using errcode='23514',message='intelligence_derivation_method_unsupported';
  end if;
end $$;

create or replace function public.intelligence_validate_derivation_for_output_v1(p_output_observation_id uuid)
returns void language plpgsql set search_path = '' as $$
declare derivation_id uuid;
begin
  select id into derivation_id from public.intelligence_observation_derivations where output_observation_id=p_output_observation_id;
  if derivation_id is null then raise exception using errcode='23514',message='intelligence_derivation_output_invalid'; end if;
  perform public.intelligence_validate_derivation_v1(derivation_id);
end $$;

create or replace function public.intelligence_derivation_constraint_trigger_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='intelligence_observation_derivations' then perform public.intelligence_validate_derivation_v1(new.id);
  else perform public.intelligence_validate_derivation_v1(new.derivation_id); end if;
  return new;
end $$;
create constraint trigger intelligence_observation_derivations_validate after insert on public.intelligence_observation_derivations
deferrable initially deferred for each row execute function public.intelligence_derivation_constraint_trigger_v1();
create constraint trigger intelligence_observation_derivation_inputs_validate after insert on public.intelligence_observation_derivation_inputs
deferrable initially deferred for each row execute function public.intelligence_derivation_constraint_trigger_v1();

create or replace function public.intelligence_revalidate_derived_output_trigger_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.intelligence_observation_derivations where output_observation_id=new.observation_id) then
    perform public.intelligence_validate_derivation_for_output_v1(new.observation_id);
  end if;
  return new;
end $$;
create constraint trigger intelligence_derived_subject_projection_validate after insert on public.intelligence_observation_subjects deferrable initially deferred for each row execute function public.intelligence_revalidate_derived_output_trigger_v1();
create constraint trigger intelligence_derived_temporal_projection_validate after insert on public.intelligence_observation_temporal_assertions deferrable initially deferred for each row execute function public.intelligence_revalidate_derived_output_trigger_v1();
create constraint trigger intelligence_derived_rent_payload_validate after insert on public.intelligence_rent_observations deferrable initially deferred for each row execute function public.intelligence_revalidate_derived_output_trigger_v1();
create constraint trigger intelligence_derived_area_payload_validate after insert on public.intelligence_area_observations deferrable initially deferred for each row execute function public.intelligence_revalidate_derived_output_trigger_v1();

create or replace function public.derive_intelligence_acres_to_square_feet_v1(p_input_observation_id uuid,p_created_by_email text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare output_id uuid; fp text; input_amount numeric; expected_digest constant text:='4d76c6d8354c1c2cf4a42d33c36d8162fce0dd6b851235ccd3c2aa38673388fe';
begin
  perform 1 from public.intelligence_observations where id=p_input_observation_id for update;
  if public.intelligence_current_admission_state_v1(p_input_observation_id)<>'admitted' then raise exception using errcode='23514',message='intelligence_derivation_input_not_admitted'; end if;
  if not exists(select 1 from public.intelligence_derivation_methods where method_key='acres_to_square_feet' and method_version=1 and contract_sha256=expected_digest) then raise exception using errcode='55000',message='intelligence_derivation_method_contract_mismatch'; end if;
  select amount into input_amount from public.intelligence_area_observations where observation_id=p_input_observation_id and unit='acres';
  if input_amount is null then raise exception using errcode='23514',message='intelligence_derivation_input_invalid'; end if;
  fp:=encode(extensions.digest(concat_ws('|','acres_to_square_feet','1',expected_digest,p_input_observation_id::text||':1:area_input'),'sha256'),'hex');
  select output_observation_id into output_id from public.intelligence_observation_derivations where method_key='acres_to_square_feet' and method_version=1 and request_fingerprint=fp;
  if output_id is not null then return output_id; end if;
  insert into public.intelligence_observations(observation_family,origin,created_by_email) values('area','deterministic_derived',p_created_by_email) returning id into output_id;
  insert into public.intelligence_area_observations(observation_id,amount,unit,area_meaning)
    select output_id,amount*43560,'square_feet',area_meaning from public.intelligence_area_observations where observation_id=p_input_observation_id;
  insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id)
    select output_id,subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=p_input_observation_id;
  insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value)
    select output_id,temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=p_input_observation_id;
  insert into public.intelligence_observation_derivations(output_observation_id,method_key,method_version,request_fingerprint,created_by_email)
    values(output_id,'acres_to_square_feet',1,fp,p_created_by_email);
  insert into public.intelligence_observation_derivation_inputs(derivation_id,input_ordinal,input_role,input_observation_id)
    select id,1,'area_input',p_input_observation_id from public.intelligence_observation_derivations where output_observation_id=output_id;
  return output_id;
end $$;

create or replace function public.derive_intelligence_annualized_rent_per_square_foot_v1(p_rent_observation_id uuid,p_area_observation_id uuid,p_created_by_email text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  output_id uuid; fp text; rent_amount numeric; area_amount numeric; output_amount numeric;
  expected_digest constant text:='4135a2f3be9e9ef1a71ab4890871f3b0acfd1063aa0028b412fc0646f5ffa3dc';
  rent_reference date; start_row record; end_row record; area_date date; compatible boolean:=false;
begin
  perform 1 from public.intelligence_observations where id in (p_rent_observation_id,p_area_observation_id) order by id for update;
  if public.intelligence_current_admission_state_v1(p_rent_observation_id)<>'admitted' or public.intelligence_current_admission_state_v1(p_area_observation_id)<>'admitted' then
    raise exception using errcode='23514',message='intelligence_derivation_input_not_admitted';
  end if;
  if not exists(select 1 from public.intelligence_derivation_methods where method_key='annualized_rent_per_square_foot' and method_version=1 and contract_sha256=expected_digest) then
    raise exception using errcode='55000',message='intelligence_derivation_method_contract_mismatch';
  end if;
  select amount into rent_amount from public.intelligence_rent_observations where observation_id=p_rent_observation_id and amount_basis='monetary_absolute' and time_basis='monthly';
  select amount into area_amount from public.intelligence_area_observations where observation_id=p_area_observation_id and unit='square_feet';
  if rent_amount is null or area_amount is null then raise exception using errcode='23514',message='intelligence_derivation_input_invalid'; end if;

  if not exists(
    select 1 from public.intelligence_observation_subjects r join public.intelligence_observation_subjects a using(subject_role,entity_id)
    where r.observation_id=p_rent_observation_id and a.observation_id=p_area_observation_id and r.subject_role='property'
  ) or not exists(
    select 1 from public.intelligence_observation_subjects r join public.intelligence_observation_subjects a
      on a.subject_role=r.subject_role and ((a.entity_id=r.entity_id) or (a.reported_space_id=r.reported_space_id))
    where r.observation_id=p_rent_observation_id and a.observation_id=p_area_observation_id and r.subject_role in ('premises','reported_space')
  ) then raise exception using errcode='23514',message='intelligence_derivation_subject_incompatible'; end if;
  if exists(select 1 from public.intelligence_observation_subjects r join public.intelligence_observation_subjects a on r.subject_role=a.subject_role
    where r.observation_id=p_rent_observation_id and a.observation_id=p_area_observation_id and r.subject_role='tenancy' and r.tenancy_id<>a.tenancy_id)
    or exists(select 1 from public.intelligence_observation_subjects r join public.intelligence_observation_subjects a on r.subject_role=a.subject_role
    where r.observation_id=p_rent_observation_id and a.observation_id=p_area_observation_id and r.subject_role='lease' and r.lease_id<>a.lease_id) then
    raise exception using errcode='23514',message='intelligence_derivation_subject_incompatible';
  end if;

  select make_date(year_value,month_value,day_value) into rent_reference from public.intelligence_observation_temporal_assertions
    where observation_id=p_rent_observation_id and temporal_role='effective_start' and boundary='closed' and precision='day';
  if rent_reference is null then
    select make_date(year_value,month_value,day_value) into rent_reference from public.intelligence_observation_temporal_assertions
      where observation_id=p_rent_observation_id and temporal_role='as_of' and boundary='point' and precision='day';
  end if;
  if rent_reference is null then raise exception using errcode='23514',message='intelligence_derivation_rent_reference_date_missing'; end if;

  select * into start_row from public.intelligence_observation_temporal_assertions where observation_id=p_area_observation_id and temporal_role='effective_start';
  select * into end_row from public.intelligence_observation_temporal_assertions where observation_id=p_area_observation_id and temporal_role='effective_end';
  if start_row.id is not null or end_row.id is not null then
    -- Complete affirmative pair only. Omission, partial/unknown closed bounds, and open/open fail closed.
    if start_row.id is not null and end_row.id is not null then
      compatible :=
        (start_row.boundary='closed' and start_row.precision='day' and end_row.boundary='closed' and end_row.precision='day'
          and make_date(start_row.year_value,start_row.month_value,start_row.day_value)<=rent_reference
          and rent_reference<=make_date(end_row.year_value,end_row.month_value,end_row.day_value)) or
        (start_row.boundary='closed' and start_row.precision='day' and end_row.boundary='open'
          and make_date(start_row.year_value,start_row.month_value,start_row.day_value)<=rent_reference) or
        (start_row.boundary='open' and end_row.boundary='closed' and end_row.precision='day'
          and rent_reference<=make_date(end_row.year_value,end_row.month_value,end_row.day_value));
    end if;
  else
    select make_date(year_value,month_value,day_value) into area_date from public.intelligence_observation_temporal_assertions
      where observation_id=p_area_observation_id and temporal_role='as_of' and boundary='point' and precision='day';
    if area_date is null then
      select make_date(year_value,month_value,day_value) into area_date from public.intelligence_observation_temporal_assertions
        where observation_id=p_area_observation_id and temporal_role='measurement' and boundary='point' and precision='day';
    end if;
    compatible:=area_date=rent_reference;
  end if;
  if not coalesce(compatible,false) then raise exception using errcode='23514',message='intelligence_derivation_temporal_incompatible'; end if;

  output_amount:=round(rent_amount*12/area_amount,8);
  if output_amount<0 or output_amount>100000000000000000 then raise exception using errcode='22003',message='intelligence_derivation_output_magnitude_invalid'; end if;
  fp:=encode(extensions.digest(concat_ws('|','annualized_rent_per_square_foot','1',expected_digest,p_rent_observation_id::text||':1:rent_input',p_area_observation_id::text||':2:area_input'),'sha256'),'hex');
  select output_observation_id into output_id from public.intelligence_observation_derivations where method_key='annualized_rent_per_square_foot' and method_version=1 and request_fingerprint=fp;
  if output_id is not null then return output_id; end if;
  insert into public.intelligence_observations(observation_family,origin,created_by_email) values('rent','deterministic_derived',p_created_by_email) returning id into output_id;
  insert into public.intelligence_rent_observations(observation_id,amount,currency_code,meaning,commitment,component,amount_basis,time_basis,area_basis,lease_structure,lifecycle)
    select output_id,output_amount,currency_code,meaning,commitment,component,'monetary_per_area','annual','square_feet',lease_structure,lifecycle
    from public.intelligence_rent_observations where observation_id=p_rent_observation_id;
  insert into public.intelligence_observation_subjects(observation_id,subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id)
    select output_id,subject_role,entity_id,tenancy_id,lease_id,lease_instrument_id,reported_space_id from public.intelligence_observation_subjects where observation_id=p_rent_observation_id;
  insert into public.intelligence_observation_temporal_assertions(observation_id,temporal_role,boundary,precision,year_value,month_value,day_value)
    select output_id,temporal_role,boundary,precision,year_value,month_value,day_value from public.intelligence_observation_temporal_assertions where observation_id=p_rent_observation_id;
  insert into public.intelligence_observation_derivations(output_observation_id,method_key,method_version,request_fingerprint,created_by_email)
    values(output_id,'annualized_rent_per_square_foot',1,fp,p_created_by_email);
  insert into public.intelligence_observation_derivation_inputs(derivation_id,input_ordinal,input_role,input_observation_id)
    select id,1,'rent_input',p_rent_observation_id from public.intelligence_observation_derivations where output_observation_id=output_id;
  insert into public.intelligence_observation_derivation_inputs(derivation_id,input_ordinal,input_role,input_observation_id)
    select id,2,'area_input',p_area_observation_id from public.intelligence_observation_derivations where output_observation_id=output_id;
  return output_id;
end $$;

create or replace function public.intelligence_validate_entity_role_v1()
returns trigger language plpgsql set search_path = '' as $$
declare actual text;
begin
  if new.entity_id is not null then
    select entity_type into actual from public.intelligence_entities where id=new.entity_id;
    if (new.subject_role='property' and actual<>'property_site') or
       (new.subject_role='building' and actual<>'building') or
       (new.subject_role='premises' and actual<>'premises') or
       (new.subject_role in ('tenant_organization','landlord_organization') and actual<>'organization') or
       (new.subject_role='brand' and actual<>'brand') then
      raise exception using errcode='23514',message='intelligence_observation_subject_entity_type_invalid';
    end if;
  end if;
  return new;
end $$;
create trigger intelligence_observation_subject_entity_type before insert on public.intelligence_observation_subjects for each row execute function public.intelligence_validate_entity_role_v1();

create or replace function public.intelligence_validate_domain_entity_types_v1()
returns trigger language plpgsql set search_path = '' as $$
declare actual text; from_lease uuid; to_lease uuid;
begin
  if tg_table_name='intelligence_tenancy_participants' then
    select entity_type into actual from public.intelligence_entities where id=new.participant_entity_id;
    if (new.participant_role in ('tenant_organization','landlord_organization') and actual<>'organization') or (new.participant_role='brand' and actual<>'brand') then
      raise exception using errcode='23514',message='intelligence_tenancy_participant_entity_type_invalid';
    end if;
  elsif tg_table_name='intelligence_lease_parties' then
    select entity_type into actual from public.intelligence_entities where id=new.party_entity_id;
    if actual<>'organization' then raise exception using errcode='23514',message='intelligence_lease_party_entity_type_invalid'; end if;
  elsif tg_table_name='intelligence_lease_premises' then
    if new.premises_entity_id is not null then
      select entity_type into actual from public.intelligence_entities where id=new.premises_entity_id;
      if actual<>'premises' then raise exception using errcode='23514',message='intelligence_lease_premises_entity_type_invalid'; end if;
    end if;
  elsif tg_table_name='intelligence_lease_instrument_relationships' then
    select lease_id into from_lease from public.intelligence_lease_instruments where id=new.from_instrument_id;
    select lease_id into to_lease from public.intelligence_lease_instruments where id=new.to_instrument_id;
    if from_lease is distinct from to_lease then raise exception using errcode='23514',message='intelligence_lease_instrument_cross_lease_invalid'; end if;
  end if;
  return new;
end $$;
create trigger intelligence_tenancy_participants_entity_type before insert on public.intelligence_tenancy_participants for each row execute function public.intelligence_validate_domain_entity_types_v1();
create trigger intelligence_lease_parties_entity_type before insert on public.intelligence_lease_parties for each row execute function public.intelligence_validate_domain_entity_types_v1();
create trigger intelligence_lease_premises_entity_type before insert on public.intelligence_lease_premises for each row execute function public.intelligence_validate_domain_entity_types_v1();
create trigger intelligence_lease_instrument_relationships_same_lease before insert on public.intelligence_lease_instrument_relationships for each row execute function public.intelligence_validate_domain_entity_types_v1();

create or replace function public.intelligence_authoritative_insert_timestamp_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='intelligence_observation_admission_decisions' then new.decided_at:=clock_timestamp();
  elsif tg_table_name='intelligence_observation_independence_assessments' then new.assessed_at:=clock_timestamp();
  else new.created_at:=clock_timestamp(); end if;
  return new;
end $$;
create trigger intelligence_independence_authoritative_timestamp before insert on public.intelligence_observation_independence_assessments for each row execute function public.intelligence_authoritative_insert_timestamp_v1();
create trigger intelligence_derivations_authoritative_timestamp before insert on public.intelligence_observation_derivations for each row execute function public.intelligence_authoritative_insert_timestamp_v1();

create or replace function public.intelligence_derivation_method_registry_locked_v1()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception using errcode='55000',message='intelligence_derivation_method_registry_locked'; end $$;
create trigger intelligence_derivation_methods_insert_locked before insert on public.intelligence_derivation_methods for each row execute function public.intelligence_derivation_method_registry_locked_v1();

create or replace function public.intelligence_validate_property_reference_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.intelligence_entities where id=new.property_entity_id and entity_type='property_site') then
    raise exception using errcode='23514',message='intelligence_property_subject_type_invalid';
  end if;
  return new;
end $$;
create trigger intelligence_tenancies_property_type before insert on public.intelligence_tenancies for each row execute function public.intelligence_validate_property_reference_v1();
create trigger intelligence_reported_spaces_property_type before insert on public.intelligence_reported_spaces for each row execute function public.intelligence_validate_property_reference_v1();

create or replace function public.intelligence_validate_source_assertion_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.assertion_role='attributed_upstream' and not exists(
    select 1 from public.intelligence_source_relationships r
    where r.id=new.source_relationship_id and r.attributed_source_edition_id=new.source_edition_id
  ) then raise exception using errcode='23514',message='intelligence_source_assertion_relationship_invalid'; end if;
  return new;
end $$;
create trigger intelligence_observation_source_assertions_validate before insert on public.intelligence_observation_source_assertions for each row execute function public.intelligence_validate_source_assertion_v1();

create or replace function public.intelligence_validate_evidence_location_v1()
returns trigger language plpgsql set search_path = '' as $$
declare typed_count integer;
begin
  select
    (exists(select 1 from public.intelligence_pdf_evidence_locators where evidence_location_id=new.id))::int+
    (exists(select 1 from public.intelligence_spreadsheet_evidence_locators where evidence_location_id=new.id))::int+
    (exists(select 1 from public.intelligence_delimited_evidence_locators where evidence_location_id=new.id))::int+
    (exists(select 1 from public.intelligence_document_evidence_locators where evidence_location_id=new.id))::int+
    (exists(select 1 from public.intelligence_structured_record_evidence_locators where evidence_location_id=new.id))::int+
    (exists(select 1 from public.intelligence_human_attestation_evidence_locators where evidence_location_id=new.id))::int into typed_count;
  if typed_count<>1 then raise exception using errcode='23514',message='intelligence_evidence_locator_cardinality_invalid'; end if;
  if new.locator_type<>'human_attestation' and new.artifact_id is null then raise exception using errcode='23514',message='intelligence_evidence_artifact_required'; end if;
  if new.artifact_id is not null and not exists(select 1 from public.intelligence_source_edition_artifacts where source_edition_id=new.source_edition_id and artifact_id=new.artifact_id) then
    raise exception using errcode='23514',message='intelligence_evidence_artifact_source_mismatch';
  end if;
  return new;
end $$;
create constraint trigger intelligence_evidence_locations_validate after insert on public.intelligence_evidence_locations
deferrable initially deferred for each row execute function public.intelligence_validate_evidence_location_v1();

create index intelligence_observation_subjects_entity_idx on public.intelligence_observation_subjects(entity_id,subject_role,observation_id) where entity_id is not null;
create index intelligence_observation_subjects_tenancy_idx on public.intelligence_observation_subjects(tenancy_id,observation_id) where tenancy_id is not null;
create index intelligence_observation_subjects_lease_idx on public.intelligence_observation_subjects(lease_id,observation_id) where lease_id is not null;
create index intelligence_observations_family_created_idx on public.intelligence_observations(observation_family,created_at,id);
create index intelligence_rent_retrieval_idx on public.intelligence_rent_observations(meaning,commitment,lifecycle,amount_basis,time_basis,area_basis);
create index intelligence_temporal_role_idx on public.intelligence_observation_temporal_assertions(temporal_role,year_value,month_value,day_value,observation_id);
create index intelligence_source_assertions_edition_idx on public.intelligence_observation_source_assertions(source_edition_id,observation_id);
create index intelligence_observation_evidence_location_idx on public.intelligence_observation_evidence(evidence_location_id,observation_id);
create index intelligence_derivation_inputs_observation_idx on public.intelligence_observation_derivation_inputs(input_observation_id,derivation_id);
create index intelligence_relationships_to_idx on public.intelligence_observation_relationships(to_observation_id,relationship_type);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'intelligence_tenancies','intelligence_reported_spaces','intelligence_tenancy_participants','intelligence_leases','intelligence_lease_parties','intelligence_lease_premises','intelligence_lease_instruments','intelligence_lease_instrument_relationships',
    'intelligence_observations','intelligence_observation_subjects','intelligence_observation_temporal_assertions','intelligence_observation_source_assertions','intelligence_evidence_locations','intelligence_pdf_evidence_locators','intelligence_spreadsheet_evidence_locators','intelligence_delimited_evidence_locators','intelligence_document_evidence_locators','intelligence_structured_record_evidence_locators','intelligence_human_attestation_evidence_locators','intelligence_observation_evidence','intelligence_observation_admission_decisions','intelligence_observation_relationships','intelligence_observation_independence_assessments','intelligence_derivation_methods','intelligence_observation_derivations','intelligence_observation_derivation_inputs','intelligence_rent_observations','intelligence_lease_term_observations','intelligence_area_observations'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated',table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role',table_name);
  end loop;
end $$;

revoke all on function public.decide_intelligence_observation_admission(uuid,text,integer,uuid,text,text) from public,anon,authenticated;
grant execute on function public.decide_intelligence_observation_admission(uuid,text,integer,uuid,text,text) to service_role;
revoke all on function public.derive_intelligence_acres_to_square_feet_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.derive_intelligence_acres_to_square_feet_v1(uuid,text) to service_role;
revoke all on function public.derive_intelligence_annualized_rent_per_square_foot_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.derive_intelligence_annualized_rent_per_square_foot_v1(uuid,uuid,text) to service_role;
revoke all on function public.intelligence_current_admission_state_v1(uuid) from public,anon,authenticated;
grant execute on function public.intelligence_current_admission_state_v1(uuid) to service_role;
grant usage on schema extensions to service_role;

revoke all on function public.intelligence_history_append_only_v2() from public,anon,authenticated;
revoke all on function public.intelligence_validate_calendar_date_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_lease_term_date_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_observation_v1(uuid) from public,anon,authenticated;
revoke all on function public.intelligence_observation_constraint_trigger_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_typed_locator_v1() from public,anon,authenticated;
revoke all on function public.intelligence_observation_proposition_equal_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.intelligence_validate_observation_relationship_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_independence_sequence_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_entity_role_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_property_reference_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_source_assertion_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_evidence_location_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_admission_decision_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_derivation_v1(uuid) from public,anon,authenticated;
revoke all on function public.intelligence_derivation_constraint_trigger_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_observation_admission_v1(uuid) from public,anon,authenticated;
revoke all on function public.intelligence_observation_comparison_context_equal_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.intelligence_validate_derivation_for_output_v1(uuid) from public,anon,authenticated;
revoke all on function public.intelligence_revalidate_derived_output_trigger_v1() from public,anon,authenticated;
revoke all on function public.intelligence_validate_domain_entity_types_v1() from public,anon,authenticated;
revoke all on function public.intelligence_authoritative_insert_timestamp_v1() from public,anon,authenticated;
revoke all on function public.intelligence_derivation_method_registry_locked_v1() from public,anon,authenticated;
revoke all on function public.intelligence_reject_finalized_observation_insert_v1() from public,anon,authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'intelligence_tenancies','intelligence_reported_spaces','intelligence_tenancy_participants','intelligence_leases','intelligence_lease_parties','intelligence_lease_premises','intelligence_lease_instruments','intelligence_lease_instrument_relationships',
    'intelligence_observations','intelligence_observation_subjects','intelligence_observation_temporal_assertions','intelligence_observation_source_assertions','intelligence_evidence_locations','intelligence_pdf_evidence_locators','intelligence_spreadsheet_evidence_locators','intelligence_delimited_evidence_locators','intelligence_document_evidence_locators','intelligence_structured_record_evidence_locators','intelligence_human_attestation_evidence_locators','intelligence_observation_evidence','intelligence_observation_admission_decisions','intelligence_observation_relationships','intelligence_observation_independence_assessments','intelligence_derivation_methods','intelligence_observation_derivations','intelligence_observation_derivation_inputs','intelligence_rent_observations','intelligence_lease_term_observations','intelligence_area_observations'
  ] loop
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.intelligence_history_append_only_v2()',table_name||'_append_only',table_name);
  end loop;
end $$;
