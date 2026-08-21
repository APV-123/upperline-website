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

function Start-Psql([string]$Sql) {
  $info = [System.Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $psql
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  foreach ($argument in @('-X', '-v', 'ON_ERROR_STOP=1', '-d', $DatabaseUrl, '-c', $Sql)) {
    [void]$info.ArgumentList.Add($argument)
  }
  return [System.Diagnostics.Process]::Start($info)
}

function Assert-ConcurrentUnique([string]$Name, [string]$FirstInsert, [string]$SecondInsert) {
  $holder = Start-Psql "begin; $FirstInsert; select pg_sleep(1); commit;"
  Start-Sleep -Milliseconds 150
  $contender = Start-Psql "begin; $SecondInsert; commit;"
  $holder.WaitForExit()
  $contender.WaitForExit()
  $holderError = $holder.StandardError.ReadToEnd()
  $contenderError = $contender.StandardError.ReadToEnd()
  if ($holder.ExitCode -ne 0) { throw "$Name holder failed: $holderError" }
  if ($contender.ExitCode -eq 0 -or $contenderError -notmatch 'duplicate key') {
    throw "$Name contender did not fail with unique violation: $contenderError"
  }
  Write-Host "$Name concurrent uniqueness passed."
}

function Assert-ConcurrentConflict(
  [string]$Name,
  [string]$HolderSql,
  [string]$ContenderSql,
  [string]$ExpectedError
) {
  $holder = Start-Psql "begin; $HolderSql; select pg_sleep(1); commit;"
  Start-Sleep -Milliseconds 150
  $contender = Start-Psql "begin; $ContenderSql; commit;"
  $holder.WaitForExit()
  $contender.WaitForExit()
  $holderError = $holder.StandardError.ReadToEnd()
  $contenderError = $contender.StandardError.ReadToEnd()
  if ($holder.ExitCode -ne 0) { throw "$Name holder failed: $holderError" }
  if ($contender.ExitCode -eq 0 -or $contenderError -notmatch $ExpectedError) {
    throw "$Name contender did not fail as required: $contenderError"
  }
  Write-Host "$Name serialization passed."
}

$setup = @"
delete from public.acquisition_opportunities
where id in ('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003');
insert into public.acquisition_opportunities (id,name,created_by_email,updated_by_email) values
('70000000-0000-0000-0000-000000000001','Concurrent source','test@upperlineco.com','test@upperlineco.com'),
('70000000-0000-0000-0000-000000000002','Concurrent active','test@upperlineco.com','test@upperlineco.com'),
('70000000-0000-0000-0000-000000000003','Concurrent provenance','test@upperlineco.com','test@upperlineco.com');
"@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $setup
if ($LASTEXITCODE -ne 0) { throw 'Concurrency fixture setup failed.' }

Assert-ConcurrentUnique 'primary source' `
  "insert into public.opportunity_sources (opportunity_id,source_type,is_primary,created_by_email,updated_by_email) values ('70000000-0000-0000-0000-000000000001','manual',true,'test@upperlineco.com','test@upperlineco.com')" `
  "insert into public.opportunity_sources (opportunity_id,source_type,is_primary,created_by_email,updated_by_email) values ('70000000-0000-0000-0000-000000000001','listing',true,'test@upperlineco.com','test@upperlineco.com')"

Assert-ConcurrentUnique 'active underwriting' `
  "insert into public.opportunity_underwriting_versions (opportunity_id,underwriting_type,version_number,is_active,input_payload,calculation_policy,created_by_email,updated_by_email) values ('70000000-0000-0000-0000-000000000002','retail_development',1,true,jsonb_build_object('schemaVersion','retail-development-persistence-v1','engineInput',jsonb_build_object()),jsonb_build_object(),'test@upperlineco.com','test@upperlineco.com')" `
  "insert into public.opportunity_underwriting_versions (opportunity_id,underwriting_type,version_number,is_active,input_payload,calculation_policy,created_by_email,updated_by_email) values ('70000000-0000-0000-0000-000000000002','retail_development',2,true,jsonb_build_object('schemaVersion','retail-development-persistence-v1','engineInput',jsonb_build_object()),jsonb_build_object(),'test@upperlineco.com','test@upperlineco.com')"

Assert-ConcurrentUnique 'current provenance' `
  "insert into public.opportunity_field_provenance (opportunity_id,scope,field_path,provenance_type,created_by_email) values ('70000000-0000-0000-0000-000000000003','opportunity','asking_price','manual','test@upperlineco.com')" `
  "insert into public.opportunity_field_provenance (opportunity_id,scope,field_path,provenance_type,created_by_email) values ('70000000-0000-0000-0000-000000000003','opportunity','asking_price','api','test@upperlineco.com')"

$raceSetup = @"
insert into public.acquisition_opportunities (id,name,created_by_email,updated_by_email) values
('70000000-0000-0000-0000-000000000004','Supersession first','test@upperlineco.com','test@upperlineco.com'),
('70000000-0000-0000-0000-000000000005','Finalization first','test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_underwriting_versions
  (id,opportunity_id,underwriting_type,version_number,input_payload,result_payload,
   calculation_policy,calculation_version,input_hash,calculated_at,finalized_at,is_complete,
   created_by_email,updated_by_email) values
('71000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000004','retail_development',1,
 jsonb_build_object('schemaVersion','retail-development-persistence-v1','engineInput',jsonb_build_object()),
 jsonb_build_object(),jsonb_build_object(),'v1','hash-4',now(),now(),true,'test@upperlineco.com','test@upperlineco.com'),
('71000000-0000-0000-0000-000000000005','70000000-0000-0000-0000-000000000005','retail_development',1,
 jsonb_build_object('schemaVersion','retail-development-persistence-v1','engineInput',jsonb_build_object()),
 jsonb_build_object(),jsonb_build_object(),'v1','hash-5',now(),now(),true,'test@upperlineco.com','test@upperlineco.com');
insert into public.opportunity_field_provenance
  (id,opportunity_id,underwriting_version_id,scope,field_path,provenance_type,created_by_email) values
('72000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','underwriting','site.landAreaSf','manual','test@upperlineco.com'),
('72000000-0000-0000-0000-000000000005','70000000-0000-0000-0000-000000000005','71000000-0000-0000-0000-000000000005','underwriting','site.landAreaSf','manual','test@upperlineco.com');
"@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $raceSetup
if ($LASTEXITCODE -ne 0) { throw 'Supersession race fixture setup failed.' }

Assert-ConcurrentConflict 'supersession before finalization' `
  "update public.opportunity_field_provenance set superseded_at=now() where id='72000000-0000-0000-0000-000000000004'; insert into public.opportunity_field_provenance (opportunity_id,underwriting_version_id,scope,field_path,provenance_type,supersedes_provenance_id,created_by_email) values ('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','underwriting','site.landAreaSf','manual_override','72000000-0000-0000-0000-000000000004','test@upperlineco.com')" `
  "update public.opportunity_underwriting_versions set status='final' where id='71000000-0000-0000-0000-000000000004'" `
  'Cannot finalize underwriting'

Assert-ConcurrentConflict 'finalization before supersession' `
  "update public.opportunity_underwriting_versions set status='final' where id='71000000-0000-0000-0000-000000000005'" `
  "insert into public.opportunity_field_provenance (opportunity_id,underwriting_version_id,scope,field_path,provenance_type,supersedes_provenance_id,created_by_email) values ('70000000-0000-0000-0000-000000000005','71000000-0000-0000-0000-000000000005','underwriting','site.landAreaSf.override','manual_override','72000000-0000-0000-0000-000000000005','test@upperlineco.com')" `
  'cannot be superseded'

$violationCount = & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc @"
select count(*)
from public.opportunity_field_provenance successor
join public.opportunity_field_provenance original
  on original.id=successor.supersedes_provenance_id
 and original.opportunity_id=successor.opportunity_id
join public.opportunity_underwriting_versions version
  on version.id=original.underwriting_version_id
 and version.opportunity_id=original.opportunity_id
where version.status='final';
"@
if ($LASTEXITCODE -ne 0 -or $violationCount.Trim() -ne '0') {
  throw "Committed-state final provenance supersession violations: $violationCount"
}
Write-Host 'Committed-state final provenance supersession invariant passed.'
