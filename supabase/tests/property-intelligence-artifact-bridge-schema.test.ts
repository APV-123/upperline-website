import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260829000100_ensure_opportunity_intelligence_artifact_bridge.sql'), 'utf8');

describe('Opportunity to Property Intelligence artifact bridge SQL contract', () => {
  it('derives one eligible verified PDF from the Opportunity inside the database', () => {
    expect(sql).toContain('ensure_opportunity_intelligence_artifact_bridge');
    expect(sql).toContain("ingestion.opportunity_id = p_opportunity_id");
    expect(sql).toContain("artifact.validation_status = 'valid'");
    expect(sql).toContain("artifact.detected_mime_type = 'application/pdf'");
    expect(sql).toMatch(/order by artifact\.created_at desc, artifact\.id desc/i);
  });
  it('serializes global digest and acquisition identity and converges with unique constraints', () => {
    expect(sql).toContain("pg_advisory_xact_lock(pg_catalog.hashtextextended('intelligence-artifact:'");
    expect(sql).toContain("pg_advisory_xact_lock(pg_catalog.hashtextextended('intelligence-acquisition:'");
    expect(sql).toContain('on conflict (sha256_digest) do nothing');
    expect(sql).toContain('on conflict (legacy_opportunity_artifact_id) do nothing');
    expect(sql).toContain('intelligence_bridge_global_artifact_mismatch');
    expect(sql).toContain('intelligence_bridge_acquisition_mismatch');
  });
  it('creates no provenance authority or observations', () => {
    expect(sql).not.toMatch(/insert into public\.(intelligence_provenance|intelligence_resolution|intelligence_source|intelligence_observation)/i);
    expect(sql).not.toMatch(/opportunity_extraction_runs|candidate_fact/);
  });
  it('derives immutable encounter audit metadata from the legacy artifact', () => {
    expect(sql).toMatch(/legacy\.created_by_email, legacy\.acquired_at/i);
    expect(sql).not.toMatch(/lower\(btrim\(p_actor_email\)\), legacy\.(?:created_at|acquired_at)/i);
  });
  it('is service-role-only, invoker-security, and fixed-search-path', () => {
    expect(sql).toMatch(/security invoker\s+set search_path = ''/i);
    expect(sql).toMatch(/revoke all on function[\s\S]+from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function[\s\S]+to service_role/i);
  });
});
