param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'; if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl; if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Sql([string]$sql){& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -c $sql; if($LASTEXITCODE-ne 0){throw 'fixture SQL failed'}}
function Run([string]$file){& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f $file; if($LASTEXITCODE-ne 0){throw "psql failed: $file"}}
function StartSql([string]$sql){$i=[Diagnostics.ProcessStartInfo]::new($psql);$i.UseShellExecute=$false;$i.RedirectStandardError=$true;$i.RedirectStandardOutput=$true;foreach($a in @('-X','-v','ON_ERROR_STOP=1','-d',$DatabaseUrl,'-c',$sql)){[void]$i.ArgumentList.Add($a)};[Diagnostics.Process]::Start($i)}
function Pair([string]$name,[string]$a,[string]$b,[int[]]$expected){$p=StartSql $a;$q=StartSql $b;$p.WaitForExit();$q.WaitForExit();$codes=@($p.ExitCode,$q.ExitCode)|Sort-Object;if(($codes-join ',')-ne (($expected|Sort-Object)-join ',')){throw "$name failed: p=$($p.StandardError.ReadToEnd()) q=$($q.StandardError.ReadToEnd())"};Write-Host "$name passed"}

Sql 'create extension if not exists pgcrypto; do $$ begin create role anon; exception when duplicate_object then null; end $$; do $$ begin create role authenticated; exception when duplicate_object then null; end $$; do $$ begin create role service_role; exception when duplicate_object then null; end $$; create table public.deals(id uuid primary key default gen_random_uuid());'
Run (Join-Path $root 'supabase/migrations/20260821000100_create_acquisition_opportunities.sql')
Run (Join-Path $root 'supabase/migrations/20260822000100_create_opportunity_ingestion_foundation.sql')
Run (Join-Path $root 'supabase/migrations/20260822000200_create_opportunity_ingestion_transaction_rpcs.sql')
Run (Join-Path $root 'supabase/migrations/20260823000100_amend_land_flyer_extraction_contract.sql')
Run (Join-Path $root 'supabase/migrations/20260823000300_add_extraction_retry_semantics.sql')

Sql "insert into public.opportunity_ingestions(id,entry_type,requested_by_email) values('b1000000-0000-4000-8000-000000000001','pdf','race')"
Sql "select * from public.finalize_opportunity_verified_artifact('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','private','race.pdf','race.pdf','application/pdf','application/pdf',1,repeat('b',64),1,'{}','race')"
Sql "select * from public.allocate_opportunity_extraction_run('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','logical','land','1','p','m','parser','prompt','schema',repeat('b',64),'race')"
Sql "select * from public.fail_opportunity_extraction_run('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','FAILED','Failed safely.','[]')"

$sameA="select * from public.allocate_opportunity_extraction_retry('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002','logical','bb000000-0000-4000-8000-000000000001','land','1','p','m','parser','prompt','schema',repeat('b',64),'race')"
$sameB="select * from public.allocate_opportunity_extraction_retry('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000099','logical','bb000000-0000-4000-8000-000000000001','land','1','p','m','parser','prompt','schema',repeat('b',64),'race')"
Pair 'identical retry-command race' $sameA $sameB @(0,0)
Sql "do `$`$ begin if (select count(*) from public.opportunity_extraction_runs where artifact_id='b2000000-0000-4000-8000-000000000001')<>2 then raise exception 'duplicate attempt 2'; end if; end `$`$"
Sql "select * from public.fail_opportunity_extraction_run('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002','FAILED','Failed safely.','[]')"

$differentA="select * from public.allocate_opportunity_extraction_retry('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000003','logical','bb000000-0000-4000-8000-000000000002','land','1','p','m','parser','prompt','schema',repeat('b',64),'race')"
$differentB="select * from public.allocate_opportunity_extraction_retry('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000004','logical','bb000000-0000-4000-8000-000000000003','land','1','p','m','parser','prompt','schema',repeat('b',64),'race')"
Pair 'different retry-command race' $differentA $differentB @(0,1)
Sql "do `$`$ begin if (select count(*) from public.opportunity_extraction_runs where artifact_id='b2000000-0000-4000-8000-000000000001')<>3 then raise exception 'concurrent attempt 3 duplicated'; end if; end `$`$"

