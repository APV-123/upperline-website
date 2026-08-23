import type {
  AssertionBasis, CandidateDestination, CandidateUnit, CandidateValueType, EconomicRole,
} from './contracts';

export type DestinationCardinality = 'scalar' | 'set';
export type FuturePromotionEligibility =
  'none' | 'opportunity' | 'underwriting' | 'opportunity_or_underwriting';

export type SourceDestinationDefinition = {
  domain: 'source';
  fieldPath: string;
  expectedValueType: CandidateValueType;
  allowedUnits: readonly CandidateUnit[];
  cardinality: DestinationCardinality;
  allowedAssertionBases: readonly AssertionBasis[];
  futurePromotionEligibility: FuturePromotionEligibility;
};

const ALL_EXTRACTION_BASES = [
  'source_stated', 'deterministically_derived', 'visual_inference', 'model_inference',
] as const satisfies readonly AssertionBasis[];

const source = (
  fieldPath: string,
  expectedValueType: CandidateValueType,
  allowedUnits: readonly CandidateUnit[],
  cardinality: DestinationCardinality,
  futurePromotionEligibility: FuturePromotionEligibility = 'none',
): SourceDestinationDefinition => ({
  domain: 'source', fieldPath, expectedValueType, allowedUnits, cardinality,
  allowedAssertionBases: ALL_EXTRACTION_BASES, futurePromotionEligibility,
});

export const LAND_FLYER_SOURCE_DESTINATIONS = {
  'document.title': source('document.title', 'text', ['NONE'], 'scalar'),
  'property.marketedType': source('property.marketedType', 'text', ['NONE'], 'scalar'),
  'location.intersection': source('location.intersection', 'text', ['NONE'], 'scalar'),
  'land.areaAcres': source('land.areaAcres', 'decimal', ['ACRES'], 'scalar', 'opportunity_or_underwriting'),
  'land.areaSf': source('land.areaSf', 'decimal', ['SF'], 'scalar', 'opportunity_or_underwriting'),
  'tract.divisible': source('tract.divisible', 'boolean', ['NONE'], 'scalar'),
  'tract.minimumAreaAcres': source('tract.minimumAreaAcres', 'decimal', ['ACRES'], 'scalar'),
  'pricing.askingPrice': source('pricing.askingPrice', 'decimal', ['USD'], 'scalar', 'opportunity'),
  'pricing.askingPricePerLandSf': source('pricing.askingPricePerLandSf', 'decimal', ['USD_PER_LAND_SF'], 'scalar', 'underwriting'),
  'site.zoning': source('site.zoning', 'text', ['NONE'], 'scalar'),
  'site.utilities': source('site.utilities', 'text', ['NONE'], 'set'),
  'site.detentionClaim': source('site.detentionClaim', 'text', ['NONE'], 'scalar'),
  'site.floodplainClaim': source('site.floodplainClaim', 'text', ['NONE'], 'scalar'),
  'site.wetlandsClaim': source('site.wetlandsClaim', 'text', ['NONE'], 'scalar'),
  'site.easementClaim': source('site.easementClaim', 'text', ['NONE'], 'scalar'),
  'site.pipelineClaim': source('site.pipelineClaim', 'text', ['NONE'], 'scalar'),
  'site.wellClaim': source('site.wellClaim', 'text', ['NONE'], 'scalar'),
  'site.cityLimitStatus': source('site.cityLimitStatus', 'text', ['NONE'], 'scalar'),
  'site.etjStatus': source('site.etjStatus', 'text', ['NONE'], 'scalar'),
  'site.municipalDistrict': source('site.municipalDistrict', 'text', ['NONE'], 'scalar'),
  'site.tirz': source('site.tirz', 'text', ['NONE'], 'scalar'),
  'access.roadName': source('access.roadName', 'text', ['NONE'], 'set'),
  'access.frontageFeet': source('access.frontageFeet', 'decimal', ['FEET'], 'set'),
  'access.pointDescription': source('access.pointDescription', 'text', ['NONE'], 'set'),
  'access.signalizedIntersectionClaim': source('access.signalizedIntersectionClaim', 'text', ['NONE'], 'scalar'),
  'traffic.vehiclesPerDay': source('traffic.vehiclesPerDay', 'integer', ['VEHICLES_PER_DAY'], 'set'),
  'broker.brokerage': source('broker.brokerage', 'text', ['NONE'], 'scalar', 'opportunity'),
  'broker.contactName': source('broker.contactName', 'text', ['NONE'], 'set', 'opportunity'),
  'broker.phone': source('broker.phone', 'text', ['NONE'], 'set', 'opportunity'),
  'broker.email': source('broker.email', 'text', ['NONE'], 'set', 'opportunity'),
  'marketing.suggestedUse': source('marketing.suggestedUse', 'text', ['NONE'], 'set'),
} as const satisfies Record<string, SourceDestinationDefinition>;

export type LandFlyerSourceFieldPath = keyof typeof LAND_FLYER_SOURCE_DESTINATIONS;

export function getSourceDestinationDefinition(
  fieldPath: string,
): SourceDestinationDefinition | null {
  return LAND_FLYER_SOURCE_DESTINATIONS[fieldPath as LandFlyerSourceFieldPath] ?? null;
}

export type LandFlyerCandidateContract = {
  destination: CandidateDestination;
  valueType: CandidateValueType;
  unit: CandidateUnit | null;
  assertionBasis: AssertionBasis;
  economicRole: EconomicRole;
};
