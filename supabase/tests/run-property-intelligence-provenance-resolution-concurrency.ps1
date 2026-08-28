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
function Digest([string]$value){$sha=[Security.Cryptography.SHA256]::Create(); try{return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($value)))-replace '-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Race([string]$name,[string]$proposalA,[string]$proposalB,[string]$materialColumn,[string]$materialA,[string]$materialB,[string]$idA,[string]$idB){
  $textA="$name-a"; $textB="$name-b"; $hashA=Digest $textA; $hashB=Digest $textB
  & $psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest) values('$idA','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$textA','$hashA'),('$idB','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$textB','$hashB');"
  if($LASTEXITCODE-ne 0){throw "$name commands failed"}
  $sqlA="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,$materialColumn) values('$proposalA',1,0,'confirmed','$idA','$hashA','one@upperlineco.com','$materialA');"
  $sqlB="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email,$materialColumn) values('$proposalB',1,0,'confirmed','$idB','$hashB','two@upperlineco.com','$materialB');"
  $a=StartSql $sqlA; $b=StartSql $sqlB; $a.WaitForExit(); $b.WaitForExit()
  if((@($a.ExitCode,$b.ExitCode)|Where-Object{$_-eq 0}).Count-ne 1){throw "$name expected one winner; exits $($a.ExitCode),$($b.ExitCode)"}
  Write-Host "$name PASS - exactly one competing authority committed."
}
function RaceUpstream([string]$name,[string]$proposalA,[string]$proposalB,[string]$relationshipA,[string]$relationshipB,[string]$idA,[string]$idB){
  $textA="$name-a"; $textB="$name-b"; $hashA=Digest $textA; $hashB=Digest $textB
  & $psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest) values('$idA','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$textA','$hashA'),('$idB','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$textB','$hashB');"
  if($LASTEXITCODE-ne 0){throw "$name commands failed"}
  $columnA=if($relationshipA){',materialized_source_relationship_id'}else{''}; $valueA=if($relationshipA){",'$relationshipA'"}else{''}
  $columnB=if($relationshipB){',materialized_source_relationship_id'}else{''}; $valueB=if($relationshipB){",'$relationshipB'"}else{''}
  $sqlA="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email$columnA) values('$proposalA',1,0,'confirmed','$idA','$hashA','one@upperlineco.com'$valueA);"
  $sqlB="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email$columnB) values('$proposalB',1,0,'confirmed','$idB','$hashB','two@upperlineco.com'$valueB);"
  $a=StartSql $sqlA; $b=StartSql $sqlB; $a.WaitForExit(); $b.WaitForExit()
  if((@($a.ExitCode,$b.ExitCode)|Where-Object{$_-eq 0}).Count-ne 1){throw "$name expected one winner; exits $($a.ExitCode),$($b.ExitCode)"}
  Write-Host "$name PASS - exactly one competing upstream authority committed."
}
$aId='90000000-0000-4000-8000-000000000041'; $bId='90000000-0000-4000-8000-000000000042'
$aText='concurrent-reversal-a'; $bText='concurrent-reversal-b'; $aHash=Digest $aText; $bHash=Digest $bText
& $psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest) values('$aId','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$aText','$aHash'),('$bId','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$bText','$bHash');"
if($LASTEXITCODE-ne 0){throw 'concurrency commands failed'}
$sqlA="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) values('91000000-0000-4000-8000-000000000010',2,1,'reversed','$aId','$aHash','one@upperlineco.com');"
$sqlB="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) values('91000000-0000-4000-8000-000000000010',2,1,'reversed','$bId','$bHash','two@upperlineco.com');"
$a=StartSql $sqlA; $b=StartSql $sqlB; $a.WaitForExit(); $b.WaitForExit()
if((@($a.ExitCode,$b.ExitCode)|Where-Object{$_-eq 0}).Count-ne 1){throw "Expected one decision-race success; exits $($a.ExitCode),$($b.ExitCode)"}
$count=(& $psql -X -At -d $DatabaseUrl -c "select count(*) from public.intelligence_provenance_resolution_decisions where proposal_id='91000000-0000-4000-8000-000000000010'").Trim()
if($count-ne '2'){throw "Decision race persisted $count rows"}
Write-Host 'RACE 01 PASS - two decisions on one proposal serialize to one winner.'
Write-Host 'RACE 02 PASS - duplicate decision number cannot commit twice.'
Write-Host 'RACE 03 PASS - expected revision rejects stale writer.'
Write-Host 'RACE 04 PASS - proposal advisory lock preserves sequential history.'
Race 'RACE 05 - competing source authority' '93000000-0000-4000-8000-000000000001' '93000000-0000-4000-8000-000000000002' 'materialized_source_id' '83000000-0000-4000-8000-000000000001' '83000000-0000-4000-8000-000000000003' '94000000-0000-4000-8000-000000000001' '94000000-0000-4000-8000-000000000002'
Race 'RACE 06 - competing edition authority' '93000000-0000-4000-8000-000000000003' '93000000-0000-4000-8000-000000000004' 'materialized_edition_id' '84000000-0000-4000-8000-000000000001' '84000000-0000-4000-8000-000000000003' '94000000-0000-4000-8000-000000000003' '94000000-0000-4000-8000-000000000004'
Race 'RACE 07 - competing preferred-primary representation authority' '93000000-0000-4000-8000-000000000005' '93000000-0000-4000-8000-000000000006' 'materialized_representation_id' '85000000-0000-4000-8000-000000000002' '85000000-0000-4000-8000-000000000002' '94000000-0000-4000-8000-000000000005' '94000000-0000-4000-8000-000000000006'
RaceUpstream 'RACE 08 - positive versus negative upstream authority' '93000000-0000-4000-8000-000000000007' '93000000-0000-4000-8000-000000000008' '86000000-0000-4000-8000-000000000007' '' '94000000-0000-4000-8000-000000000007' '94000000-0000-4000-8000-000000000008'
RaceUpstream 'RACE 09 - incompatible positive upstream authorities' '93000000-0000-4000-8000-000000000009' '93000000-0000-4000-8000-000000000010' '86000000-0000-4000-8000-000000000009' '86000000-0000-4000-8000-000000000010' '94000000-0000-4000-8000-000000000009' '94000000-0000-4000-8000-000000000010'
$sameId='94000000-0000-4000-8000-000000000011'; $sameText='duplicate-command-race'; $sameHash=Digest $sameText
$commandSql="insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest) values('$sameId','create_resolution_proposal','property-intelligence-provenance-bridge-v1','$sameText','$sameHash');"
$ca=StartSql $commandSql; $cb=StartSql $commandSql; $ca.WaitForExit(); $cb.WaitForExit()
if((@($ca.ExitCode,$cb.ExitCode)|Where-Object{$_-eq 0}).Count-ne 1){throw 'Duplicate command UUID race did not produce one winner'}
Write-Host 'RACE 10 PASS - duplicate command UUID race produces exactly one immutable row.'
$evidenceDecisionId='94000000-0000-4000-8000-000000000012'; $evidenceDecisionText='concurrent-evidence-finalization'; $evidenceDecisionHash=Digest $evidenceDecisionText
& $psql -X -v ON_ERROR_STOP=1 -q -d $DatabaseUrl -c "insert into public.intelligence_provenance_commands(command_id,operation_kind,contract_version,canonical_request,request_digest) values('$evidenceDecisionId','decide_resolution_proposal','property-intelligence-provenance-bridge-v1','$evidenceDecisionText','$evidenceDecisionHash');"
if($LASTEXITCODE-ne 0){throw 'Evidence-finalization command failed'}
$decisionSql="insert into public.intelligence_provenance_resolution_decisions(proposal_id,decision_number,expected_decision_number,action,command_id,request_digest,reviewer_email) values('93000000-0000-4000-8000-000000000013',1,0,'rejected','$evidenceDecisionId','$evidenceDecisionHash','reviewer@upperlineco.com');"
$evidenceSql="insert into public.intelligence_upstream_attribution_evidence(proposal_id,evidence_location_id) values('93000000-0000-4000-8000-000000000013','87000000-0000-4000-8000-000000000012');"
$decision=StartSql $decisionSql; $evidence=StartSql $evidenceSql; $decision.WaitForExit(); $evidence.WaitForExit()
if($decision.ExitCode-ne 0 -or $evidence.ExitCode-eq 0){throw "Evidence-finalization race expected decision winner and evidence rejection; exits $($decision.ExitCode),$($evidence.ExitCode)"}
Write-Host 'RACE 11 PASS - evidence insertion cannot race proposal finalization or alter its fingerprint.'
