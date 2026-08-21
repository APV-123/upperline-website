import 'server-only';

export type { OpportunityActor } from './actor';
export { requireUpperlineUser } from './actor';
export { OpportunityApplicationError } from './errors';
export * from './dtos';
export * from './provenance';
export * from './services';
export { SupabaseOpportunityRepository } from '../persistence/repository';
export type { OpportunityRepository } from '../persistence/repository';
