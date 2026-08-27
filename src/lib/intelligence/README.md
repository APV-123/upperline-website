# Property Intelligence domain

## Phase 4C.3.2A provenance bridge contract

The provenance bridge moves through independent semantic boundaries:

`eligible Opportunity artifact -> global artifact -> acquisition -> logical source -> source edition -> reviewed edition/artifact representation -> reviewed upstream-provenance conclusion -> derived provenance readiness`.

These are derived semantic states, not a mutable bridge-state record. The contract
creates no SQL, storage copy, source row, observation, promotion, or admission.

Global artifact identity is the SHA-256 identity of immutable bytes. Opportunity,
ingestion, filename, URL, storage path, uploader, and acquisition context never enter
that identity. The same bytes reuse one artifact while each distinct encounter or
custody path may create a separate acquisition. Replaying the same Opportunity
artifact recovers its acquisition; a new Opportunity, ingestion, URL, email, or
download is a new acquisition. Revised bytes are a new artifact.

Source, edition, publisher, representation, and upstream attribution are separate
authority concerns. Filename, Property, publisher, uploader, and acquisition timing
may be matching evidence but establish none of them alone. Publication timing keeps
unknown/year/month/day precision and can never be manufactured from acquisition or
filename dates. Publisher may remain unresolved because it is not the source subject,
seller, broker contact, upstream provider, or legal party by implication.

The installed representation vocabulary is locked as follows: `primary` with
`is_primary=true` is the preferred complete rendition; `primary` with false is an
alternate complete peer; `supplement` is companion material; `embedded` identifies
an edition inside a broader artifact; and `derivative` is a reviewed transformation
such as OCR. Different bytes require reviewed content-equivalence before they can
represent one edition.

Representation and source-relationship proposals share one abstract append-only
review lifecycle—proposed, confirmed, rejected, ambiguous, and reversed—but retain
distinct typed proposal contracts. Reversal never deletes an affirmative historical
relationship. A corrected assignment reverses the old proposal and confirms a new
one. Command replay requires the same canonical semantics; changed semantics under
the same command reference fail closed, and optimistic decision numbers serialize
concurrent authority changes.

Containing source and attributed upstream source remain separate. A JLL OM citing
Esri has JLL as containing edition and a reviewed relationship to Esri. Another OM
repeating that Esri statistic does not become independent merely because its
publisher differs. Attribution never supplies independence authority.

Upstream provenance readiness is always established by affirmative reviewed
authority. Its tagged conclusion is either `attributed_upstream`, backed by compatible
evidence and a materialized source relationship, or `no_upstream_required`, backed by
a bounded human-review rationale and no fabricated relationship. Absence of a
proposal or detected attribution is unresolved; it never means no upstream source is
required. `no_upstream_required` is not a claim of source independence, proof that no
upstream source exists, or proof that the publisher originated every fact. Later
discovery reverses the historical conclusion and uses a new correction proposal.
It is never derived from source kind, publisher, filename, acquisition channel,
artifact bytes, application defaults, or the absence of detected citations. For
persistence compatibility, both tagged conclusions continue to use the reviewed
`upstream_attribution` resolution kind and its single typed payload table.

Provenance readiness is derived only when the artifact is bridgeable, the global
artifact and acquisition exist, source and edition are confirmed, exactly one
applicable representation is confirmed, a containing source exists, and exactly one
compatible current upstream-provenance conclusion is confirmed. A confirmed
`attributed_upstream` conclusion requires its Phase 4C.1 relationship; a confirmed
`no_upstream_required` conclusion forbids one. No conclusion, proposed/rejected/
reversed authority, and conflicting conclusions fail closed. Promotion consumes this
reviewed bridge authority rather than arbitrary source or edition UUIDs. Candidate approval,
subjects, temporal interpretation, classification, durable evidence sufficiency,
observation reconciliation, construction, and admission remain outside the bridge.

`domain/provenance-bridge-contracts.ts` models the facts and decisions a future
database boundary must derive. It deliberately does not choose SQL tables or pretend
that TypeScript can prove Opportunity ownership, digest, acquisition, or current
review authority.

## Phase 4C.3.1 promotion boundary

The reviewed authority chain is:

