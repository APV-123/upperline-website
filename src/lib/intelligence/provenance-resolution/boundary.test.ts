import { readFileSync } from 'node:fs';import { join } from 'node:path';import { describe,expect,it } from 'vitest';
const root=process.cwd();const read=(path:string)=>readFileSync(join(root,path),'utf8');
describe('provenance orchestration boundary',()=>{
  it('keeps service-role repository authority server-only',()=>{const repository=read('src/lib/intelligence/provenance-resolution/supabase-repository.ts');expect(repository).toContain("import 'server-only'");expect(repository).toContain("rpc('create_intelligence_provenance_proposal_v1'");expect(repository).toContain("rpc('decide_intelligence_provenance_proposal_v1'");expect(repository).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete|upsert)/)});
  it('derives authentication through the established server endpoint',()=>{const route=read('src/app/api/intelligence/provenance-resolution/route.ts');expect(route).toContain('authenticatedOpportunityEndpoint');expect(route).not.toMatch(/reviewerEmail|SUPABASE_SERVICE_ROLE_KEY|humanConfirmed/)});
  it('does not reproduce readiness in TypeScript',()=>{for(const file of ['contracts.ts','canonical.ts','validation.ts','service.ts','supabase-repository.ts'])expect(read(`src/lib/intelligence/provenance-resolution/${file}`)).not.toContain("'provenance_ready'")});
});
