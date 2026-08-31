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

PDF.js 6 initializes real `DOMMatrix` and `Path2D` Node primitives through its
supported `@napi-rs/canvas` fallback even when this application does not render.
The package is therefore an explicit server runtime dependency and both packages
remain external to the Next server bundle so Vercel includes the native platform
binary. PDF.js is loaded lazily only when authenticated verification reaches
structural inspection. V1 still does not render pages, load browser viewer code,
configure a worker, perform OCR, or extract images.

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

## Authenticated manual acquisition composition

Phase 4A.2.1c.0 composes the trusted acquisition services into two authenticated,
Node-only Opportunity endpoints and a compact **Sources & documents** UI. The first
endpoint begins or recovers a PDF ingestion and returns only its ingestion ID plus
the exact signed upload authorization needed by the browser. The browser uploads
the selected file directly with create-only semantics. It never receives a trusted
bucket, caller-selectable path, artifact identity, service-role credential, or
authoritative verification metadata.

The second endpoint accepts only the Opportunity and ingestion identities from its
route and invokes trusted server verification. The server reads the exact stored
object, computes SHA-256 and byte count, validates PDF identity and structure,
rejects encryption and the 250-page limit, then calls the existing finalization RPC.
The response exposes only safe ready state, authoritative byte size, page count,
and PDF media type; it does not expose the digest, bucket, path, or parser details.

The manual UI state machine is: Selected → Preparing → Uploading → Uploaded —
verification pending → Verifying → Verified — Ready for Extraction. Preliminary
filename, browser MIME, and size checks are UX only. The idempotency key and safe
ingestion correlation are retained locally so a lost verification response or
ordinary refresh can replay verification without overwriting the object. A ready
ingestion replays as ready. An abandoned authorization creates no verified artifact.

`OPPORTUNITY_PDF_STORAGE_BUCKET` remains trusted server-only configuration and is
read lazily at request execution. Its absence fails an acquisition request closed
without breaking unrelated Opportunity pages, imports, tests, or builds. A later
controlled phase must provision/configure private Storage and exercise this flow
with a real PDF; this phase does not provision Storage or perform extraction.

## OpenAI extraction adapter

Phase 4A.3.3 adds a server-only provider-port adapter for the OpenAI Responses API.
It uses built-in Node `fetch`, request-scoped inline Base64 PDF data, `store: false`,
non-streaming execution, low reasoning effort, and a strict generated JSON Schema.
The provider receives no Supabase authority, Storage URL/path, business identifier,
or mutation callback. Raw responses are capped at 1 MiB and parsed twice—with
duplicate keys rejected before JavaScript object materialization—before the existing
hostile local validator applies the authoritative contract.

`OPENAI_API_KEY` is read only by the server adapter's lazy credential boundary. It is
never a `NEXT_PUBLIC_` value and must not be logged or serialized. Tests inject a fake
credential and never call OpenAI.

V1 deliberately allowlists the moving `gpt-5.6-terra` alias because OpenAI does not
currently document an immutable Terra snapshot. A sanitized model identifier returned
by the provider may be emitted as non-authoritative operational telemetry, but it never
changes configuration, authorization, destination vocabulary, idempotency, or
persistence authority. Extraction behavior may change behind the alias; migration to
an immutable GPT-5.6 Terra snapshot remains future work once one is published.
# Rich extraction propositions (Phase 4C.6D)

Legacy candidate rows remain scalar and retain their historical fingerprints and decisions. New typed propositions use the existing immutable candidate JSON value, with `group_key` carrying the bounded family/version discriminator. No provider JSON reaches persistence until the provider-neutral hostile validator produces the canonical proposition.

`traffic_count` version 1 contains a positive integer count, `vehicles_per_day`, a controlled VPD/ADT/AADT/unknown basis plus exact source terminology, optional source-reported roadway/location/direction, and explicit measurement-time precision. Null means the source did not provide an optional dimension; `basis.normalized = unknown` is a distinct affirmative classification. Leading/trailing whitespace and controls are rejected, admitted strings are NFC-normalized, source literals remain case-sensitive, controlled values have fixed case, and canonical identity sorts object keys rather than trusting insertion order. The fingerprint covers kind, schema version, and the complete canonical proposition. Evidence is immutable and bound to the same candidate reviewed by the human.

`traffic_count` version 2 is a separate immutable proposition family used by `land-flyer-v3`. It preserves the source roadway, optional cross street, numeric cross-street offset and compass direction, source basis heading, separate source volume type, source-relative distance from the source document's subject, and explicit measurement time. Both distance families use explicit `miles`; null and zero are distinct. Source-relative distance is not geometry, a calculated distance, or Property identity. V1 remains historical and is neither upgraded nor reinterpreted. V2 maps under `traffic_count:2`, and its complete canonical proposition participates in the fingerprint.

Candidate validity means the extraction is structurally faithful to the source. It does not mean the proposition is eligible for Property Intelligence admission. A later traffic admission requires a known traffic basis, sufficiently specific measured roadway/segment/station, measurement/vintage time, confirmed contextual Property, durable evidence, and resolved source/provenance. This phase creates no observation or admission.

The same envelope can later carry `demographic_metric` with typed metric/value/statistic, radius/unit, study-area literal, vintage/projection/growth dimensions, methodology literal, and evidence; those semantics and persistence are intentionally deferred.
