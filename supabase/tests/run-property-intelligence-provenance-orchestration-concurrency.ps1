param(
  [string]$DatabaseUrl=$env:OPPORTUNITY_TEST_DATABASE_URL,
  [ValidateSet('all','correction-reversal','lock-release')][string]$Case='all'
)
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
Run(Join-Path $root 'supabase/migrations/20260828000200_harden_property_intelligence_provenance_privileges.sql')
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

if($Case-eq'all'){
  RaceDecision 'B2 RACE 01 source authority' (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000001'").Trim() (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000002'").Trim() '95000000-0000-4000-8000-000000000001' '95000000-0000-4000-8000-000000000002'
  RaceReplay (&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='96000000-0000-4000-8000-000000000003'").Trim()
}

&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.intelligence_artifacts(id,sha256_digest,byte_size,detected_media_type) values('81000000-0000-4000-8000-000000000006',repeat('6',64),600,'application/pdf'),('81000000-0000-4000-8000-000000000007',repeat('7',64),700,'application/pdf');insert into public.intelligence_artifact_acquisitions(id,artifact_id,acquisition_channel,access_class,external_locator,acquired_by_email) values('82000000-0000-4000-8000-000000000006','81000000-0000-4000-8000-000000000006','manual_reference','private','fixture:correction-race','fixture@upperlineco.com'),('82000000-0000-4000-8000-000000000007','81000000-0000-4000-8000-000000000007','manual_reference','private','fixture:lock-release','fixture@upperlineco.com');"
$basePayloadSql="jsonb_build_object('resolutionMode','select_existing','existingSourceId','83000000-0000-4000-8000-000000000001','publisherId',null,'candidateTitle','Containing source','candidateSourceKind','offering_memorandum','candidateExternalIdentifier',null,'publisherEvidence','preauthorized_identity','matchTitle',true,'matchFilename',false,'matchProperty',true,'matchPublisher',true,'matchUploader',false)"
$baseFingerprint=(&$psql -X -At -d $DatabaseUrl -c "select encode(extensions.digest(convert_to('source_identity|select_existing|83000000-0000-4000-8000-000000000001|null|436f6e7461696e696e6720736f75726365|offering_memorandum|null|preauthorized_identity|true|false|true|true|false','UTF8'),'sha256'),'hex')").Trim()

if($Case-in@('all','correction-reversal')){
# B2 RACE 03: correction creation and reversal serialize on the same
# acquisition/kind then proposal advisory-lock hierarchy. Reversal must commit;
# correction may commit only after it can observe the reversed authority.
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "select * from public.create_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000001','correction-race-base','82000000-0000-4000-8000-000000000006','source_identity','human_review',null,'$baseFingerprint','reviewer@upperlineco.com',$basePayloadSql);"
$baseProposal=(&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='97000000-0000-4000-8000-000000000001'").Trim()
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "select * from public.decide_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000002','correction-race-confirm','$baseProposal','confirm',0,'reviewer@upperlineco.com',null);"
$reverseSql="select * from public.decide_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000003','correction-race-reverse','$baseProposal','reverse',1,'reviewer@upperlineco.com','Correction race');"
$correctionSql="select * from public.create_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000004','correction-race-create','82000000-0000-4000-8000-000000000006','source_identity','human_review','$baseProposal','$baseFingerprint','reviewer@upperlineco.com',$basePayloadSql);"
$reverse=StartSql $reverseSql;$correction=StartSql $correctionSql;$reverse.WaitForExit();$correction.WaitForExit()
if($reverse.ExitCode-ne 0){throw "B2 RACE 03 reversal must commit: $($reverse.StandardError.ReadToEnd())"}
$current=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_proposals p where p.artifact_acquisition_id='82000000-0000-4000-8000-000000000006' and p.proposal_kind='source_identity' and public.intelligence_provenance_current_state_v1(p.id)='confirmed'").Trim()
$history=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_decisions where proposal_id='$baseProposal'").Trim()
if($current-ne'0'-or$history-ne'2'){throw "B2 RACE 03 unsafe state: current=$current history=$history"}
if($correction.ExitCode-eq 0){$correctionState=(&$psql -X -At -d $DatabaseUrl -c "select public.intelligence_provenance_current_state_v1(id) from public.intelligence_provenance_resolution_proposals where creation_command_id='97000000-0000-4000-8000-000000000004'").Trim();if($correctionState-ne'proposed'){throw "B2 RACE 03 correction state $correctionState"}}
elseif((&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_commands where command_id='97000000-0000-4000-8000-000000000004'").Trim()-ne'0'){throw 'B2 RACE 03 failed correction leaked command state'}
Write-Host 'B2 RACE 03 correction versus reversal PASS - no timing-dependent current authority or partial history.'
}

if($Case-in@('all','lock-release')){
# B2 RACE 04: a stale decision fails after the actual advisory-lock path; a new
# connection can immediately acquire the same logical locks and commit.
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "select * from public.create_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000005','lock-release-base','82000000-0000-4000-8000-000000000007','source_identity','human_review',null,'$baseFingerprint','reviewer@upperlineco.com',$basePayloadSql);"
$releaseProposal=(&$psql -X -At -d $DatabaseUrl -c "select id from public.intelligence_provenance_resolution_proposals where creation_command_id='97000000-0000-4000-8000-000000000005'").Trim()
&$psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "select * from public.decide_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000006','lock-release-confirm','$releaseProposal','confirm',0,'reviewer@upperlineco.com',null);"
$failed=StartSql "begin;select * from public.decide_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000007','lock-release-stale','$releaseProposal','reverse',0,'reviewer@upperlineco.com','stale');commit;";$failed.WaitForExit()
if($failed.ExitCode-eq 0){throw 'B2 RACE 04 expected stale transaction failure'}
$success=StartSql "select * from public.decide_intelligence_provenance_proposal_v1('97000000-0000-4000-8000-000000000008','lock-release-valid','$releaseProposal','reverse',1,'reviewer@upperlineco.com','valid');";$success.WaitForExit()
if($success.ExitCode-ne 0){throw "B2 RACE 04 successor blocked: $($success.StandardError.ReadToEnd())"}
$advisoryCount=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from pg_locks where locktype='advisory' and pid<>pg_backend_pid()").Trim()
if($advisoryCount-ne'0'){throw "B2 RACE 04 leaked $advisoryCount advisory locks"}
Write-Host 'B2 RACE 04 failed-transaction advisory-lock release PASS - successor acquired locks and no session lock survived.'
}

if($Case-eq'all'){
  $sourceCount=(&$psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_decisions d join public.intelligence_provenance_resolution_proposals p on p.id=d.proposal_id where p.artifact_acquisition_id='82000000-0000-4000-8000-000000000004' and p.proposal_kind='source_identity'").Trim()
  if($sourceCount-ne'1'){throw "Unexpected source authority count: $sourceCount"}
}
Write-Host 'Property intelligence provenance orchestration concurrency passed.'
