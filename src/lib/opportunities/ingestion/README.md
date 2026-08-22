# Opportunity ingestion domain

This provider-neutral domain describes immutable artifacts, repeatable extraction
runs, untrusted candidate facts/evidence, and append-only human decisions. Candidate
destinations reuse authoritative Opportunity provenance identities, but candidates
never become authoritative merely by being persisted.

Economic decimals and confidence enter application code as exact canonical strings.
Tenant destinations use an ingestion-scoped UUID plus a tenant-relative field path;
array indexes are never identity. Fingerprints are deterministic SHA-256 hashes of
canonical JSON and deduplicate identical candidates only within one extraction run.
