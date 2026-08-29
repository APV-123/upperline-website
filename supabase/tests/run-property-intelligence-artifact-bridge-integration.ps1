param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl
if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Run([string]$file){&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -f $file;if($LASTEXITCODE-ne 0){throw "psql failed: $file"}}
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "create schema if not exists extensions;create extension if not exists pgcrypto schema extensions;do `$`$ begin if not exists(select 1 from pg_roles where rolname='anon')then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role;end if;end `$`$;alter role service_role bypassrls;create table public.deals(id uuid primary key default gen_random_uuid());"
if($LASTEXITCODE-ne 0){throw 'fixture failed'}
foreach($migration in @(
 '20260821000100_create_acquisition_opportunities.sql','20260822000100_create_opportunity_ingestion_foundation.sql',
 '20260825000100_create_property_intelligence_identity_source_foundation.sql','20260826000100_create_property_intelligence_observations.sql',
 '20260827000100_create_property_intelligence_provenance_resolution.sql','20260828000100_create_property_intelligence_provenance_orchestration.sql',
 '20260828000200_harden_property_intelligence_provenance_privileges.sql','20260829000100_ensure_opportunity_intelligence_artifact_bridge.sql'
)){Run (Join-Path $root "supabase/migrations/$migration")}
Run (Join-Path $PSScriptRoot 'property-intelligence-artifact-bridge.integration.sql')
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.acquisition_opportunities(id,name,created_by_email,updated_by_email) values('91000000-0000-4000-8000-000000000003','Bridge Race','reviewer@upperlineco.com','reviewer@upperlineco.com');insert into public.opportunity_ingestions(id,opportunity_id,entry_type,status,requested_by_email) values('92000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000003','pdf','review_ready','reviewer@upperlineco.com');insert into public.opportunity_source_artifacts(id,ingestion_id,artifact_kind,storage_bucket,storage_path,original_filename,detected_mime_type,byte_size,sha256_digest,page_count,validation_status,created_by_email) values('93000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000003','pdf','private-pdfs','opportunities/91000000-0000-4000-8000-000000000003/ingestions/92000000-0000-4000-8000-000000000003/artifacts/93000000-0000-4000-8000-000000000003/source.pdf','race.pdf','application/pdf',2000,repeat('b',64),5,'valid','reviewer@upperlineco.com');"
if($LASTEXITCODE-ne 0){throw 'concurrency fixture failed'}
$sql="set role service_role;select * from public.ensure_opportunity_intelligence_artifact_bridge('91000000-0000-4000-8000-000000000003','reviewer@upperlineco.com');"
$jobs=1..2|ForEach-Object{Start-Job -ScriptBlock{param($exe,$url,$statement)&$exe -X -v ON_ERROR_STOP=1 -q -d $url -c $statement;if($LASTEXITCODE-ne 0){throw 'concurrent bridge failed'}} -ArgumentList $psql,$DatabaseUrl,$sql}
$jobs|Wait-Job|Receive-Job;$jobs|Remove-Job
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "do `$`$ begin if(select count(*) from public.intelligence_artifacts where sha256_digest=repeat('b',64))<>1 then raise exception 'concurrent global duplication';end if;if(select count(*) from public.intelligence_artifact_acquisitions where legacy_opportunity_artifact_id='93000000-0000-4000-8000-000000000003')<>1 then raise exception 'concurrent acquisition duplication';end if;end `$`$;"
if($LASTEXITCODE-ne 0){throw 'concurrency assertion failed'}
Write-Host 'Property Intelligence artifact bridge integration passed.'