`Extraction -> candidate -> extraction review -> promotion bundle -> promotion eligibility -> pending observation construction -> observation review/admission -> reusable Property Intelligence -> later comparable/recommendation/underwriting systems`.

Only the stages through reusable Property Intelligence have domain or persistence
foundations today. Comparable selection, recommendations, underwriting-assumption
application, and their user interfaces do not exist yet.

Extraction approval establishes only that a candidate faithfully represents the
reviewed source. Promotion is a separate, explicit proposition-construction action,
and observation admission is a third, separately reviewed authority decision.
Approval never implies promotion or admission.

One immutable promotion bundle represents exactly one proposed source observation.
It may use multiple accepted candidates when one proposition needs several extracted
facts, but candidate and Opportunity identifiers remain workflow lineage and never
enter durable proposition identity. A bundle targets only the installed `area`,
`rent`, or `lease_term` families. Unsupported facts remain valid extraction results.
Deterministic derived observations are not promotion bundles: source observations
must first be separately constructed and admitted, after which installed versioned
derivation methods may operate on eligible admitted inputs.

Promotion requires an authoritative current successful extraction, accepted
candidate values copied from immutable workflow state, exactly one confirmed
Property, pre-authorized required subjects, a global artifact plus acquisition and
one source-edition representation, and evidence capable of becoming a durable
locator. A resolved Premises must already satisfy the installed unique confirmed
identity-level Property containment contract. `reported_space` remains distinct;
creating it is an explicit preparation action rather than a promotion side effect.
Trade names do not establish legal tenant identity, and asking rent never invents a
Lease. Contractual and lease-term propositions require their applicable durable
Lease identity.

Temporal mapping preserves absence, explicit unknown, explicit open bounds, and
year/month/day precision. Promotion may construct a truthful pending observation
that remains ineligible for deterministic derivation. It never manufactures dates,
denominators, per-area rent, source authority, durable evidence, subject resolution,
or independence.

Existing intelligence is reconciled without overwrite. Equivalent proposition and
source context is an idempotent match; independent matching sources may create
corroborating observations; dependent sources create reviewed restatements; equal
comparison context with a different value creates a contradiction candidate; and
ambiguous comparison stops for human reconciliation. Numeric equality ignores
textual trailing-zero scale. Future persistence must canonicalize proposition and
provenance contexts separately and serialize equivalent concurrent commands.

`domain/promotion-contracts.ts` encodes these pure controlled vocabularies and the
inputs/results that a future authoritative database operation must derive. It is not
a persistence DTO, does not prove database state, and creates no API, RPC, migration,
observation, admission, recommendation, or underwriting behavior.

Phase 4C treats an Opportunity as a workflow context, not the universal owner of
institutional intelligence. Phase 4C.1 implements only durable subject identity and
source/provenance identity. It deliberately creates no observation, evidence,
recommendation, extraction, underwriting-application, or UI boundary.

## Identity boundary

`intelligence_entities` supplies durable identity. Only `property_site` has a typed
extension in Phase 4C.1. The controlled base vocabulary reserves parcel, building,
premises, organization, brand, road, road segment, traffic station, and geographic
study area so later contracts do not have to misuse an Opportunity field as identity.
Reserved types are not implemented domain objects yet.

Names, addresses, parcel numbers, suite numbers, and trade names are aliases or
external identifiers--not entity identity. Entity resolution uses a proposal plus
append-only human decisions. A later reversal does not destructively merge, rewrite,
or delete either entity. Effective-dated relationships support parcel assemblage,
subdivision, redevelopment, and later building/premises containment.
External identifiers are deliberately lookup-indexed rather than unique: competing
unresolved entities may carry the same asserted identifier until a human resolution
decision establishes whether they are the same real-world subject.

An Opportunity may relate to durable entities as primary target, assemblage
component, comparable, adjacent subject, or reference. Dead or rejected Opportunity
workflow state has no cascading ownership over entity or source identity.

## Source boundary

Publisher/provider, logical source, immutable source edition, global artifact bytes,
and artifact acquisition are separate concepts. The same edition and byte-identical
artifact can be associated with multiple workflow acquisitions without pretending
they are independent source authority. Publication precision uses separate year,
month, and day components so an unknown day is never manufactured.

