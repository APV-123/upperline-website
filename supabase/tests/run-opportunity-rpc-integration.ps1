param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw 'Set OPPORTUNITY_TEST_DATABASE_URL explicitly to a disposable local PostgreSQL database.'
}
$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @('postgres', 'postgresql') -or
    $uri.Host -notin @('127.0.0.1', 'localhost', '::1') -or
    $DatabaseUrl -match '(?i)supabase\.(co|com)|supabase\.in') {
  throw 'Refusing non-loopback or recognizable Supabase database URL.'
}

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $installed = 'C:\Program Files\PostgreSQL\15\bin\psql.exe'
  if (Test-Path -LiteralPath $installed) { $psql = $installed }
}
if (-not $psql) { throw 'psql was not found.' }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$phase2 = Join-Path $repoRoot 'supabase\migrations\20260821000100_create_acquisition_opportunities.sql'
$rpc = Join-Path $repoRoot 'supabase\migrations\20260821000200_create_opportunity_transaction_rpcs.sql'
$behavior = Join-Path $PSScriptRoot 'opportunity-rpc.integration.sql'

function Invoke-PsqlFile([string]$Path) {
  & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $Path
  if ($LASTEXITCODE -ne 0) { throw "psql failed for $Path" }
}

$bootstrap = @"
create extension if not exists pgcrypto;
create table public.deals (id uuid primary key default gen_random_uuid());
do `$`$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='rpc_browser') then create role rpc_browser nologin; end if;
end
`$`$;
"@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $bootstrap
if ($LASTEXITCODE -ne 0) { throw 'Failed to create isolated database fixtures and roles.' }

Invoke-PsqlFile $phase2
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c @"
grant usage on schema public to service_role;
grant usage on schema public to anon, authenticated, rpc_browser;
grant select, insert, update, delete on all tables in schema public to service_role;
"@
if ($LASTEXITCODE -ne 0) { throw 'Failed to grant isolated service-role table access.' }
Invoke-PsqlFile $rpc
Invoke-PsqlFile $behavior

Write-Host 'Opportunity RPC integration tests passed.'
