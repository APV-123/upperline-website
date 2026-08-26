param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl
if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
function StartSql([string]$sql){
  $info=[Diagnostics.ProcessStartInfo]::new($psql); $info.UseShellExecute=$false; $info.CreateNoWindow=$true
  $info.RedirectStandardError=$true; $info.RedirectStandardOutput=$true
  $info.Arguments="-X -v ON_ERROR_STOP=1 -d `"$DatabaseUrl`" -c `"$sql`""
  [Diagnostics.Process]::Start($info)
}
$id='da000000-0000-4000-8000-000000000099'
$a=StartSql "select * from public.decide_intelligence_observation_admission('$id','admitted',0,'dd000000-0000-4000-8000-000000000001','one@upperlineco.com',null);"
$b=StartSql "select * from public.decide_intelligence_observation_admission('$id','rejected',0,'dd000000-0000-4000-8000-000000000002','two@upperlineco.com',null);"
$a.WaitForExit(); $b.WaitForExit()
if((@($a.ExitCode,$b.ExitCode) | Where-Object {$_ -eq 0}).Count -ne 1){throw "Expected one concurrent success; exits $($a.ExitCode),$($b.ExitCode)"}
$count=(& $psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_observation_admission_decisions where observation_id='$id'").Trim()
if($count-ne '1'){throw "Concurrent first decision count was $count"}
Write-Host 'CASE 46 PASS — concurrent admission serialization preserves one authoritative first decision.'
Write-Host 'Property intelligence observation concurrency tests passed.'