Edition relationships distinguish citation, explicit attribution, embedded summary,
derivation, revision, and supersession. A JLL OM containing seller-budget figures or
unattributed demographics therefore retains JLL as the containing edition while a
reviewed upstream source can be recorded separately. Multiple page/cell/clause
evidence locations are deferred to the observation/evidence milestone; Phase 4C.1
does not use a generic locator JSON bag as a substitute.

The optional legacy acquisition link validates digest, byte size, and Opportunity
relationship against an existing `opportunity_source_artifacts` row. It is a
compatibility bridge only; this phase performs no Mason or Opportunity data migration.

Source authority is independent, append-only assessment history rather than an
immutable property of an edition. A reviewer can supersede an earlier assessment
without rewriting the edition or treating the latest assessment as an intrinsic
fact about the source.

Exact entity relationship dates are supported; a null endpoint means unknown or
open-ended. Year/month precision for relationship endpoints is an accepted V1 gap
and may be added without replacing entity or relationship identity. Publication
precision is already lossless because source dates are immediately authoritative to
later observation provenance.

## Reference-OM refinements locked for later phases

The Square at Elyson validation established these future domain requirements:

- visitation/footfall is separate from road traffic;
- rent requires denominator, time basis, economic basis, lifecycle, and commitment
  status so in-place, contractual steps, options, LOIs, market rent, model rent,
  anchor rent, and parking ground rent cannot be mixed;
- tenancy and lease are first-class future identities/relationships;
- premises includes indoor suites and outdoor/ground areas;
- occupancy records its basis and inclusion policy;
- broker source-model inputs and outputs remain separate from operating observations;
- claim provenance distinguishes containing source from explicit upstream attribution;
- repeated presentation within one edition supplies additional evidence, not false
  independent corroboration;
- repeated upstream datasets across editions require later duplicate-lineage handling.

None of those observation families or application behaviors is implemented here.

## Phase 4C.2.3 persistence foundation

The additive observation migration implements the common immutable observation
spine, tenancy/lease identity, typed evidence locators, append-only admission and
relationship history, immutable derivation lineage, and the initial rent,
lease-term, and area payload families. All 29 tables are private by default with
RLS enabled, no browser policies, restrictive foreign keys, and server-only
`service_role` authority. This milestone does not create extraction promotion,
comparables, recommendations, underwriting application, or UI behavior.

Deterministic methods are bound to repository-controlled canonical semantic
manifests. `contract_sha256` identifies the reviewed semantic contract; it is not
claimed to hash or prove arbitrary executable PostgreSQL. Static bindings,
behavioral PostgreSQL tests, and immutable method versioning establish executable
conformance. Callers cannot choose formulas, constants, precision, rounding, units,
subject projection, or temporal policy.

`annualized_rent_per_square_foot` version 1 uses exact PostgreSQL `numeric`, computes
`monthly_absolute_rent * 12 / square_feet` without input or intermediate rounding,
then performs one final `round(result, 8)`. PostgreSQL's numeric rounding supplies
the locked half-away-from-zero rule. Magnitude validation follows that rounding.
Numeric equality—not textual trailing-zero formatting—defines amount equality.
`acres_to_square_feet` version 1 is the exact multiplication `acres * 43560` with
no rounding.

The rent input is the semantic anchor for annualized-rent derivation. The output
copies its complete subject and proposition-temporal sets exactly. The area input
must match the rent's property and denominator (`premises` or `reported_space`) and
may establish compatibility or supply the operand, but contributes no output
subject, direct source assertion, evidence, or temporal assertion. Both immutable
inputs remain reachable through exactly two derivation-lineage rows.

For V1 admission and deterministic derivation, a resolved premises is qualified at
identity level only: exactly one current authoritative `confirmed` Property
`contains` Premises relationship must resolve it to the observation Property.
Relationship `valid_from` and `valid_to` are ignored and never establish
observation-date applicability. Zero or ambiguous qualifying relationships fail
closed. An unresolved space remains a distinct `reported_space`; it is never
silently converted into a premises. Annualized rent requires identical Property
and premises or `reported_space`, with the denominator identity already on rent.

