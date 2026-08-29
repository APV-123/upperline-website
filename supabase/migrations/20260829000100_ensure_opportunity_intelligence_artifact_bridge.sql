create function public.ensure_opportunity_intelligence_artifact_bridge(
  p_opportunity_id uuid,
  p_actor_email text
)
returns table (
  artifact_id uuid,
  artifact_acquisition_id uuid,
  artifact_disposition text,
  acquisition_disposition text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  legacy public.opportunity_source_artifacts%rowtype;
  global_artifact public.intelligence_artifacts%rowtype;
  acquisition public.intelligence_artifact_acquisitions%rowtype;
  created_artifact_count integer := 0;
  created_acquisition_count integer := 0;
begin
  if p_actor_email is null or lower(btrim(p_actor_email)) !~ '^[^[:space:]@]+@upperlineco[.]com$' then
    raise exception using errcode = '22023', message = 'intelligence_bridge_actor_invalid';
  end if;

  select artifact.* into legacy
  from public.opportunity_source_artifacts artifact
  join public.opportunity_ingestions ingestion on ingestion.id = artifact.ingestion_id
  where ingestion.opportunity_id = p_opportunity_id
    and ingestion.entry_type = 'pdf'
    and artifact.validation_status = 'valid'
    and artifact.detected_mime_type = 'application/pdf'
  order by artifact.created_at desc, artifact.id desc
  limit 1;
  if not found then
    raise exception using errcode = 'P0002', message = 'intelligence_bridge_verified_artifact_not_found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('intelligence-artifact:' || legacy.sha256_digest, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('intelligence-acquisition:' || legacy.id::text, 0));

  insert into public.intelligence_artifacts (sha256_digest, byte_size, detected_media_type)
  values (legacy.sha256_digest, legacy.byte_size, legacy.detected_mime_type)
  on conflict (sha256_digest) do nothing;
  get diagnostics created_artifact_count = row_count;

  select * into global_artifact from public.intelligence_artifacts where sha256_digest = legacy.sha256_digest;
  if not found or global_artifact.byte_size <> legacy.byte_size
    or global_artifact.detected_media_type <> legacy.detected_mime_type then
    raise exception using errcode = '23514', message = 'intelligence_bridge_global_artifact_mismatch';
  end if;

  insert into public.intelligence_artifact_acquisitions (
    artifact_id, opportunity_id, legacy_opportunity_artifact_id, acquisition_channel,
    access_class, storage_bucket, storage_path, original_filename, acquired_by_email, acquired_at
  ) values (
    global_artifact.id, p_opportunity_id, legacy.id, 'legacy_link', 'private',
    legacy.storage_bucket, legacy.storage_path, legacy.original_filename,
    legacy.created_by_email, legacy.acquired_at
  ) on conflict (legacy_opportunity_artifact_id) do nothing;
  get diagnostics created_acquisition_count = row_count;

  select * into acquisition from public.intelligence_artifact_acquisitions
  where legacy_opportunity_artifact_id = legacy.id;
  if not found or acquisition.artifact_id <> global_artifact.id
    or acquisition.opportunity_id <> p_opportunity_id
    or acquisition.storage_bucket is distinct from legacy.storage_bucket
    or acquisition.storage_path is distinct from legacy.storage_path then
    raise exception using errcode = '23514', message = 'intelligence_bridge_acquisition_mismatch';
  end if;

  return query select global_artifact.id, acquisition.id,
    case when created_artifact_count = 1 then 'created_global_artifact' else 'reused_global_artifact' end,
    case when created_acquisition_count = 1 then 'created_acquisition' else 'recovered_existing_acquisition' end;
end;
$$;

revoke all on function public.ensure_opportunity_intelligence_artifact_bridge(uuid, text)
from public, anon, authenticated;
grant execute on function public.ensure_opportunity_intelligence_artifact_bridge(uuid, text)
to service_role;
