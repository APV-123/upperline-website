# Opportunity application services

This directory is the server-side application boundary shared by future manual UI,
API/server actions, and automated ingestion. Callers authenticate and authorize
before constructing a trusted `OpportunityActor`; core services receive that actor
and never call NextAuth. `requireUpperlineUser` is the interactive resolver: it
requires a session, normalizes the email, and permits only `@upperlineco.com`.

The Opportunity-only Supabase factory and repository are guarded by `server-only`.
The repository centralizes temporary migration-derived persistence contracts, row
adaptation, sanitized database errors, direct PostgREST operations, and the four
approved transaction RPCs. These temporary contracts are intentionally not a fake
generated `Database` type and should be replaced when generated Supabase types
become authoritative.

Direct conditional PostgREST updates own ordinary Opportunity edits, draft input
edits, calculation snapshots, and finalization snapshots. Version allocation,
clone/provenance copy, active switching, and provenance replacement use their
committed PostgreSQL RPCs. TypeScript does not recreate those transactions.
Primary-source switching is intentionally unavailable: changing two source rows
cannot be made safely atomic with the approved primitives. A future RPC or schema
primitive is required.

Active-underwriting dashboard filters use an explicitly aliased PostgREST embedded
relationship. Query-builder tests pin the generated URL, filters, order, and range,
but a future isolated Supabase integration test should verify the relationship and
count behavior end to end; disposable PostgreSQL alone cannot exercise PostgREST.
Database numeric values are accepted as JSON numbers or strings and normalized to
decimal strings at the DTO boundary.

Application DTOs isolate callers from database naming. Reads use persisted summary
columns and never recalculate. Draft edits validate the persistence envelope and
clear every stale calculated artifact in the same revision-checked update.
Calculation and finalization map the envelope to the pure Phase 1 engine, run it,
hash the complete economic input plus stored policy, map summaries once, and write
one authoritative snapshot. Finalization always recalculates and permits an
incomplete result while preserving diagnostics.

## V1 calculation policy

New drafts store a complete policy: `DEFAULT_CALCULATION_POLICY` plus an explicitly
provided override. Draft input edits preserve that stored policy. Calculate and
finalize use and rewrite the same fully resolved stored policy; they never silently
substitute the then-current default. Changing policy is intentionally reserved for
a new version/clone workflow in a future service.

Canonical SHA-256 hashing sorts object keys, preserves decimal strings, includes
every economic input and policy value, and excludes Opportunity/version identity,
audit data, timestamps, revision/active state, and durable tenant UUIDs. Provenance
uses typed identities for Opportunity, underwriting, and tenant fields. Tenant
field paths remain tenant-relative and tenant keys must exist in the draft envelope.
That check is an application precondition, not database referential integrity: the
current RPC/schema cannot prevent a concurrent draft edit from removing the tenant
between the read and provenance write. Callers must not claim stronger integrity;
an expected-version argument or database envelope check is future schema/RPC work.

Raw database details remain attached as server-side causes but are never exposed as
application messages. HTTP status mapping and UI presentation belong to future
callers, not this layer.