Admission provenance is assertion-specific. Containing assertions require support
from the exact edition and any artifact must represent that edition. Attributed
upstream assertions require exact containing-to-upstream lineage and supporting
evidence for that path. Human attestation uses an immutable attestation locator
without manufacturing an artifact. Contradicting evidence alone cannot admit.

V1 observation relationships are limited to `restates` and `contradicts`.
Restatement compares the complete family proposition while ignoring incidental
persistence and provenance IDs. Contradiction requires identical family, canonical
subjects, temporal assertions, and non-value context with a different value.
`duplicates`, `corrects`, and `supersedes` are deferred.

Temporal storage and derivation eligibility are deliberately different:

- no row means no assertion;
- `closed + unknown` means a boundary exists but its value is unknown;
- `open + unknown` affirmatively means unbounded;
- incomplete temporal knowledge may be stored truthfully;
- annualized-rent V1 requires complete affirmative proof.

If area effective timing is present, both `effective_start` and `effective_end`
rows are required for derivation eligibility. The only eligible pairs are exact-day
closed/closed, exact-day closed/open, and open/exact-day closed, with closed bounds
inclusive. A lone known boundary is insufficient even at that exact date. Omitted,
closed-unknown, closed year/month, open/open, and reporting-period substitution all
fail closed. When no effective boundary is asserted, an exact matching point
`as_of`, or then `measurement`, may establish V1 compatibility. Storage preserves
incomplete temporal knowledge; derivation requires complete affirmative temporal
proof.

## Phase 4C.2.0 observation-domain contract

Phase 4C.2.0 locks semantics only. It creates no table, migration, RPC, extraction
adapter, promotion path, comparable service, underwriting behavior, or UI. The
versioned pure TypeScript contract lives in `domain/observation-contracts.ts` and is
independent of the installed Phase 4C.1 identity/source contract.

### Rent classification

Rent uses small orthogonal dimensions. No value combines economic meaning,
epistemic origin, time, or unit.

| Dimension | Machine values | Contract |
| --- | --- | --- |
| Meaning | `asking`, `contractual`, `market_opinion` | Asking is a marketed request, contractual is represented as a lease obligation, and market opinion is an estimate of market economics. None says how the fact was learned. |
| Commitment | `marketed_uncommitted`, `executed`, `reported_contractual`, `option`, `not_applicable` | Executed requires source support for execution. Reported contractual is used where an operating record or summary asserts contract terms without establishing execution from the governing instrument. Option is a contractual right not yet exercised. Market opinions use not-applicable. |
| Component | `base`, `additional`, `percentage`, `total` | Component describes what the amount includes. Recoveries and concessions are deferred rather than forced into additional rent. |
| Amount basis | `monetary_absolute`, `monetary_per_area`, `percentage` | A row carries one measure. Absolute rent and rent per area are separate observations unless one is a traced derivation. |
| Time basis | `monthly`, `annual`, `term`, `one_time`, `not_applicable` | Percentage amounts use not-applicable. Unknown time bases are not admitted as interpretable rent amounts. |
| Area basis | `square_feet`, `acres`, `not_applicable` | Per-area money requires a stated area unit. Acres are legitimate for ground rent. Other amounts use not-applicable. |
| Lease structure | `nnn`, `gross`, `modified_gross`, `ground_lease`, `percentage_lease`, `not_stated`, `unknown` | `not_stated` means the containing evidence is silent. `unknown` means relevant evidence exists but cannot be classified, is ambiguous, or conflicts. Null means the dimension is not captured yet and is not an admitted classification. |
| Lifecycle | `historical`, `current`, `future_scheduled`, `prospective` | Lifecycle is an as-of interpretation, not a replacement for temporal assertions. Scheduled means an existing contractual obligation effective later; prospective is uncommitted or contingent. |
| Origin | `source_stated`, `contractual_document_stated`, `deterministic_derived`, `model_inferred`, `human_entered` | Origin describes how the assertion was produced. It does not establish truth, source authority, commitment, or admission. |

Value-specific definitions are closed for V1:

- `asking` is a landlord/broker request available to the market; `contractual` is an
  asserted lease obligation; `market_opinion` is an estimate of achievable market
  economics and is neither asking nor contractual.
