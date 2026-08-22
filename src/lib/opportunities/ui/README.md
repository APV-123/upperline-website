# Manual Opportunity screening UI (Phase 3B)

Routes are `/admin/opportunities`, `/admin/opportunities/new`, and
`/admin/opportunities/[id]`. Existing middleware protects the admin tree. Narrow
route handlers under `/api/opportunities` match the portal's established mutation
pattern. Every handler resolves `requireUpperlineUser`, constructs the server-only
repository, and invokes Phase 3A services; the browser never supplies an actor or
accesses Supabase.

The editor keeps one persistence envelope in local component state. Decimal values
remain strings; one centralized pre-save normalizer removes valid currency/thousands
presentation characters across every Phase 1 decimal field and rejects malformed
grouping before the request. Percentage conversion uses `decimal.js` and never
passes through binary floating point. Persistence-envelope validation exceptions
are returned as sanitized HTTP 400 validation responses.
Saving is explicit and revision checked. Dirty state installs a browser navigation
warning and labels persisted results as belonging to the last saved assumptions.
Run Underwriting saves first when dirty, uses the returned revision, then asks the
server to calculate and persist authoritative results.

Tenant roster rows retain their `tenantKey` across edits and reorder operations.
New rows receive one `crypto.randomUUID()` at the UI/persistence boundary. Keys are
never editable and are excluded by the Phase 1 mapper.

V1 intentionally omits finalization, active-version management, source management
beyond initial URL capture, Deal promotion, ingestion, autosave, and advanced list
filters. Clone Version uses the Phase 3A transaction service. Opportunity creation
and optional source creation are two writes; a source failure returns an accurate
partial-success warning and leaves the created Opportunity recoverable.