# Ordinary recovery racing an explicit retry may recover attempt 1, but only the explicit command may create attempt 2.
Sql "insert into public.opportunity_ingestions(id,entry_type,requested_by_email) values('c1000000-0000-4000-8000-000000000001','pdf','race')"
Sql "select * from public.finalize_opportunity_verified_artifact('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','private','race.pdf','race.pdf','application/pdf','application/pdf',1,repeat('c',64),1,'{}','race')"
Sql "select * from public.allocate_opportunity_extraction_run('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','logical','land','1','p','m','parser','prompt','schema',repeat('c',64),'race')"
Sql "select * from public.fail_opportunity_extraction_run('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','FAILED','Failed safely.','[]')"
$ordinary="select * from public.allocate_opportunity_extraction_run('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000099','logical','land','1','p','m','parser','prompt','schema',repeat('c',64),'race')"
$explicit="select * from public.allocate_opportunity_extraction_retry('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002','logical','cc000000-0000-4000-8000-000000000001','land','1','p','m','parser','prompt','schema',repeat('c',64),'race')"
Pair 'ordinary allocation versus explicit retry' $ordinary $explicit @(0,0)
Sql "do `$`$ begin if (select count(*) from public.opportunity_extraction_runs where artifact_id='c2000000-0000-4000-8000-000000000001')<>2 then raise exception 'ordinary race created extra attempt'; end if; if (select retry_of_run_id from public.opportunity_extraction_runs where id='c3000000-0000-4000-8000-000000000002')<>'c3000000-0000-4000-8000-000000000001' then raise exception 'ordinary race ancestry wrong'; end if; end `$`$"

# Retry racing failure must either fail before terminalization or allocate exactly one child afterward.
Sql "insert into public.opportunity_ingestions(id,entry_type,requested_by_email) values('d1000000-0000-4000-8000-000000000001','pdf','race')"
Sql "select * from public.finalize_opportunity_verified_artifact('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','private','race.pdf','race.pdf','application/pdf','application/pdf',1,repeat('d',64),1,'{}','race')"
Sql "select * from public.allocate_opportunity_extraction_run('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','logical','land','1','p','m','parser','prompt','schema',repeat('d',64),'race')"
$failure="select * from public.fail_opportunity_extraction_run('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','FAILED','Failed safely.','[]')"
$retryDuringFailure="select * from public.allocate_opportunity_extraction_retry('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000002','logical','dd000000-0000-4000-8000-000000000001','land','1','p','m','parser','prompt','schema',repeat('d',64),'race')"
$p=StartSql $failure;$q=StartSql $retryDuringFailure;$p.WaitForExit();$q.WaitForExit();$codes=@($p.ExitCode,$q.ExitCode)|Sort-Object;if(($codes-join ',') -notin @('0,0','0,1')){throw "retry/failure race failed"};Write-Host 'retry versus failure race passed'
Sql "do `$`$ declare n integer; begin select count(*) into n from public.opportunity_extraction_runs where artifact_id='d2000000-0000-4000-8000-000000000001'; if n not in (1,2) then raise exception 'retry/failure race invalid count'; end if; if n=2 and not exists(select 1 from public.opportunity_extraction_runs where artifact_id='d2000000-0000-4000-8000-000000000001' and attempt_number=2 and retry_of_run_id='d3000000-0000-4000-8000-000000000001') then raise exception 'retry/failure race invalid child'; end if; end `$`$"

# Completion always makes the running attempt succeeded; a racing retry must fail closed and create no child.
Sql "insert into public.opportunity_ingestions(id,entry_type,requested_by_email) values('e1000000-0000-4000-8000-000000000001','pdf','race')"
Sql "select * from public.finalize_opportunity_verified_artifact('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','private','race.pdf','race.pdf','application/pdf','application/pdf',1,repeat('e',64),1,'{}','race')"
Sql "select * from public.allocate_opportunity_extraction_run('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','logical','land','1','p','m','parser','prompt','schema',repeat('e',64),'race')"
$completion="select * from public.complete_opportunity_extraction_run('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','[]','[]')"
$retryDuringCompletion="select * from public.allocate_opportunity_extraction_retry('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000002','logical','ee000000-0000-4000-8000-000000000001','land','1','p','m','parser','prompt','schema',repeat('e',64),'race')"
Pair 'retry versus completion' $completion $retryDuringCompletion @(0,1)
Sql "do `$`$ begin if (select count(*) from public.opportunity_extraction_runs where artifact_id='e2000000-0000-4000-8000-000000000001')<>1 or (select status from public.opportunity_extraction_runs where id='e3000000-0000-4000-8000-000000000001')<>'succeeded' then raise exception 'retry/completion race altered history'; end if; end `$`$"
Write-Host 'Opportunity extraction retry concurrency tests passed.'
