import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { opportunityError } from '@/lib/opportunities/application/errors';
import { executeHumanProvenanceStage } from '@/lib/intelligence/provenance-resolution/control';
export async function POST(request:Request){return authenticatedOpportunityEndpoint(async actor=>{let body:unknown;try{body=await request.json()}catch{throw opportunityError('validation','Request must contain valid JSON.')}return executeHumanProvenanceStage(body,actor)})}