- `marketed_uncommitted` has no represented tenant commitment; `executed` is supported
  by an executed governing instrument; `reported_contractual` is asserted by a rent
  roll, OM, or other secondary operating source without instrument-level execution
  proof; `option` is an unexercised contractual right; `not_applicable` is reserved
  for a meaning, such as market opinion, to which commitment has no semantic role.
- `base` excludes recoveries and percentage rent; `additional` is an expressly stated
  non-base component whose detailed recovery semantics are deferred; `percentage` is
  a stated share of a sales basis; `total` is expressly represented as the combined
  rent amount and must not be inferred merely by summing selected components.
- `monetary_absolute` is currency for the stated period; `monetary_per_area` is
  currency divided by the explicit area unit; `percentage` is a dimensionless rate.
- `monthly`, `annual`, `term`, and `one_time` describe the denominator period;
  `not_applicable` is valid only where no time denominator exists.
- `square_feet` and `acres` are explicit denominators; `not_applicable` means the
  amount is not per-area. A missing denominator unit is not silently classified.
- `nnn` means the source expressly describes triple-net economics; `gross` means the
  stated rent includes the represented operating-cost burden; `modified_gross` is an
  expressly mixed allocation; `ground_lease` concerns land/ground premises;
  `percentage_lease` contains a sales-based rent obligation; `not_stated` means the
  evidence is silent; `unknown` means evidence is present but ambiguous or conflicting.
- `historical` ended before the supported as-of context; `current` applies at that
  context; `future_scheduled` is an already committed later rent step; `prospective`
  is an uncommitted, contingent, asking, opinion, or option state.
- `source_stated` is directly asserted by a non-governing source;
  `contractual_document_stated` is directly asserted by a governing instrument;
  `deterministic_derived` is reproducible from identified inputs and a versioned
  method; `model_inferred` is produced through non-deterministic inference;
  `human_entered` is asserted by a person and remains source/evidence backed.

Invalid combinations include: asking without marketed-uncommitted commitment;
contractual without executed, reported-contractual, or option commitment; market
opinion with a contractual commitment; option outside prospective lifecycle; future
scheduled rent without contractual commitment; per-area money without an area basis;
area basis on a non-per-area amount; and percentage rent with a monetary/time basis.

`unknown`, `not_stated`, `not_applicable`, and null are never synonyms. Unknown is a
reviewed conclusion that available evidence is ambiguous. Not-stated is a reviewed
conclusion that the source does not state a relevant value. Not-applicable means the
dimension has no meaning for that observation. Null means no classification has been
recorded and cannot satisfy a required admitted-observation field.

### Temporal contract

Source-edition publication time, artifact acquisition time, and system creation or
admission timestamps remain on their owning records. They are never observation
effective dates by implication. Observation temporal roles are `as_of`,
`effective_start`, `effective_end`, `reporting_period_start`,
`reporting_period_end`, `measurement`, `lease_commencement`, `rent_commencement`,
`lease_expiration`, and `vintage`.

Dates retain `unknown`, year, month, or day precision through separate components.
Open-ended intervals omit the unknown boundary; they do not manufacture a sentinel
date. Boundaries may have different precision. An interval is invalid only when the
earliest possible start is after the latest possible end. Multiple temporal
assertions may attach to one observation when they have distinct roles. Competing
assertions are separate observations and coexist until explicitly related by review.

Lease and rent commencement/expiration are typed contractual assertions. A source
calling rent “current” does not create an as-of date from its publication date. A
reviewer may classify it current only when the source supplies or explicitly defines
the relevant as-of context.

### Admission and authority

The lifecycle is:

`source/extraction candidate -> candidate review -> proposed immutable observation -> observation admission -> comparable selection -> recommendation -> underwriting assumption`.

Candidate approval means only that a human accepted candidate workflow content for
possible promotion. Promotion is a separately authorized service that will resolve
subjects, construct a proposed immutable observation, attach provenance/evidence,
and request admission. Admission means the observation is eligible for durable
intelligence retrieval; it does not make the fact undisputed, comparable-selected,
recommended, or authoritative for underwriting.

