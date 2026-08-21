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
  foreach ($argument in @('-X','-v','ON_ERROR_STOP=1','-d',$DatabaseUrl,'-c',$Sql)) {
    [void]$info.ArgumentList.Add($argument)
  }
  return [System.Diagnostics.Process]::Start($info)
}

function Wait-Success([string]$Name, [System.Diagnostics.Process[]]$Processes) {
  foreach ($process in $Processes) {
    $process.WaitForExit()
    $stderr = $process.StandardError.ReadToEnd()
    if ($process.ExitCode -ne 0) { throw "$Name failed: $stderr" }
  }
  Write-Host "$Name passed."
}

function Invoke-Scalar([string]$Sql) {
  $result = & $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc $Sql
  if ($LASTEXITCODE -ne 0) { throw "Scalar query failed: $Sql" }
  return $result.Trim()
}

$payload = "jsonb_build_object('schemaVersion','retail-development-persistence-v1','engineInput',jsonb_build_object())"
$setup = @"
insert into public.acquisition_opportunities (id,name,created_by_email,updated_by_email) values
('91000000-0000-0000-0000-000000000001','Allocate race','test@upperlineco.com','test@upperlineco.com'),
('91000000-0000-0000-0000-000000000002','Active race','test@upperlineco.com','test@upperlineco.com'),
('91000000-0000-0000-0000-000000000003','Provenance race','test@upperlineco.com','test@upperlineco.com'),
('91000000-0000-0000-0000-000000000004','Clone race','test@upperlineco.com','test@upperlineco.com'),
('91000000-0000-0000-0000-000000000005','Finalize race','test@upperlineco.com','test@upperlineco.com');
"@
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $setup
if ($LASTEXITCODE -ne 0) { throw 'RPC concurrency fixture setup failed.' }

$allocateSql = "set role service_role; select * from public.create_opportunity_underwriting_draft('91000000-0000-0000-0000-000000000001',$payload,'{}','race@upperlineco.com',false);"
$first = Start-Psql "begin; $allocateSql select pg_sleep(1); commit;"
Start-Sleep -Milliseconds 150
$second = Start-Psql "begin; $allocateSql commit;"
Wait-Success 'concurrent version allocation' @($first,$second)
if ((Invoke-Scalar "select string_agg(version_number::text,',' order by version_number) from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000001'") -ne '1,2') {
  throw 'Concurrent allocation did not produce versions 1 and 2.'
}

& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c @"
set role service_role;
select * from public.create_opportunity_underwriting_draft('91000000-0000-0000-0000-000000000002',$payload,'{}','race@upperlineco.com',false);
select * from public.create_opportunity_underwriting_draft('91000000-0000-0000-0000-000000000002',$payload,'{}','race@upperlineco.com',false);
"@
if ($LASTEXITCODE -ne 0) { throw 'Active race version setup failed.' }
$activeIds = @(& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc "select id from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000002' order by version_number")
$activeA = Start-Psql "begin; set role service_role; select * from public.set_active_opportunity_underwriting('91000000-0000-0000-0000-000000000002','$($activeIds[0])',1,'race@upperlineco.com'); select pg_sleep(1); commit;"
Start-Sleep -Milliseconds 150
$activeB = Start-Psql "begin; set role service_role; select * from public.set_active_opportunity_underwriting('91000000-0000-0000-0000-000000000002','$($activeIds[1])',1,'race@upperlineco.com'); commit;"
Wait-Success 'concurrent active switching' @($activeA,$activeB)
if ((Invoke-Scalar "select count(*) from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000002' and is_active") -ne '1') {
  throw 'Concurrent active switching did not leave exactly one active version.'
}

