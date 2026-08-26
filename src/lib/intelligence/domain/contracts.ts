/** Phase 4C.1 controlled vocabulary. Observation families are intentionally absent. */
export const PROPERTY_INTELLIGENCE_CONTRACT_VERSION = 'property-intelligence-identity-source-v1' as const;

export type IntelligenceEntityType =
  | 'property_site' | 'parcel' | 'building' | 'premises' | 'organization' | 'brand'
  | 'road' | 'road_segment' | 'traffic_station' | 'geographic_study_area';
export type EntityLifecycleStatus = 'provisional' | 'active' | 'inactive' | 'superseded';
export type PropertyDevelopmentState = 'unknown' | 'land' | 'improved' | 'mixed_use' | 'redevelopment';
export type EntityAliasType =
  | 'property_name' | 'former_name' | 'address' | 'parcel_number' | 'road_name'
  | 'suite_number' | 'trade_name' | 'legal_name' | 'other';
export type EntityRelationshipType =
  | 'contains' | 'part_of' | 'adjacent_to' | 'predecessor_of' | 'successor_of'
  | 'associated_with';
export type RelationshipStatus = 'proposed' | 'confirmed' | 'rejected' | 'reversed';
export type OpportunitySubjectRole =
  | 'primary_target' | 'assemblage_component' | 'comparable' | 'adjacent' | 'reference';
export type EntityResolutionBasis =
  | 'manual' | 'external_identifier' | 'address' | 'geometry' | 'name' | 'composite';
export type EntityResolutionDecision = 'confirmed_match' | 'rejected_match' | 'reversed';

export type PublisherType =
  | 'owner' | 'broker' | 'government' | 'data_provider' | 'professional_firm'
  | 'tenant' | 'other';
export type IntelligenceSourceKind =
  | 'offering_memorandum' | 'marketing_material' | 'rent_roll' | 'operating_statement'
  | 'lease' | 'demographic_report' | 'traffic_dataset' | 'parcel_property_data'
  | 'broker_communication' | 'public_dataset' | 'other';
export type SourceAuthorityClass =
  | 'executed_legal_document' | 'owner_operating_record' | 'authoritative_dataset'
  | 'professional_report' | 'marketing_material' | 'broker_communication'
  | 'derived_model_output';
export type PublicationPrecision = 'unknown' | 'year' | 'month' | 'day';
export type ArtifactAcquisitionChannel =
  | 'upload' | 'email' | 'api' | 'download' | 'manual_reference' | 'legacy_link';
export type ArtifactAccessClass = 'private' | 'restricted' | 'internal' | 'public';
export type ArtifactRepresentationRole = 'primary' | 'supplement' | 'embedded' | 'derivative';
export type SourceRelationshipType =
  | 'cites' | 'attributes_to' | 'embeds_summary_of' | 'derived_from' | 'revises'
  | 'supersedes';

export type IntelligenceEntityIdentity = {
  id: string;
  entityType: IntelligenceEntityType;
  displayName: string;
  lifecycleStatus: EntityLifecycleStatus;
};
export type SourceEditionPublication =
  | { precision: 'unknown'; year: null; month: null; day: null }
  | { precision: 'year'; year: number; month: null; day: null }
  | { precision: 'month'; year: number; month: number; day: null }
  | { precision: 'day'; year: number; month: number; day: number };

export type GlobalArtifactIdentity = {
  id: string;
  sha256Digest: string;
  byteSize: string;
  detectedMediaType: string;
};
