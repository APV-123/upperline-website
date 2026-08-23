import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260823000100_amend_land_flyer_extraction_contract.sql'), 'utf8');

const approvedPaths = [
  'document.title', 'property.marketedType', 'location.intersection', 'land.areaAcres',
  'land.areaSf', 'tract.divisible', 'tract.minimumAreaAcres', 'pricing.askingPrice',
  'pricing.askingPricePerLandSf', 'site.zoning', 'site.utilities', 'site.detentionClaim',
  'site.floodplainClaim', 'site.wetlandsClaim', 'site.easementClaim', 'site.pipelineClaim',
  'site.wellClaim', 'site.cityLimitStatus', 'site.etjStatus', 'site.municipalDistrict',
  'site.tirz', 'access.roadName', 'access.frontageFeet', 'access.pointDescription',
  'access.signalizedIntersectionClaim', 'traffic.vehiclesPerDay', 'broker.brokerage',
  'broker.contactName', 'broker.phone', 'broker.email', 'marketing.suggestedUse',
] as const;

describe('land flyer extraction SQL contract', () => {
  it('admits only the exact approved source vocabulary', () => {
    expect(sql).toContain("v_domain='source'");
    for (const path of approvedPaths) expect(sql).toContain(`'${path}'`);
    for (const deferred of ['market.demographicObservation', 'pricing.freeText', 'access.freeText',
      'site.freeText', 'marketing.freeText', 'source.arbitrary']) expect(sql).not.toContain(`'${deferred}'`);
  });

  it('adds only the approved assertion bases and units', () => {
    expect(sql).toContain("'visual_inference','model_inference'");
    for (const unit of ['ACRES', 'USD_PER_LAND_SF', 'FEET', 'VEHICLES_PER_DAY']) {
      expect(sql).toContain(`'${unit}'`);
    }
    expect(sql).not.toMatch(/'MILES'|'PEOPLE'|'HOUSEHOLDS'/);
  });

  it('blocks assumptions at the document extraction boundary', () => {
    expect(sql).toContain("v_candidate->>'economicRole'='upperline_assumption'");
    expect(sql).toContain('document_upperline_assumption_not_allowed');
  });

  it('preserves server-only security and authoritative boundaries', () => {
    expect(sql).toMatch(/set search_path = ''/i);
    expect(sql).toMatch(/revoke execute on function public\.complete_opportunity_extraction_run[\s\S]+from public,anon,authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.complete_opportunity_extraction_run[\s\S]+to service_role/i);
    expect(sql).not.toMatch(/security\s+definer|execute\s+format|dynamic sql/i);
    expect(sql).not.toMatch(/(insert into|update|delete from) public\.(acquisition_opportunities|opportunity_sources|opportunity_underwriting_versions|opportunity_field_provenance|deals)/i);
    expect(sql).not.toMatch(/disable\s+trigger|alter table[\s\S]+disable row level security/i);
  });
});
