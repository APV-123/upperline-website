import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { opportunityError } from '@/lib/opportunities/application/errors';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { executeProvenanceCommand,getProvenanceReadiness } from '@/lib/intelligence/provenance-resolution/service';
import { SupabaseProvenanceResolutionRepository } from '@/lib/intelligence/provenance-resolution/supabase-repository';
const repository=()=>new SupabaseProvenanceResolutionRepository(createOpportunitySupabaseClient());
export async function POST(request:Request){return authenticatedOpportunityEndpoint(async actor=>{let body:unknown;try{body=await request.json()}catch{throw opportunityError('validation','Request must contain valid JSON.')}return executeProvenanceCommand(body,actor,repository())})}
export async function GET(request:Request){return authenticatedOpportunityEndpoint(async()=>{const id=new URL(request.url).searchParams.get('artifactAcquisitionId');if(!id)throw opportunityError('validation','artifactAcquisitionId is required.');return getProvenanceReadiness(id,repository())})}
