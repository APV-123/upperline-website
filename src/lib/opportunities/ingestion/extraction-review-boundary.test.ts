import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs'; import { join } from 'node:path';
const root = process.cwd();
describe('extraction review boundary', () => {
  it('exposes an authenticated GET-only route with server-owned run selection', () => {
    const route = readFileSync(join(root,'src/app/api/opportunities/[id]/extraction-review/route.ts'),'utf8');
    const repository = readFileSync(join(root,'src/lib/opportunities/ingestion/supabase-extraction-review-repository.ts'),'utf8');
    expect(route).toContain('authenticatedOpportunityEndpoint'); expect(route).toMatch(/export async function GET/);
    expect(route).not.toMatch(/POST|PATCH|DELETE|runId|SUPABASE_SERVICE_ROLE_KEY/);
    expect(repository).toContain(".eq('status', 'succeeded')"); expect(repository).toContain('logical_extraction_key');
    expect(repository).toContain('currentExtractionLogicalKey'); expect(repository).toContain('b.attempt_number - a.attempt_number');
    expect(repository).toContain(".eq('opportunity_id', opportunityId)"); expect(repository).toContain("import 'server-only'");
  });
  it('keeps repository authority and sensitive material out of the review client', () => {
    const component = readFileSync(join(root,'src/components/opportunities/OpportunityExtractionReview.tsx'),'utf8');
    expect(component).not.toMatch(/SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|method:\s*['"](?:POST|PATCH|DELETE)/);
    expect(component).toContain("method: 'PUT'"); expect(component).toContain('Approve'); expect(component).toContain('Reject');
    expect(component).not.toMatch(/Promote Opportunity|reviewerEmail|acceptedValue|candidate_fingerprint/);
    expect(component).not.toMatch(/dangerouslySetInnerHTML|innerHTML|raw provider/i);
    expect(component).toContain('{evidence.snippet}');
    expect(component).toContain('Confidence: Not provided');
    expect(component).toContain('No successful extraction exists for the current server-configured contract.');
    expect(component).toContain('Previous extraction history');
    expect(component).toContain('No candidate extracted');
  });
});
