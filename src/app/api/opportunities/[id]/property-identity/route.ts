import { authenticatedOpportunityEndpoint } from '@/lib/opportunities/ui/server';
import { opportunityError } from '@/lib/opportunities/application/errors';
import { getPropertyIdentityModel,resolvePropertyIdentity } from '@/lib/intelligence/subject-resolution';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;return authenticatedOpportunityEndpoint(actor=>getPropertyIdentityModel(id,actor))}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;return authenticatedOpportunityEndpoint(async actor=>{let body:unknown;try{body=await request.json()}catch{throw opportunityError('validation','Request must contain valid JSON.')}await resolvePropertyIdentity(id,body,actor);return getPropertyIdentityModel(id,actor)})}