$replaceA = Start-Psql "begin; set role service_role; select * from public.replace_opportunity_field_provenance('91000000-0000-0000-0000-000000000003','opportunity','asking_price','manual','race@upperlineco.com',p_original_value=>'1'::jsonb); select pg_sleep(1); commit;"
Start-Sleep -Milliseconds 150
$replaceB = Start-Psql "begin; set role service_role; select * from public.replace_opportunity_field_provenance('91000000-0000-0000-0000-000000000003','opportunity','asking_price','api','race@upperlineco.com',p_original_value=>'2'::jsonb); commit;"
Wait-Success 'concurrent provenance replacement' @($replaceA,$replaceB)
if ((Invoke-Scalar "select count(*) from public.opportunity_field_provenance where opportunity_id='91000000-0000-0000-0000-000000000003' and field_path='asking_price'") -ne '2' -or
    (Invoke-Scalar "select count(*) from public.opportunity_field_provenance where opportunity_id='91000000-0000-0000-0000-000000000003' and field_path='asking_price' and superseded_at is null") -ne '1' -or
    (Invoke-Scalar "select count(*) from public.opportunity_field_provenance where opportunity_id='91000000-0000-0000-0000-000000000003' and field_path='asking_price' and supersedes_provenance_id is not null") -ne '1') {
  throw 'Concurrent provenance replacement lost history or current uniqueness.'
}

& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c @"
set role service_role;
select * from public.create_opportunity_underwriting_draft('91000000-0000-0000-0000-000000000004',$payload,'{}','race@upperlineco.com',false);
"@
if ($LASTEXITCODE -ne 0) { throw 'Clone race source setup failed.' }
$cloneSource = Invoke-Scalar "select id from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000004'"
$cloneA = Start-Psql "begin; set role service_role; select * from public.clone_opportunity_underwriting_version('$cloneSource',1,'race@upperlineco.com'); select pg_sleep(1); commit;"
Start-Sleep -Milliseconds 150
$cloneB = Start-Psql "begin; set role service_role; select * from public.clone_opportunity_underwriting_version('$cloneSource',1,'race@upperlineco.com'); commit;"
Wait-Success 'concurrent clone' @($cloneA,$cloneB)
if ((Invoke-Scalar "select string_agg(version_number::text,',' order by version_number) from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000004'") -ne '1,2,3' -or
    (Invoke-Scalar "select count(*) from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000004' and is_active") -ne '1') {
  throw 'Concurrent clones did not preserve allocation and active invariants.'
}

& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c @"
set role service_role;
select * from public.create_opportunity_underwriting_draft('91000000-0000-0000-0000-000000000005',$payload,'{}','race@upperlineco.com',false);
select * from public.replace_opportunity_field_provenance('91000000-0000-0000-0000-000000000005','underwriting','site.landAreaSf','manual','race@upperlineco.com',p_underwriting_version_id=>(select id from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000005'));
"@
if ($LASTEXITCODE -ne 0) { throw 'Finalization race setup failed.' }
$finalVersion = Invoke-Scalar "select id from public.opportunity_underwriting_versions where opportunity_id='91000000-0000-0000-0000-000000000005'"
$replaceFirst = Start-Psql "begin; set role service_role; select * from public.replace_opportunity_field_provenance('91000000-0000-0000-0000-000000000005','underwriting','site.landAreaSf','manual_override','race@upperlineco.com',p_underwriting_version_id=>'$finalVersion'); select pg_sleep(1); commit;"
Start-Sleep -Milliseconds 150
$finalizeSecond = Start-Psql "begin; update public.opportunity_underwriting_versions set result_payload='{}',calculation_version='v1',input_hash='hash',calculated_at=now(),finalized_at=now(),is_complete=true,status='final',revision=revision+1 where id='$finalVersion' and revision=1 and status='draft'; commit;"
$replaceFirst.WaitForExit(); $finalizeSecond.WaitForExit()
if ($replaceFirst.ExitCode -ne 0 -or $finalizeSecond.ExitCode -eq 0 -or $finalizeSecond.StandardError.ReadToEnd() -notmatch 'Cannot finalize underwriting') {
  throw 'Provenance-before-finalization race did not fail safely.'
}
if ((Invoke-Scalar "select status from public.opportunity_underwriting_versions where id='$finalVersion'") -ne 'draft') {
  throw 'Failed finalization race changed committed status.'
}
Write-Host 'finalization interaction passed.'

Write-Host 'Opportunity RPC concurrency tests passed.'
