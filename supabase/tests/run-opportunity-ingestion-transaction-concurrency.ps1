param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'; if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl; if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
function StartSql([string]$sql){$i=[Diagnostics.ProcessStartInfo]::new($psql);$i.UseShellExecute=$false;$i.RedirectStandardError=$true;$i.RedirectStandardOutput=$true;foreach($a in @('-X','-v','ON_ERROR_STOP=1','-d',$DatabaseUrl,'-c',$sql)){[void]$i.ArgumentList.Add($a)};[Diagnostics.Process]::Start($i)}
function Pair([string]$name,[string]$a,[string]$b,[int[]]$expected){$p=StartSql $a;$q=StartSql $b;$p.WaitForExit();$q.WaitForExit();$codes=@($p.ExitCode,$q.ExitCode)|Sort-Object;if(($codes-join ',')-ne (($expected|Sort-Object)-join ',')){throw "$name failed: p=$($p.StandardError.ReadToEnd()) q=$($q.StandardError.ReadToEnd())"};Write-Host "$name passed"}
function Sql([string]$sql){& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $sql; if($LASTEXITCODE-ne 0){throw 'fixture SQL failed'}}

Sql "insert into public.opportunity_ingestions(id,entry_type,requested_by_email) values('91000000-0000-4000-8000-000000000010','pdf','test')"
$finalize="select * from public.finalize_opportunity_verified_artifact('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','private','race.pdf','race.pdf','application/pdf','application/pdf',1,repeat('c',64),1,'{}','test')"
Pair 'simultaneous artifact finalization' $finalize $finalize @(0,0)

$allocSame="select * from public.allocate_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000010','same-key','pdf','1',null,null,'p','q','s',repeat('c',64),'test')"
Pair 'same-key allocation race' $allocSame $allocSame @(0,0)
Sql "select * from public.complete_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000010','[]','[]')"

$allocA="select * from public.allocate_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000011','attempt-a','pdf','1',null,null,'p','q','s',repeat('c',64),'test')"
$allocB="select * from public.allocate_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000012','attempt-b','pdf','1',null,null,'p','q','s',repeat('c',64),'test')"
Pair 'different-attempt allocation race' $allocA $allocB @(0,1)
$run=(& $psql -X -At -d $DatabaseUrl -c "select id from public.opportunity_extraction_runs where id in('93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000012')").Trim()
$complete="select * from public.complete_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','$run','[]','[]')"
$fail="select * from public.fail_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','$run','PARSER_FAILED','Parser failed safely.','[]')"
Pair 'completion versus failure race' $complete $fail @(0,1)

Sql "select * from public.allocate_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000013','completion-race','pdf','1',null,null,'p','q','s',repeat('c',64),'test')"
$complete2="select * from public.complete_opportunity_extraction_run('91000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000013','[]','[]')"
Pair 'simultaneous completion race' $complete2 $complete2 @(0,1)
Write-Host 'Opportunity ingestion transaction concurrency tests passed.'
