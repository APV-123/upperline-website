# Opportunity ingestion domain

This provider-neutral domain describes immutable artifacts, repeatable extraction
runs, untrusted candidate facts/evidence, and append-only human decisions. Candidate
destinations reuse authoritative Opportunity provenance identities, but candidates
never become authoritative merely by being persisted.

Economic decimals and confidence enter application code as exact canonical strings.
Tenant destinations use an ingestion-scoped UUID plus a tenant-relative field path;
array indexes are never identity. Fingerprints are deterministic SHA-256 hashes of
canonical JSON and deduplicate identical candidates only within one extraction run.

## PDF acquisition foundation

Phase 4A.2.1b.0 defines application contracts and pure orchestration for acquiring a
single PDF into an Opportunity ingestion. It performs no Storage or remote database
operations. The browser supplies only non-authoritative display and UX claims. The
authenticated server resolves the actor and Opportunity, creates or recovers the
ingestion, derives the first artifact ID from the ingestion ID, and constructs the
only permitted object path:

`opportunities/{opportunityId}/ingestions/{ingestionId}/artifacts/{artifactId}/source.pdf`

Original filenames are sanitized metadata and never participate in object identity.
The V1 policy permits at most 25 MiB and 250 pages and accepts only PDF acquisition.
Client size, MIME, extension, and filename checks are early feedback rather than
proof of content.

The future Storage adapter must use a private bucket, exact-path authorization, and
create-only uploads. An uploaded object remains untrusted/quarantined bytes until a
trusted server reads the exact object, calculates SHA-256 over its bytes, validates
the PDF, and finalizes it through `finalize_opportunity_verified_artifact`.

**Storage object presence does not equal a verified artifact.** Presentation states
such as `uploaded_pending_verification` and `verifying` are derived from object and
application activity while the persisted ingestion remains `awaiting_source`.

Signed upload authorization, a Supabase Storage adapter, PDF parsing, byte hashing,
cleanup, download access, extraction, AI/provider calls, and authoritative candidate
application are intentionally outside this phase.

## Concrete server adapters

Phase 4A.2.1b.1 adds server-only Supabase adapters for the existing ingestion tables,
verified-artifact RPC, and exact private-object operations. The future deployment must
provide `OPPORTUNITY_PDF_STORAGE_BUCKET` as trusted server configuration. No bucket
value is accepted from a request, and this phase does not create or configure one.

The installed Supabase Storage SDK fixes signed upload authorization validity at two
hours; it does not expose an expiration argument. Authorizations are created with
`upsert: false` for the single deterministic object path. If that object already
exists, the application returns recovery toward verification instead of issuing an
overwrite authorization. Signed URLs and tokens are credentials and must never be
logged, persisted, included in telemetry, or exposed in diagnostic errors.

Object inspection is useful only for missing/present recovery and defensive size
checks. **STORAGE CONTENT-TYPE != AUTHORITATIVE MIME.** The installed SDK's
`download()` resolves to a `Blob`; the adapter exposes its byte stream to consumers,
but the SDK boundary has already buffered the response. Verification should account
for this 25 MiB bounded-memory tradeoff or later use a lower-level streaming fetch.

**SIGNED UPLOAD AUTHORIZATION != VERIFIED ARTIFACT.** Hashing, PDF parsing,
authoritative verification, rejected-object cleanup orchestration, public upload API
routes, and browser upload UI remain intentionally unimplemented.

## Authoritative PDF verification

Phase 4A.2.1b.2 uses the server-only Mozilla `pdfjs-dist` 6.2.108 package for
structural inspection. It was selected for current Node support, maintained upstream
releases, built-in TypeScript declarations, page-count support, and deterministic
password/encryption rejection. `pdf-lib` was not selected because its last upstream
release is substantially older and its parser is a poorer fit for adversarial input.

`pdfjs-dist` 6.2.108 requires Node `>=22.13.0 || >=24`. The repository declares
Node `>=22.13.0 <23` in `package.json`; Vercel uses that declaration to select its
latest managed Node 22.x build and function runtime. PDF verification is therefore
Node-only and must be reached only through a server composition seam whose route
explicitly uses the Node.js runtime, never Edge. The verifier and Supabase adapters
are guarded by `server-only`, the parser is imported narrowly from
`pdfjs-dist/legacy/build/pdf.mjs`, and Node's built-in `crypto` computes the digest.
No parser module is exported from the client-safe ingestion barrel.

`@napi-rs/canvas` is an optional `pdfjs-dist` dependency. V1 performs structural
inspection only: it does not render pages, load browser viewer code, configure a
worker, or require canvas at runtime. A deployment must not weaken structural
verification if a future parser or rendering path changes that assumption.

Verification consumes the exact object-store byte stream into one 25 MiB bounded
application buffer while incrementally computing lowercase SHA-256. It ignores
browser and Storage size, MIME, digest, and page claims. V1 requires `%PDF-` at byte
zero; leading junk is rejected deliberately. PDF.js then resolves every page
dictionary without rendering, text extraction, OCR, action lookup, attachment
access, or form interpretation. Documents must be structurally readable,
unencrypted, and contain 1 through 250 pages.

On success, only the server-computed digest and byte count, parser-derived page
count, authoritative `application/pdf` MIME, configured private bucket, and
deterministic artifact/path are passed to the existing finalization RPC boundary.
The schema has no durable pre-finalization filename claim, so verification does not
accept a filename or declared MIME from its caller and finalizes those optional
fields as null. A replay after the ingestion is acquired returns its deterministic
ready identity without reading or rewriting the immutable object.

Definitive format rejection may later permit exact untrusted-object cleanup.
Transient Storage/read failures and finalization conflicts retain the object, and a
finalized artifact is never cleanup-eligible. This phase classifies cleanup but does
not perform it.

The SDK Blob buffering described above plus the verifier's single bounded buffer is
an accepted V1 memory tradeoff. Structural parsing is still exposed to parser CPU,
compression, and library vulnerabilities; future isolation, timeouts, malware
scanning, and content-disarm controls remain advisable.

**VERIFIED PDF != MALWARE-FREE PDF.**

**VERIFIED PDF != TRUSTED BUSINESS CONTENT.**

Here, verified PDF means the trusted server verified the exact stored bytes as a
bounded, structurally readable, unencrypted PDF satisfying V1 artifact policy. It
only becomes eligible for a later, separate extraction process after finalization.
