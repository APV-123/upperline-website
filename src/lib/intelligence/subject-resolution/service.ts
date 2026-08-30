import 'server-only';
import { randomUUID } from 'node:crypto';
import type { OpportunityActor } from '@/lib/opportunities/application/actor-core';
import { opportunityError } from '@/lib/opportunities/application/errors';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import type { PropertyIdentityModel } from './contracts';
import { SupabaseSubjectResolutionRepository } from './supabase-repository';
import { parseResolutionRequest } from './validation';
export async function getPropertyIdentityModel(opportunityId:string,actor:OpportunityActor):Promise<PropertyIdentityModel>{authorize(actor);const repository=new SupabaseSubjectResolutionRepository(createOpportunitySupabaseClient());return {...await repository.getModel(opportunityId),commandId:randomUUID()}}
export async function resolvePropertyIdentity(opportunityId:string,body:unknown,actor:OpportunityActor){authorize(actor);const input=parseResolutionRequest(body);const repository=new SupabaseSubjectResolutionRepository(createOpportunitySupabaseClient());if(input.proposalType==='existing_property'){const model=await repository.getModel(opportunityId);if(!model.possibleMatches.some(x=>x.entityId===input.existingEntityId))throw opportunityError('validation','The selected Property was not an authorized match for this Opportunity.')}return repository.resolve(opportunityId,input,actor.email)}
function authorize(actor:OpportunityActor){if(!actor.email.endsWith('@upperlineco.com'))throw opportunityError('forbidden','Upperline access is required.')}
