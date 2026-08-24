param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'; if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl; if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Run([string]$file){& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $file; if($LASTEXITCODE-ne 0){throw "psql failed: $file"}}
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c 'create extension if not exists pgcrypto; do $$ begin create role anon; exception when duplicate_object then null; end $$; do $$ begin create role authenticated; exception when duplicate_object then null; end $$; do $$ begin create role service_role; exception when duplicate_object then null; end $$; create table public.deals(id uuid primary key default gen_random_uuid());'
if($LASTEXITCODE-ne 0){throw 'fixture failed'}
Run (Join-Path $root 'supabase/migrations/20260821000100_create_acquisition_opportunities.sql')
Run (Join-Path $root 'supabase/migrations/20260822000100_create_opportunity_ingestion_foundation.sql')
Run (Join-Path $root 'supabase/migrations/20260822000200_create_opportunity_ingestion_transaction_rpcs.sql')
Run (Join-Path $root 'supabase/migrations/20260823000100_amend_land_flyer_extraction_contract.sql')
Run (Join-Path $PSScriptRoot 'opportunity-extraction-retry-rollback.integration.sql')
Write-Host 'Opportunity extraction retry rollback test passed.'
