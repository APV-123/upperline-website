import { describe, expect, it } from 'vitest';
import type { IntelligenceEntityType, SourceEditionPublication, SourceRelationshipType } from './contracts';
import { PROPERTY_INTELLIGENCE_CONTRACT_VERSION } from './contracts';

describe('property intelligence identity/source contract', () => {
  it('versions the Phase 4C.1 boundary independently from observations', () => {
    expect(PROPERTY_INTELLIGENCE_CONTRACT_VERSION).toBe('property-intelligence-identity-source-v1');
  });
  it('reserves reviewed future subject identities without defining observation values', () => {
    const kinds: IntelligenceEntityType[] = ['property_site','parcel','building','premises','organization','brand','road','road_segment','traffic_station','geographic_study_area'];
    expect(kinds).toHaveLength(10);
  });
  it('represents publication precision without manufacturing a date', () => {
    const yearOnly: SourceEditionPublication = { precision: 'year', year: 2026, month: null, day: null };
    expect(yearOnly).toEqual({ precision: 'year', year: 2026, month: null, day: null });
  });
  it('supports direct and attributed source lineage', () => {
    const relationships: SourceRelationshipType[] = ['cites','attributes_to','embeds_summary_of','derived_from','revises','supersedes'];
    expect(relationships).toContain('embeds_summary_of');
    expect(relationships).toContain('attributes_to');
  });
});
