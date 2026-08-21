# Supabase migrations

This directory uses the standard Supabase CLI-compatible timestamped migration
layout. These are local artifacts only; they have not been applied to Supabase.

The acquisition tables enable RLS without browser policies. Future authenticated
Next.js server services, using server-only credentials, are the V1 access boundary.

## Historical records

An Opportunity is disposable workspace data only until its first underwriting is
finalized. A final underwriting cannot be updated or deleted, and an Opportunity
containing any final underwriting cannot be hard-deleted. Historical Opportunities
are retained and normally retired by setting lifecycle stage to `dead`.

Draft-only Opportunities remain deletable. Their sources, draft versions, and
provenance are removed through the configured cascades.

## Tenant identity and provenance

Tenant-roster entries in the persistence envelope carry durable `tenantKey` UUIDs.
Application code preserves a key when editing, reordering, or cloning the same
logical tenant. New tenants receive keys at the application creation boundary—not
inside the economic mapper. Removed keys are not recycled; current provenance is
superseded or retired transactionally while historical provenance is retained.

For tenant provenance, the `tenant_key` column is authoritative and `field_path`
is tenant-relative, such as `rentalRatePerSfYear`. Application services must ensure
that a supersession describes the same logical field; the database minimally
enforces that both provenance rows belong to the same Opportunity.

## Future finalization transaction

The server application service must validate the persistence envelope, map it to
the pure engine input, run the current engine, collect result and diagnostics,
resolve the calculation policy, compute a canonical input/policy hash server-side,
derive typed summaries from that exact result, and write and finalize the snapshot
in one controlled transaction. Client-supplied calculated summaries are never
authoritative.

The Phase 2C.1 migration relies on the supplied live-schema findings that
`public.deals.id` is `uuid primary key default gen_random_uuid()` and `pgcrypto`
is installed.

## Type generation

No database type file is hand-authored or labeled as generated. After review and
application to an isolated development project, use the read-only workflow:

```text
npx supabase gen types typescript --project-id <project-ref> --schema public > <reviewed-output-path>
```

Choose the repository output path when the server-side Supabase boundary is
implemented, then check in the generated artifact.

## Isolated integration tests

The integration harness requires an explicit disposable loopback PostgreSQL URL
and refuses non-loopback or recognizable Supabase endpoints. It never reads the
application Supabase environment variables and creates a minimal local `deals`
fixture before applying the migration.

```powershell
$env:OPPORTUNITY_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/opportunity_test'
./supabase/tests/run-opportunity-integration.ps1
./supabase/tests/run-opportunity-concurrency.ps1
```

Use only a newly created disposable database. The first script applies the
migration; the second expects that migrated schema and tests three partial unique
indexes using independent concurrent `psql` processes.
