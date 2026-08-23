# Supabase migrations

This directory uses the standard Supabase CLI-compatible timestamped migration
layout. The Phase 2 acquisition-table migration is deployed. Later migrations
remain local until they complete their own production review and application.

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

## Transactional Opportunity RPCs

The Phase 3A.0 migration adds four narrow server-only persistence primitives:

- atomic retail-development draft version allocation;
- cloning with current underwriting provenance copy and active selection;
- active-version switching;
- append-and-supersede provenance replacement.

They are PostgreSQL transaction boundaries, not application services. All use
`SECURITY INVOKER`, an empty fixed `search_path`, schema-qualified objects, and
explicit signatures. Execute is revoked from `PUBLIC`, `anon`, and
`authenticated`, and granted only to Supabase's `service_role`. The future
repository must call them only through a server-only service-role client after
application authorization and validation.

Draft allocation, cloning, active switching, and provenance replacement lock the
parent Opportunity. That natural aggregate lock serializes version allocation and
other cross-row operations without introducing a counter table. Clone provenance
copies only current underwriting-input provenance. It preserves tenant keys,
uses `prior_version`, and records source version/provenance IDs in `metadata`;
it does not semantically supersede or mutate the source history.

Ordinary Opportunity updates, draft input edits, calculation persistence, and
finalization intentionally remain single conditional PostgREST updates using an
expected revision. A draft edit clears all calculated artifacts in that one
statement. Finalization writes the complete freshly calculated snapshot and
changes `draft` to `final` in one statement. Row locking, revision predicates,
and the existing final/provenance advisory-lock triggers make competing edits,
finalizations, active switches, and provenance replacement serialize safely.

RPC errors are deliberately classifiable by the future repository:

- `P0002`: missing Opportunity or underwriting version;
- `40001`: optimistic revision conflict;
- `22023`: invalid input or cross-aggregate relationship;
- `55000`: finalized provenance is immutable;
- native `23505` and other integrity codes remain database integrity conflicts.

## Finalization boundary

The server application service must validate the persistence envelope, map it to
the pure engine input, run the current engine, collect result and diagnostics,
resolve the calculation policy, compute a canonical input/policy hash server-side,
derive typed summaries from that exact result, and write and finalize the snapshot
with one revision-checked conditional update. Client-supplied calculated summaries
are never authoritative.

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
./supabase/tests/run-opportunity-rpc-integration.ps1
./supabase/tests/run-opportunity-rpc-concurrency.ps1
./supabase/tests/run-opportunity-rpc-rollback.ps1
```

Use only newly created disposable databases. The RPC integration runner applies
Phase 2 followed by Phase 3A.0. The concurrency runners use independent `psql`
processes, and the rollback runner verifies that a failed Phase 3A.0 transaction
leaves no RPC objects behind.

## Opportunity ingestion foundation

Phase 4A.1 adds private, server-only persistence for ingestion workflows,
immutable source artifacts, append-oriented extraction attempts, untrusted
candidate facts and evidence, and append-only human review decisions. It creates
no storage bucket, extraction process, UI, API, or authoritative application RPC.
Candidates remain separate from `opportunity_field_provenance`; only a future
reviewed transaction may promote accepted values into authoritative data.

Phase 4A.2.0 adds server-only transaction RPCs for verified artifact finalization,
concurrency-safe extraction-run allocation, atomic candidate/evidence completion,
and sanitized failure transitions. The migration does not create Storage objects,
upload code, parsing, provider integration, API routes, UI, or authoritative writes.

Phase 4A.2.1a amends only the untrusted extraction contract for land flyers. It
adds the `source` candidate destination, an exact conservative source-field
registry, visual/model inference assertion bases, and four land-specific units.
It does not promote candidates, create authoritative values, or grant browser
execution. Its integration and rollback runners are:

```powershell
./supabase/tests/run-opportunity-land-flyer-contract-integration.ps1
./supabase/tests/run-opportunity-land-flyer-contract-rollback.ps1
```

## Storage policy remediation

Migration `20260823000200_scope_storage_object_policies.sql` removes the four
legacy global `storage.objects` policies. It retains only anonymous create access
scoped separately to `deal-images` and `deal-documents-public`, whose existing
admin editors still upload through the browser. Their public bucket flags provide
public-object delivery, so no `storage.objects` SELECT policy is required.

`deal-documents-private` has no browser-role policy. Its writes use a NextAuth-
authorized, server-derived exact path and create-only signed upload authorization;
reads continue through server/service-role signed URLs. Arbitrary future buckets
inherit no access. The fail-closed disposable integration runner is:

```powershell
./supabase/tests/run-storage-policy-integration.ps1
```
