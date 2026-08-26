import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260825000100_create_property_intelligence_identity_source_foundation.sql'), 'utf8');

const tables = [
  'intelligence_publishers','intelligence_sources','intelligence_source_editions',
  'intelligence_source_authority_assessments',
  'intelligence_entities','intelligence_property_sites','intelligence_entity_aliases',
  'intelligence_entity_external_identifiers','intelligence_entity_relationships',
  'intelligence_opportunity_subjects','intelligence_entity_resolution_proposals',
  'intelligence_entity_resolution_decisions','intelligence_artifacts',
  'intelligence_artifact_acquisitions','intelligence_source_edition_artifacts',
  'intelligence_source_relationships',
] as const;

describe('Phase 4C.1 property intelligence SQL contract', () => {
  it('creates only the reviewed identity and source foundation', () => {
    for (const table of tables) expect(sql).toMatch(new RegExp(`create table public\\.${table} \\(`, 'i'));
    expect(sql).not.toMatch(/create table public\..*(observation|evidence|rent|lease|demographic|traffic|visitation|footfall|assumption)/i);
    expect(sql).not.toMatch(/postgis|geometry\s*\(|geography\s*\(/i);
  });

  it('keeps Opportunity as a relationship context and protects durable identity', () => {
    expect(sql).toMatch(/intelligence_opportunity_subjects[\s\S]+references public\.acquisition_opportunities\(id\) on delete restrict/i);
    expect(sql).toContain("'primary_target','assemblage_component','comparable','adjacent','reference'");
    expect(sql).toContain('intelligence_entity_identity_immutable');
    expect(sql).not.toContain('create unique index intelligence_entity_external_identifiers_current_idx');
    expect(sql).toContain('intelligence_entity_resolution_unordered_pair_idx');
    expect(sql).toContain('intelligence_resolution_decisions_validate_sequence');
    expect(sql).toContain('intelligence_resolution_decision_sequence_invalid');
    expect(sql).not.toMatch(/on delete cascade[\s\S]*intelligence_entities/i);
  });

  it('reserves the approved subject vocabulary without implementing typed objects beyond property/site', () => {
    for (const type of ['property_site','parcel','building','premises','organization','brand','road','road_segment','traffic_station','geographic_study_area']) {
      expect(sql).toContain(`'${type}'`);
    }
    expect(sql).toMatch(/create table public\.intelligence_property_sites/i);
    expect(sql).not.toMatch(/create table public\.intelligence_(parcels|buildings|premises|organizations|brands|roads|road_segments|traffic_stations|geographic_study_areas)/i);
  });

  it('models source edition, global bytes, acquisition, and attributed lineage independently', () => {
    expect(sql).toContain('intelligence_artifacts_content_identity_key unique (sha256_digest)');
    expect(sql).toContain('legacy_opportunity_artifact_id uuid unique');
    expect(sql).toContain('intelligence_legacy_artifact_identity_mismatch');
    expect(sql).toContain('intelligence_legacy_artifact_opportunity_mismatch');
    for (const relationship of ['cites','attributes_to','embeds_summary_of','derived_from','revises','supersedes']) {
      expect(sql).toContain(`'${relationship}'`);
    }
    expect(sql).toContain('intelligence_source_relationships_edition_source_fkey');
    expect(sql).toContain('intelligence_source_relationships_identity_key unique nulls not distinct');
    expect(sql).toContain("relationship_type not in ('revises','supersedes') or attributed_source_edition_id is not null");
    expect(sql).toContain('intelligence_source_edition_artifacts_identity_key unique (source_edition_id, artifact_id)');
    expect(sql).toContain("not is_primary or representation_role = 'primary'");
    expect(sql).toContain('intelligence_artifact_acquisitions_legacy_channel_check');
  });

  it('preserves unknown publication precision rather than manufacturing dates', () => {
    expect(sql).toContain("publication_precision = 'unknown' and publication_year is null");
    expect(sql).toContain("publication_precision = 'year' and publication_year is not null and publication_month is null");
    expect(sql).not.toMatch(/published_at timestamptz|coalesce\(publication/i);
  });

  it('keeps source authority independently reviewable and append-only', () => {
    expect(sql).toMatch(/create table public\.intelligence_source_authority_assessments/i);
    const editionDefinition = sql.match(
      /create table public\.intelligence_source_editions \(([\s\S]*?)\n\);/i,
    )?.[1];
    expect(editionDefinition).toBeDefined();
    expect(editionDefinition).not.toContain('authority_class');
    expect(sql).toContain('intelligence_source_authority_assessment_key unique (source_edition_id, assessment_number)');
    expect(sql).toContain('intelligence_source_authority_assessments_append_only');
    expect(sql).toContain('intelligence_source_authority_assessments_validate_sequence');
    expect(sql).toContain('intelligence_source_authority_sequence_invalid');
  });

  it('is private by default and grants no browser authority', () => {
    for (const table of tables) expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    expect(sql).not.toMatch(/create policy|disable row level security/i);
    expect(sql).toMatch(/revoke all on table[\s\S]+from public, anon, authenticated/i);
    expect(sql).toMatch(/grant select, insert, update, delete on table[\s\S]+to service_role/i);
    expect(sql).not.toMatch(/security definer|execute\s+format|dynamic sql/i);
  });

  it('protects immutable source, artifact, acquisition, and resolution history', () => {
    for (const trigger of ['publishers_append_only','sources_append_only','source_editions_append_only','source_authority_assessments_append_only','artifacts_append_only','artifact_acquisitions_append_only','source_edition_artifacts_append_only','source_relationships_append_only','resolution_proposals_append_only','resolution_decisions_append_only']) {
      expect(sql).toContain(`intelligence_${trigger}`);
    }
    expect(sql).toContain('intelligence_history_append_only');
  });
});
