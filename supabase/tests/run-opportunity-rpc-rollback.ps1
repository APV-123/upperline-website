param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { throw 'Explicit local test database URL required.' }
$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @('postgres', 'postgresql') -or
    $uri.Host -notin @('127.0.0.1', 'localhost', '::1') -or
    $DatabaseUrl -match '(?i)supabase\.(co|com)|supabase\.in') {
  throw 'Refusing non-loopback or Supabase database URL.'
}

$psql = 'C:\Program Files\PostgreSQL\15\bin\psql.exe'
if (-not (Test-Path -LiteralPath $psql)) { $psql = (Get-Command psql).Source }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$phase2 = Join-Path $repoRoot 'supabase\migrations\20260821000100_create_acquisition_opportunities.sql'
$rollbackFile = Join-Path $PSScriptRoot 'opportunity-rpc-rollback.integration.sql'

$bootstrap = @"
create extension if not exists pgcrypto;
create table public.deals (id uuid primary key default gen_random_uuid());
do `$`$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end
`$`$;
"@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $bootstrap
if ($LASTEXITCODE -ne 0) { throw 'Rollback bootstrap failed.' }
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $phase2
if ($LASTEXITCODE -ne 0) { throw 'Phase 2 rollback fixture migration failed.' }

& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $rollbackFile 2>$null
if ($LASTEXITCODE -eq 0) { throw 'Rollback fixture unexpectedly succeeded.' }

$functionCount = & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc @"
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'create_opportunity_underwriting_draft','set_active_opportunity_underwriting',
  'replace_opportunity_field_provenance','clone_opportunity_underwriting_version'
);
"@
if ($LASTEXITCODE -ne 0 -or $functionCount.Trim() -ne '0') {
  throw "RPC migration rollback left functions behind: $functionCount"
}
Write-Host 'Opportunity RPC migration rollback test passed.'
