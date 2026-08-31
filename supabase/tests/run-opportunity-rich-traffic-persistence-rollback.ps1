param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl
if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$setup="create extension if not exists pgcrypto; do `$`$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end `$`$; create table public.deals(id uuid primary key default gen_random_uuid());"
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $setup
if($LASTEXITCODE-ne 0){throw 'fixture failed'}
$files=@(
  (Join-Path $root 'supabase/migrations/20260821000100_create_acquisition_opportunities.sql'),
  (Join-Path $root 'supabase/migrations/20260822000100_create_opportunity_ingestion_foundation.sql'),
  (Join-Path $root 'supabase/migrations/20260822000200_create_opportunity_ingestion_transaction_rpcs.sql'),
  (Join-Path $root 'supabase/migrations/20260823000100_amend_land_flyer_extraction_contract.sql'),
  (Join-Path $root 'supabase/migrations/20260823000300_add_extraction_retry_semantics.sql'),
  (Join-Path $PSScriptRoot 'opportunity-rich-traffic-persistence-rollback.integration.sql')
)
$arguments=@('-X','-v','ON_ERROR_STOP=1','-d',$DatabaseUrl)
foreach($file in $files){$arguments+=@('-f',$file)}
& $psql @arguments
if($LASTEXITCODE-ne 0){throw 'rich traffic persistence rollback failed'}
Write-Host 'Rich traffic persistence rollback tests passed.'
