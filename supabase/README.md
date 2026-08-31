# Supabase migrations

`20260829000100_ensure_opportunity_intelligence_artifact_bridge.sql` adds the
service-role-only, `SECURITY INVOKER` operation that transactionally establishes or
reuses Property Intelligence byte identity and the Opportunity artifact acquisition.
The operation derives the verified PDF, digest, size, MIME, storage identity, and
Opportunity ownership in the database. It does not establish provenance authority or
admit observations.

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

## Explicit extraction retries

Phase 4A.3.5 preserves the stable logical extraction identity used by ordinary
invocation and adds an explicit terminal-failure retry command. A retry creates a
new immutable run linked to the prior failed attempt. Its opaque UUID is only an
idempotency identity: it conveys no provider, model, artifact, configuration, or
authorization authority. The service-role-only allocation RPC serializes on the
ingestion/artifact, recovers identical commands, rejects running or non-failed
predecessors, and prevents command reuse across logical extractions.

Disposable behavioral, concurrency, and rollback runners are:

```powershell
./supabase/tests/run-opportunity-extraction-retry-integration.ps1
./supabase/tests/run-opportunity-extraction-retry-concurrency.ps1
./supabase/tests/run-opportunity-extraction-retry-rollback.ps1
```

## Property Intelligence identity and source foundation

Phase 4C.1 adds private, server-only durable identity for real-world subjects and
for source provenance independent of Opportunity workflow ownership. Only
Property/Site receives a typed entity extension. Future entity kinds are reserved
as controlled vocabulary; no parcel, building, premises, tenancy, lease, road,
study-area, observation, evidence, recommendation, or UI implementation is created.

Logical sources, immutable editions, global byte identity, acquisitions, and
edition relationships are distinct. The optional legacy-artifact bridge verifies
digest, size, and Opportunity context and performs no data migration. Publication
precision never manufactures an unknown month or day. All new tables use RLS with
no browser policy and explicit service-role-only table grants.

Disposable behavioral and rollback runners are:

```powershell
./supabase/tests/run-property-intelligence-foundation-integration.ps1
./supabase/tests/run-property-intelligence-foundation-rollback.ps1
```

## Property Intelligence observations

Phase 4C.2.3 adds the private immutable observation spine, tenancy/lease identity,
typed evidence locations, admission and independence history, deterministic
lineage, and typed rent, lease-term, and area payloads. The two V1 derivation RPCs
are hard-bound to canonical contract digests and admitted immutable inputs. The
annualized-rent method uses exact numeric arithmetic and strict affirmative
temporal containment; the acres conversion is exact. Derived outputs remain
pending and do not inherit direct source/evidence assertions.
Resolved-premises qualification is identity-level in V1: exactly one authoritative
confirmed Property `contains` Premises relationship is required, while relationship
dates are ignored rather than treated as temporal truth. Reported spaces remain
distinct unresolved identities. Admission validates exact assertion/evidence edition
paths, and V1 observation relationships are limited to proposition-aware
`restates` and `contradicts`.
After the first admission decision, database triggers close the observation's
payload, subject, temporal, and direct provenance sets to further insertion;
reversal never reopens the immutable proposition.

No browser role receives table or function authority. The service-role-only
functions are `decide_intelligence_observation_admission`,
`derive_intelligence_acres_to_square_feet_v1`, and
`derive_intelligence_annualized_rent_per_square_foot_v1`. This migration creates
no extraction promotion, recommendation, underwriting, or UI behavior.

Disposable behavioral, concurrency, and rollback runners are:

```powershell
./supabase/tests/run-property-intelligence-observations-integration.ps1
./supabase/tests/run-property-intelligence-observations-concurrency.ps1
./supabase/tests/run-property-intelligence-observations-rollback.ps1
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

## Phase 4C.3.2B.1 provenance resolution

`20260827000100_create_property_intelligence_provenance_resolution.sql` adds the
private, append-only provenance-resolution foundation. Its eight tables retain
command identity, immutable proposal spines and typed payloads, attribution
evidence links, and decision history. Current authority and promotion readiness
are derived by database functions; neither is mutable caller state.

The database trusts `service_role` only as the final server assertion boundary
for a normalized reviewer identity. Phase 4C.3.2B.2 must derive that identity
from the authenticated NextAuth/Azure AD session and must reject browser-supplied
reviewer authority. PostgreSQL independently enforces every structural,
fingerprint, lifecycle, materialization, concurrency, RLS, and append-only
invariant within its authority boundary.

Attribution evidence is part of the proposal fingerprint. Evidence insertion
therefore locks the proposal, is permitted only while it remains proposed, and
deferredly revalidates the complete fingerprint so neither a later insert nor a
decision race can change finalized proposal semantics.

The migration replaces the Phase 4C.1 physical preferred-primary uniqueness
index with authority-aware enforcement. Reversed primary representations remain
historically intact while at most one current confirmed primary can exist per
edition. No mutable current-state or readiness table is introduced.

## Phase 4C.3.2B.2 provenance orchestration

`20260828000100_create_property_intelligence_provenance_orchestration.sql` adds
three private, `SECURITY INVOKER`, empty-`search_path`, service-role-only RPCs for
atomic proposal creation, trusted human decisions/materialization, and authoritative
readiness retrieval. It adds no table and preserves the Phase 4C.3.2B.1 data model.

Disposable validation runners are:

```powershell
./supabase/tests/run-property-intelligence-provenance-orchestration-integration.ps1
./supabase/tests/run-property-intelligence-provenance-orchestration-concurrency.ps1
./supabase/tests/run-property-intelligence-provenance-orchestration-rollback.ps1
```
## Phase 4C.3.2B.1H provenance privilege hardening

`20260828000200_harden_property_intelligence_provenance_privileges.sql`
replaces provenance row-lock coupling with domain-separated transaction advisory
locks and revokes Supabase-inherited table ACLs before granting `service_role`
only `SELECT, INSERT` on the eight provenance-resolution tables.

Supabase production default privileges can grant `service_role` broad authority
on newly created tables. Every future Property Intelligence table migration must
therefore explicitly revoke inherited/default per-table privileges from
`service_role`, `PUBLIC`, `anon`, and `authenticated` before granting its reviewed
least-privilege set. This migration intentionally does not alter project-wide
default privileges because that broader blast radius requires separate review.
# Phase 4C.6C Opportunity subject authority

`20260829000200_create_property_intelligence_opportunity_subject_authority.sql` adds three narrow append-only authority tables and an atomic service-role RPC for human-reviewed Opportunity-to-Property/Site `primary_target` confirmation. It retains `intelligence_opportunity_subjects` as the materialized relationship, binds it to immutable proposal authority, denies direct mutation/truncation, and uses transaction-scoped command/Opportunity/entity advisory locks. This migration does not create observations or change entity-to-entity resolution semantics.

## Phase 4C.6D.3 rich traffic extraction persistence

`20260830000100_admit_rich_traffic_extraction_candidates.sql` replaces only the
transactional extraction-completion RPC. It preserves historical scalar
`traffic.vehiclesPerDay` candidates and narrowly admits the approved
`traffic_count` version-1 JSON proposition when its field, value type, unit,
group key, discriminator, version, and durable structural envelope all agree.
Arbitrary JSON and other rich candidate families remain rejected. The migration
adds no tables, changes no extraction lineage, and creates no observation or
admission behavior.

Disposable integration and rollback runners are:

```powershell
./supabase/tests/run-opportunity-rich-traffic-persistence-integration.ps1
./supabase/tests/run-opportunity-rich-traffic-persistence-rollback.ps1
```
