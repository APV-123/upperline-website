param(
  [string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw 'Set OPPORTUNITY_TEST_DATABASE_URL explicitly to a disposable local PostgreSQL database.'
}

$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @('postgres', 'postgresql')) {
  throw 'Integration database URL must use postgres:// or postgresql://.'
}
if ($uri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
  throw "Refusing non-loopback integration database host: $($uri.Host)"
}
if ($DatabaseUrl -match '(?i)supabase\.(co|com)|supabase\.in') {
  throw 'Refusing a recognizable Supabase endpoint.'
}

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $installedPsql = 'C:\Program Files\PostgreSQL\15\bin\psql.exe'
  if (Test-Path -LiteralPath $installedPsql) { $psql = $installedPsql }
}
if (-not $psql) { throw 'psql was not found.' }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$migration = Join-Path $repoRoot 'supabase\migrations\20260821000100_create_acquisition_opportunities.sql'
$behavior = Join-Path $PSScriptRoot 'opportunity-schema.integration.sql'

function Invoke-PsqlFile([string]$Path) {
  & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $Path
  if ($LASTEXITCODE -ne 0) { throw "psql failed for $Path" }
}

& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c 'create extension if not exists pgcrypto;' -c 'create table public.deals (id uuid primary key default gen_random_uuid());'
if ($LASTEXITCODE -ne 0) { throw 'Failed to create isolated Deal fixture.' }

Invoke-PsqlFile $migration
$tableCount = & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc "select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname in ('acquisition_opportunities','opportunity_sources','opportunity_underwriting_versions','opportunity_field_provenance');"
if ($LASTEXITCODE -ne 0 -or $tableCount.Trim() -ne '4') {
  throw "Migration catalog verification failed; expected 4 tables, found $tableCount."
}
Invoke-PsqlFile $behavior

Write-Host 'Opportunity migration integration tests passed.'
