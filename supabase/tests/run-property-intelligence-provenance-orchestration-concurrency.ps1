param([string]$DatabaseUrl=$env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl
if($uri.Host-notin@('127.0.0.1','localhost','::1')-or$DatabaseUrl-match'(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe';if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path(Join-Path $PSScriptRoot '..\..')).Path
function Run([string]$file){&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -f $file;if($LASTEXITCODE-ne 0){throw "psql failed: $file"}}
function StartSql([string]$sql){$info=[Diagnostics.ProcessStartInfo]::new($psql);$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardError=$true;$info.RedirectStandardOutput=$true;$info.Arguments="-X -v ON_ERROR_STOP=1 -d `"$DatabaseUrl`" -c `"$sql`"";[Diagnostics.Process]::Start($info)}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'run-property-intelligence-provenance-resolution-integration.ps1') -DatabaseUrl $DatabaseUrl
if($LASTEXITCODE-ne 0){throw 'B.1 integration fixture failed'}
Run(Join-Path $root 'supabase/migrations/20260828000100_create_property_intelligence_provenance_orchestration.sql')
Run(Join-Path $PSScriptRoot 'property-intelligence-provenance-orchestration-concurrency-fixture.sql')

function RaceDecision([string]$name,[string]$proposalA,[string]$proposalB,[string]$commandA,[string]$commandB){
  $sqlA="select * from public.decide_intelligence_provenance_proposal_v1('$commandA','$name-a','$proposalA','confirm',0,'one@upperlineco.com',null);"
  $sqlB="select * from public.decide_intelligence_provenance_proposal_v1('$commandB','$name-b','$proposalB','confirm',0,'two@upperlineco.com',null);"
  $a=StartSql $sqlA;$b=StartSql $sqlB;$a.WaitForExit();$b.WaitForExit()
  $successes=(@($a.ExitCode,$b.ExitCode)|Where-Object{$_-eq 0}).Count
  if($successes-ne 1){throw "$name expected one winner; exits $($a.ExitCode),$($b.ExitCode); errors $($a.StandardError.ReadToEnd()) $($b.StandardError.ReadToEnd())"}
  Write-Host "$name PASS - exactly one competing authority committed."
}

function RaceReplay([string]$proposal){
  $sql="select * from public.decide_intelligence_provenance_proposal_v1('95000000-0000-4000-8000-000000000003','b2-identical-decision','$proposal','confirm',0,'one@upperlineco.com',null);"
  $a=StartSql $sql;$b=StartSql $sql;$a.WaitForExit();$b.WaitForExit()
  if($a.ExitCode-ne 0-or$b.ExitCode-ne 0){throw "B2 identical replay expected two recovered responses; exits $($a.ExitCode),$($b.ExitCode)"}
  $count=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_decisions where proposal_id='$proposal'").Trim()
  if($count-ne'1'){throw "B2 identical replay persisted $count decisions"}
  Write-Host 'B2 RACE 02 identical command replay PASS - two callers recovered one decision.'
}

RaceDecision 'B2 RACE 01 source authority' (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000001'").Trim() (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000002'").Trim() '95000000-0000-4000-8000-000000000001' '95000000-0000-4000-8000-000000000002'
RaceReplay (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000003'").Trim()

$sourceCount=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_decisions d join public.intelligence_provenance_resolution_proposals p on p.id=d.proposal_id where p.artifact_acquisition_id='82000000-0000-4000-8000-000000000004' and p.proposal_kind='source_identity'").Trim()
if($sourceCount-ne'1'){throw "Unexpected source authority count: $sourceCount"}
Write-Host 'Property intelligence provenance orchestration concurrency passed.'