Admission decisions are append-only events: `admitted`, `rejected`, and `reversed`.
The initial projected state is pending. The observation payload never changes.
Once any admission history exists, the proposition, subject, temporal, and direct
source/evidence rows are closed to further insertion. Reversal changes retrieval
eligibility but does not reopen the immutable historical proposition for amendment.
Authorized server application services act for an identified reviewer or an
allowlisted deterministic derivation policy. Deterministic derivations still receive
an explicit admission event and must cite admitted inputs and a versioned method.
Model-inferred observations cannot be auto-admitted in V1. Human-entered assertions
bypass extraction but not source/evidence, review, or admission requirements.

### Lease, tenancy, instruments, and documents

A tenancy is physical/operational occupancy. A lease is a contractual business
identity. An instrument is a particular original lease, amendment, assignment,
renewal/extension, termination, memorandum, or source summary. A source edition is
the publishing/delivery context; an artifact is immutable bytes. None shares
identity merely because it has a one-to-one relationship today.

A lease identity may be provisional when a credible source asserts a contractual
relationship even if the executed PDF is unavailable. Resolution records whether
separate assertions refer to the same lease. A rent roll or OM may therefore support
reported-contractual observations without proving an executed instrument.

Instrument relationships are `governs`, `amends`, `assigns`, `extends`,
`terminates`, and `summarizes`. Amendments and later instruments create new
effective observations; they never rewrite the earlier instrument or what its source
stated. Assignments change a contractual party over an effective period without
rewriting historical tenancy. Premises expansion likewise creates later lease-to-
premises and tenancy assertions.

### Source independence and corroboration

Independence classifications are `independent`, `derivative`,
`same_logical_source`, `same_artifact`, and `unknown`. They are reviewed assessments
supported by deterministically derived provenance signals; they are not intrinsic
publisher properties.

- Multiple pages, tables, or passages in one edition are multiple evidence locations
  for one containing source, never independent corroboration.
- Identical artifact bytes acquired twice have separate custody acquisitions but
  `same_artifact` corroboration.
- Editions of one logical source are `same_logical_source`; a revision may correct or
  supersede an earlier edition but does not become independent merely by publication.
- A source explicitly quoting, summarizing, or reproducing another source is
  derivative of the attributed upstream assertion.
- Common publisher or brokerage alone does not prove dependence; common underlying
  work product does. When lineage cannot establish either conclusion, use `unknown`.
- An independently obtained executed lease may corroborate an OM or rent roll when
  provenance does not show that both merely restate the same upstream assertion.
- A documented call note is its own containing source but may still be derivative if
  the speaker is restating another identified source.

Future comparable ranking counts independent assertion lineages, not evidence
location count, artifact acquisition count, or raw source-edition count.

### Evidence locations

Evidence locations are immutable, provider-neutral identities belonging to a source
edition and optionally an artifact. An observation has one or more supporting
locations for admission; it may also have contradicting locations. One location may
support multiple observations, and one observation may have multiple locations.
Locations may be captured before admission and linked to extraction workflow state,
but become durable observation evidence only through explicit promotion/admission.

First-class locators are:

- PDF: required 1-based page; optional normalized bounding box, bounded text anchor,
  and section label.
- Spreadsheet: required sheet and exactly one cell, range, or row position.
- Delimited file: required 1-based row and optional column/field.
- Document: at least one section, clause, or paragraph.
- Structured/API record: required stable record identifier and optional field path.
- Human attestation: required reference to an immutable call/research-note source
  edition; the locator itself is not free-form testimony.

Copied snippets are bounded, hostile text used for review convenience. They never
replace the source edition, artifact, or locator and never supply authority. Provider
identity is not part of durable evidence identity.

### Unresolved premises

A durable premises entity requires a distinguishable real-world space supported by
a stable suite/pad/ground identifier, independently resolvable description, or a
reviewed match. Tenant name plus area alone does not satisfy that threshold.

An unresolved roster row creates a tenancy assertion at the narrowest resolved
container (property or building), relates the tenant organization/brand if resolved,
and may retain a source-scoped reported-space label. It has no premises entity ID.
If neither building nor suite is known, the property and tenant are the subjects.
Two same-brand occupants at one property remain separate unresolved tenancy
assertions when the source establishes two rows; they are not merged by brand.

Later evidence may create a durable premises plus a resolution proposal linking the
old reported-space assertion to it. Confirmation adds resolution/subject lineage; it
does not rewrite the old locator, area, label, or source meaning. Conflicting areas
remain separate observations.

