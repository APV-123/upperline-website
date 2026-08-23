param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl
if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Run([string]$file){& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $file; if($LASTEXITCODE-ne 0){throw "psql failed: $file"}}
$fixture=@'
create extension if not exists pgcrypto;
create schema storage;
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null);
alter table storage.objects enable row level security;
alter table storage.objects force row level security;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;
  else alter role service_role bypassrls; end if;
end $$;
grant usage on schema storage to anon,authenticated,service_role;
grant select,insert on storage.objects to anon,authenticated,service_role;
create policy "Allow public read 1c1bq73_0" on storage.objects for select to public using (true);
create policy "Allow public uploads 148yprt_0" on storage.objects for insert to public with check (true);
create policy "Allow public uploads 1c1bq73_0" on storage.objects for insert to public with check (true);
create policy "Display Image" on storage.objects for select to public using (true);
'@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $fixture
if($LASTEXITCODE-ne 0){throw 'fixture failed'}
Run (Join-Path $root 'supabase/migrations/20260823000200_scope_storage_object_policies.sql')
Run (Join-Path $PSScriptRoot 'storage-policy.integration.sql')
Write-Host 'Storage policy integration tests passed.'
