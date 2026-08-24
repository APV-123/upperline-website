-- Phase 4A.3.5: explicit, idempotent terminal-failure extraction retries.

alter table public.opportunity_extraction_runs
  add column logical_extraction_key text,
  add column retry_command_id uuid,
  add column retry_of_run_id uuid;

update public.opportunity_extraction_runs
set logical_extraction_key = run_idempotency_key;

alter table public.opportunity_extraction_runs
  alter column logical_extraction_key set not null,
  drop constraint opportunity_extraction_runs_attempt_key,
  add constraint opportunity_extraction_runs_logical_key_check
    check (length(btrim(logical_extraction_key)) between 1 and 200),
  add constraint opportunity_extraction_runs_retry_shape_check
    check ((retry_command_id is null) = (retry_of_run_id is null)),
  add constraint opportunity_extraction_runs_retry_attempt_check
    check (
      (retry_command_id is null and retry_of_run_id is null and attempt_number = 1)
      or (retry_command_id is not null and retry_of_run_id is not null and attempt_number > 1)
    ),
  add constraint opportunity_extraction_runs_retry_relationship_key
    unique (id, ingestion_id, artifact_id, logical_extraction_key),
  add constraint opportunity_extraction_runs_logical_attempt_key
    unique (artifact_id, logical_extraction_key, attempt_number),
  add constraint opportunity_extraction_runs_retry_of_fkey
    foreign key (retry_of_run_id, ingestion_id, artifact_id, logical_extraction_key)
    references public.opportunity_extraction_runs(id, ingestion_id, artifact_id, logical_extraction_key)
    on delete restrict;

create unique index opportunity_extraction_runs_initial_logical_key
  on public.opportunity_extraction_runs (artifact_id, logical_extraction_key)
  where retry_command_id is null;

create unique index opportunity_extraction_runs_retry_command_key
  on public.opportunity_extraction_runs (retry_command_id)
  where retry_command_id is not null;

create function public.enforce_opportunity_extraction_retry_parent()
returns trigger language plpgsql set search_path = '' as $$
declare v_parent public.opportunity_extraction_runs%rowtype;
begin
  if new.retry_command_id is null then return new; end if;
  select * into v_parent from public.opportunity_extraction_runs where id=new.retry_of_run_id;
  if not found or v_parent.ingestion_id<>new.ingestion_id or v_parent.artifact_id<>new.artifact_id
    or v_parent.logical_extraction_key<>new.logical_extraction_key
    or v_parent.status<>'failed' or v_parent.attempt_number+1<>new.attempt_number then
    raise exception using errcode='23514', message='extraction_retry_parent_invalid';
  end if;
  return new;
end;
$$;

create trigger opportunity_extraction_runs_retry_parent_guard
before insert on public.opportunity_extraction_runs
for each row execute function public.enforce_opportunity_extraction_retry_parent();

create or replace function public.protect_opportunity_ingestion_history()
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
      or new.logical_extraction_key is distinct from old.logical_extraction_key
      or new.retry_command_id is distinct from old.retry_command_id or new.retry_of_run_id is distinct from old.retry_of_run_id
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

