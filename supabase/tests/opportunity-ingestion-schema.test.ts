import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260822000100_create_opportunity_ingestion_foundation.sql'), 'utf8');

describe('Opportunity ingestion migration contract', () => {
  it('creates only the six ingestion tables with private RLS', () => {
    expect([...sql.matchAll(/create table public\.(\w+)/gi)].map(x => x[1])).toEqual([
      'opportunity_ingestions', 'opportunity_source_artifacts', 'opportunity_extraction_runs',
      'opportunity_candidate_facts', 'opportunity_candidate_fact_evidence',
      'opportunity_candidate_fact_decisions',
    ]);
    expect(sql.match(/enable row level security/gi)).toHaveLength(6);
    expect(sql).not.toMatch(/create\s+policy/i);
    expect(sql).toMatch(/revoke all[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant all[\s\S]*to service_role/);
  });

  it('keeps candidates untrusted and separate from authoritative provenance', () => {
    expect(sql).toContain('Untrusted extraction output');
    expect(sql).not.toMatch(/insert into public\.opportunity_field_provenance/i);
    expect(sql).not.toMatch(/create\s+function\s+public\.apply_/i);
  });

  it('enforces aggregate-safe relationships and deterministic uniqueness', () => {
    expect(sql).toMatch(/foreign key \(artifact_id, ingestion_id\)[\s\S]*references public\.opportunity_source_artifacts\(id, ingestion_id\)/);
    expect(sql).toMatch(/foreign key \(extraction_run_id, artifact_id, ingestion_id\)[\s\S]*references public\.opportunity_extraction_runs/);
    expect(sql).toMatch(/foreign key \(candidate_fact_id, extraction_run_id, artifact_id, ingestion_id\)/);
    expect(sql).toContain('opportunity_source_artifacts_digest_identity_key');
    expect(sql).toContain('opportunity_extraction_runs_idempotency_key');
    expect(sql).toContain('opportunity_candidate_facts_run_fingerprint_key');
  });

  it('preserves the two-axis semantics and canonical values', () => {
    for (const value of ['source_stated', 'deterministically_derived', 'system_proposed',
      'descriptive_fact', 'contractual_fact', 'source_assumption', 'upperline_assumption']) {
      expect(sql).toContain(`'${value}'`);
    }
    expect(sql).toContain('opportunity_candidate_value_valid');
    expect(sql).toMatch(/confidence between 0 and 1/);
    expect(sql).toMatch(/candidate_tenant_key uuid/);
  });

  it('protects artifact, run, candidate, evidence, and decision history', () => {
    expect(sql).toContain('ingestion_artifact_identity_immutable');
    expect(sql).toContain('completed_extraction_run_immutable');
    expect(sql.match(/append_only before update or delete/g)).toHaveLength(3);
    expect(sql).toContain('artifact_opportunity_source_relationship_invalid');
    expect(sql).toContain('artifact_opportunity_source_attachment_immutable');
    expect(sql).toContain('terminal_extraction_output_immutable');
    expect(sql).toContain('opportunity_candidate_fact_decisions_candidate_number_key');
  });

  it('does not create storage, extraction, URL, AI, or application infrastructure', () => {
    expect(sql).not.toMatch(/storage\.buckets|storage\.objects|http_request|net\.http|openai|ocr|pdf_parse/i);
  });
});