### Worked stabilized-retail examples

1. **Asking rent.** “Suite 200 — 2,400 SF — Asking $42.00/SF NNN” identifies the
   property/building when known and a durable Suite 200 premises, with separate
   source-stated area and rent observations. Rent is asking, marketed-uncommitted,
   base, monetary-per-area, annual when the source explicitly supplies annual
   convention, square-feet, NNN, current or prospective only with supported temporal
   context, and source-stated. The OM edition is containing source; its page/table is
   evidence. It remains pending until admitted and has no underwriting authority.

2. **Executed contractual rent.** A rent roll row for DentalCo, Suite 110, 3,000 SF,
   $108,000 annual base rent, and expiration 12/31/2031 creates source-stated area,
   absolute annual base-rent, and lease-expiration assertions. Commitment is
   `reported_contractual` unless execution is independently established. A separate
   $36/SF/year observation is `deterministic_derived`, citing the admitted $108,000
   and 3,000 SF observations plus a versioned division/rounding method. Publication
   and acquisition dates do not become rent as-of dates.

3. **Rent steps.** Years 1–5 at $35/SF and years 6–10 at $38/SF are two executed,
   contractual, base, per-SF annual observations with distinct effective intervals.
   Both survive. The second is future-scheduled before its effective interval, not a
   mutation of the first.

4. **Unidentified suite.** “Starbucks — 2,200 SF — $45/SF” creates no canonical
   premises. It supports an unresolved tenancy at the property or building, a
   reported area observation, and a rent observation whose subjects include the
   resolved tenant/brand and container. A source-scoped label may be retained. Later
   “Suite A — 2,180 SF” creates a premises only if independently distinguishable and
   a resolution proposal; neither area is overwritten.

5. **Amendment.** The original lease instrument supports $30/SF over its effective
   period. A First Amendment instrument `amends` it and supports $33/SF beginning
   January 2027 at month precision. Both contractual observations remain. The new
   effective observation governs retrieval after its supported start but does not
   alter the historical assertion.

6. **Conflicting editions.** A 2025 OM reporting 96% occupancy and a 2026 OM
   reporting 92% create separate source-stated observations with distinct as-of or
   reporting contexts. Neither automatically supersedes the other. Correction and
   supersession authority are deferred beyond V1 observation relationships.

7. **Repeated evidence.** Rent on pages 4 and 11 and in the executive summary is
   three supporting evidence locations in one edition, one containing-source
   lineage, and zero additional independent corroborators.

8. **Upstream attribution.** A JLL OM containing an Esri demographic table has JLL
   as containing source, Esri as explicitly attributed upstream source, and the JLL
   page/table as evidence location. The demographic assertion is derivative of Esri;
   it cannot count as independent JLL corroboration of the same Esri dataset.

9. **Identical artifact twice.** Broker-email and deal-room downloads create two
   acquisitions pointing to one digest-defined artifact and source edition when
   reconciled. Corroboration remains `same_artifact`, not two independent assertions.

10. **Human information.** “We just signed the adjacent shop at $40 NNN” is captured
    in an immutable broker-call note source edition with speaker, recorder, and call
    timing. A human-entered, reported-contractual rent proposal may cite the note,
    subjects, and supported temporal assertion. It still requires admission, does
    not prove an executed lease, and carries no underwriting authority.

Each example has identified or explicitly unresolved subjects, orthogonal semantic
classification, non-manufactured temporal meaning, origin, source lineage, evidence,
admission state, and an explicit absence of underwriting authority.

### Deferred concepts

Phase 4C.2.0 does not define database tables or implement recoveries, concessions,
effective rent, percentage-rent breakpoints, options beyond classification, complete
lease-event mechanics, demographics, traffic, visitation, T12/operating results,
sales comps, parcel observations, entity automation, candidate promotion, comparable
retrieval, recommendations, assumption application, or UI.

## Security

Every Phase 4C.1 table enables RLS and has no browser policy. `PUBLIC`, `anon`, and
`authenticated` receive no table privileges. Only server-side `service_role` receives
table privileges. Immutable source editions, artifact identity/acquisition lineage,
source relationships, and entity-resolution history are protected by database
append-only triggers.