create or replace function public.allocate_opportunity_extraction_run(
  p_ingestion_id uuid, p_artifact_id uuid, p_run_id uuid, p_run_idempotency_key text,
  p_extraction_strategy text, p_extraction_version text, p_provider text, p_model text,
  p_parser_version text, p_prompt_version text, p_schema_version text, p_input_digest text,
  p_actor_email text
) returns table(run_id uuid, attempt_number integer, run_status text, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_ingestion public.opportunity_ingestions%rowtype;
declare v_artifact public.opportunity_source_artifacts%rowtype;
declare v_existing public.opportunity_extraction_runs%rowtype;
begin
  select * into v_ingestion from public.opportunity_ingestions where id=p_ingestion_id for update;
  if not found then raise exception using errcode='P0002', message='ingestion_not_found'; end if;
  select * into v_artifact from public.opportunity_source_artifacts where id=p_artifact_id and ingestion_id=p_ingestion_id for update;
  if not found then raise exception using errcode='22023', message='artifact_ingestion_mismatch'; end if;
  select * into v_existing from public.opportunity_extraction_runs
    where artifact_id=p_artifact_id and logical_extraction_key=p_run_idempotency_key and retry_command_id is null;
  if found then
    return query select v_existing.id,v_existing.attempt_number,v_existing.status,v_ingestion.status; return;
  end if;
  if v_ingestion.status not in ('ready','review_ready','failed') then
    raise exception using errcode='22023', message='ingestion_not_extractable';
  end if;
  if p_input_digest<>v_artifact.sha256_digest then raise exception using errcode='22023', message='run_input_digest_mismatch'; end if;
  insert into public.opportunity_extraction_runs
    (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,logical_extraction_key,status,
     extraction_strategy,extraction_version,provider,model,parser_version,prompt_version,schema_version,input_digest,
     started_at,created_by_email)
  values (p_run_id,p_ingestion_id,p_artifact_id,1,p_run_idempotency_key,p_run_idempotency_key,'running',
    p_extraction_strategy,p_extraction_version,p_provider,p_model,p_parser_version,p_prompt_version,p_schema_version,p_input_digest,
    now(),lower(btrim(p_actor_email)));
  update public.opportunity_ingestions set status='extracting',revision=revision+1,failure_code=null,failure_message=null
    where id=p_ingestion_id;
  return query select p_run_id,1,'running'::text,'extracting'::text;
end; $$;

create function public.allocate_opportunity_extraction_retry(
  p_ingestion_id uuid, p_artifact_id uuid, p_run_id uuid, p_logical_extraction_key text,
  p_retry_command_id uuid, p_extraction_strategy text, p_extraction_version text,
  p_provider text, p_model text, p_parser_version text, p_prompt_version text,
  p_schema_version text, p_input_digest text, p_actor_email text
) returns table(run_id uuid, attempt_number integer, run_status text, ingestion_status text)
language plpgsql set search_path = '' as $$
declare v_ingestion public.opportunity_ingestions%rowtype;
declare v_artifact public.opportunity_source_artifacts%rowtype;
declare v_existing public.opportunity_extraction_runs%rowtype;
declare v_previous public.opportunity_extraction_runs%rowtype;
declare v_attempt integer;
declare v_run_key text;
begin
  if p_retry_command_id is null then raise exception using errcode='22023', message='retry_command_invalid'; end if;
  select * into v_ingestion from public.opportunity_ingestions where id=p_ingestion_id for update;
  if not found then raise exception using errcode='P0002', message='ingestion_not_found'; end if;
  select * into v_artifact from public.opportunity_source_artifacts where id=p_artifact_id and ingestion_id=p_ingestion_id for update;
  if not found then raise exception using errcode='22023', message='artifact_ingestion_mismatch'; end if;
  select * into v_existing from public.opportunity_extraction_runs where retry_command_id=p_retry_command_id;
  if found then
    if v_existing.ingestion_id<>p_ingestion_id or v_existing.artifact_id<>p_artifact_id
      or v_existing.logical_extraction_key<>p_logical_extraction_key
      or v_existing.extraction_strategy<>p_extraction_strategy or v_existing.extraction_version<>p_extraction_version
      or v_existing.provider is distinct from p_provider or v_existing.model is distinct from p_model
      or v_existing.parser_version is distinct from p_parser_version or v_existing.prompt_version is distinct from p_prompt_version
      or v_existing.schema_version<>p_schema_version or v_existing.input_digest<>p_input_digest then
      raise exception using errcode='22023', message='retry_command_conflict';
    end if;
    return query select v_existing.id,v_existing.attempt_number,v_existing.status,v_ingestion.status; return;
  end if;
  select * into v_previous from public.opportunity_extraction_runs
    where artifact_id=p_artifact_id and logical_extraction_key=p_logical_extraction_key
    order by attempt_number desc limit 1 for update;
  if not found then raise exception using errcode='55000', message='extraction_retry_requires_failed_run'; end if;
  if v_previous.status in ('pending','running') then raise exception using errcode='55000', message='extraction_retry_running'; end if;
  if v_previous.status<>'failed' then raise exception using errcode='55000', message='extraction_retry_requires_failed_run'; end if;
  if v_ingestion.status<>'failed' then raise exception using errcode='55000', message='extraction_retry_ingestion_not_failed'; end if;
  if p_input_digest<>v_artifact.sha256_digest or v_previous.input_digest<>p_input_digest
    or v_previous.extraction_strategy<>p_extraction_strategy or v_previous.extraction_version<>p_extraction_version
    or v_previous.provider is distinct from p_provider or v_previous.model is distinct from p_model
    or v_previous.parser_version is distinct from p_parser_version or v_previous.prompt_version is distinct from p_prompt_version
    or v_previous.schema_version<>p_schema_version then
    raise exception using errcode='22023', message='extraction_retry_configuration_mismatch';
  end if;
  v_attempt:=v_previous.attempt_number+1;
  v_run_key:='retry:'||p_retry_command_id::text;
  insert into public.opportunity_extraction_runs
    (id,ingestion_id,artifact_id,attempt_number,run_idempotency_key,logical_extraction_key,retry_command_id,retry_of_run_id,
     status,extraction_strategy,extraction_version,provider,model,parser_version,prompt_version,schema_version,input_digest,
     started_at,created_by_email)
  values (p_run_id,p_ingestion_id,p_artifact_id,v_attempt,v_run_key,p_logical_extraction_key,p_retry_command_id,v_previous.id,
    'running',p_extraction_strategy,p_extraction_version,p_provider,p_model,p_parser_version,p_prompt_version,p_schema_version,
    p_input_digest,now(),lower(btrim(p_actor_email)));
  update public.opportunity_ingestions set status='extracting',revision=revision+1,failure_code=null,failure_message=null
    where id=p_ingestion_id;
  return query select p_run_id,v_attempt,'running'::text,'extracting'::text;
end; $$;

revoke execute on function public.allocate_opportunity_extraction_retry(uuid,uuid,uuid,text,uuid,text,text,text,text,text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.allocate_opportunity_extraction_retry(uuid,uuid,uuid,text,uuid,text,text,text,text,text,text,text,text,text)
  to service_role;

comment on column public.opportunity_extraction_runs.logical_extraction_key is
  'Stable artifact plus server-controlled extraction-configuration identity; never varied to cause a retry.';
comment on column public.opportunity_extraction_runs.retry_command_id is
  'Opaque, authority-free explicit retry idempotency identity. Null for ordinary attempt 1.';
comment on column public.opportunity_extraction_runs.retry_of_run_id is
  'Immutable link from an explicit retry attempt to the immediately preceding terminal failed attempt.';
