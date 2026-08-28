import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { getProvenanceControlModel } from '@/lib/intelligence/provenance-resolution/control';
import { opportunityError } from '@/lib/opportunities/application/errors';
export const runtime='nodejs';
export async function GET(request:Request){return authenticatedOpportunityEndpoint(actor=>{const opportunityId=new URL(request.url).searchParams.get('opportunityId');if(!opportunityId)throw opportunityError('validation','opportunityId is required.');return getProvenanceControlModel(opportunityId,actor)})}
