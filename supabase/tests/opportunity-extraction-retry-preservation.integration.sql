\set ON_ERROR_STOP on

do $$
declare changed_count integer;
begin
  select count(*) into changed_count
  from public.opportunity_extraction_runs r
  join public.retry_migration_predecessor_snapshot s using(id)
  where (to_jsonb(r)-'logical_extraction_key'-'retry_command_id'-'retry_of_run_id') is distinct from s.original;
  if changed_count<>0 then raise exception 'predecessor extraction facts changed'; end if;
  if exists(
    select 1 from public.opportunity_extraction_runs r
    join public.retry_migration_predecessor_snapshot s using(id)
    where r.logical_extraction_key<>r.run_idempotency_key
      or r.retry_command_id is not null or r.retry_of_run_id is not null
  ) then raise exception 'predecessor retry identity incorrect'; end if;
  if (select count(*) from public.opportunity_extraction_runs r
      join public.retry_migration_predecessor_snapshot s using(id))<>5 then
    raise exception 'predecessor row count changed';
  end if;
end $$;

-- Both old and newly introduced identity fields remain protected after migration.
do $$ begin
  begin update public.opportunity_extraction_runs set provider='changed' where id='f3000000-0000-4000-8000-000000000001';
    raise exception 'failed business identity mutable';
  exception when others then if sqlerrm='failed business identity mutable' then raise; end if; end;
  begin update public.opportunity_extraction_runs set logical_extraction_key='changed' where id='f3000000-0000-4000-8000-000000000001';
    raise exception 'failed logical identity mutable';
  exception when others then if sqlerrm='failed logical identity mutable' then raise; end if; end;
  begin update public.opportunity_extraction_runs set attempt_number=2 where id='f3000000-0000-4000-8000-000000000002';
    raise exception 'succeeded attempt mutable';
  exception when others then if sqlerrm='succeeded attempt mutable' then raise; end if; end;
  begin update public.opportunity_extraction_runs set retry_of_run_id='f3000000-0000-4000-8000-000000000001' where id='f3000000-0000-4000-8000-000000000002';
    raise exception 'succeeded retry parent mutable';
  exception when others then if sqlerrm='succeeded retry parent mutable' then raise; end if; end;
  begin update public.opportunity_extraction_runs set model='changed' where id='f3000000-0000-4000-8000-000000000003';
    raise exception 'running business identity mutable';
  exception when others then if sqlerrm='running business identity mutable' then raise; end if; end;
  begin update public.opportunity_extraction_runs set retry_command_id=gen_random_uuid() where id='f3000000-0000-4000-8000-000000000003';
    raise exception 'running retry identity mutable';
  exception when others then if sqlerrm='running retry identity mutable' then raise; end if; end;
end $$;

drop table public.retry_migration_predecessor_snapshot;
