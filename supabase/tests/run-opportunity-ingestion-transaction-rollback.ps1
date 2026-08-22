param([string]$DatabaseUrl = $env:OPPORTUNITY_TEST_DATABASE_URL)
$ErrorActionPreference='Stop'; if([string]::IsNullOrWhiteSpace($DatabaseUrl)){throw 'Explicit disposable loopback database URL required'}
$uri=[Uri]$DatabaseUrl; if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $DatabaseUrl -match '(?i)supabase'){throw 'Refusing unsafe database'}
$psql='C:\Program Files\PostgreSQL\15\bin\psql.exe'; if(-not(Test-Path $psql)){$psql=(Get-Command psql).Source}
& $psql -X -v ON_ERROR_STOP=1 -d $DatabaseUrl -f (Join-Path $PSScriptRoot 'opportunity-ingestion-transaction-rollback.integration.sql')
if($LASTEXITCODE-ne 0){throw 'rollback verification failed'}
