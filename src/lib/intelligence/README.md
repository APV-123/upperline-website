# Property Intelligence domain

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

## Security

Every Phase 4C.1 table enables RLS and has no browser policy. `PUBLIC`, `anon`, and
`authenticated` receive no table privileges. Only server-side `service_role` receives
table privileges. Immutable source editions, artifact identity/acquisition lineage,
source relationships, and entity-resolution history are protected by database
append-only triggers.
