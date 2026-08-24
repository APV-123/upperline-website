param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'; if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl; if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
function StartSql([string]$sql){$i=[Diagnostics.ProcessStartInfo]::new($psql);$i.UseShellExecute=$false;$i.CreateNoWindow=$true;$i.RedirectStandardError=$true;$i.RedirectStandardOutput=$true;foreach($a in @('-X','-v','ON_ERROR_STOP=1','-d',$DatabaseUrl,'-c',$sql)){[void]$i.ArgumentList.Add($a)};[Diagnostics.Process]::Start($i)}
$call="set role service_role; select * from public.record_opportunity_candidate_fact_decision('a0000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000005','approved',0,'race@upperlineco.com');"
$first=StartSql "begin;$call select pg_sleep(1);commit;"; Start-Sleep -Milliseconds 150; $second=StartSql "begin;$call commit;"
foreach($process in @($first,$second)){$process.WaitForExit();$errorText=$process.StandardError.ReadToEnd();if($process.ExitCode-ne 0){throw "Concurrent first decision failed: $errorText"}}
$count=& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -Atc "select count(*) from public.opportunity_candidate_fact_decisions where candidate_fact_id='a4000000-0000-4000-8000-000000000005'"
if($LASTEXITCODE-ne 0-or$count.Trim()-ne'1'){throw 'Concurrent same-state first writes did not produce exactly one history row'}
Write-Host 'Opportunity candidate decision concurrency test passed.'
