import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(process.cwd(), 'src/app/api/opportunities/[id]/source-pdf/route.ts'), 'utf8');
const service = readFileSync(resolve(process.cwd(), 'src/lib/opportunities/ingestion/source-pdf-access.ts'), 'utf8');
const client = readFileSync(resolve(process.cwd(), 'src/components/opportunities/OpportunityExtractionReview.tsx'), 'utf8');

describe('source PDF server/client boundary', () => {
  it('requires the established authenticated Upperline boundary before signing', () => {
    expect(route).toContain('await requireUpperlineUser()');
    expect(route.indexOf('await requireUpperlineUser()')).toBeLessThan(route.lastIndexOf('createOpportunitySourcePdfAccess'));
  });
  it('accepts no browser artifact, bucket, or storage-path authority', () => {
    expect(route).not.toMatch(/artifactId|storageBucket|storagePath/);
    expect(client).not.toMatch(/storage_bucket|storage_path|signedUrl|service.role/i);
    expect(service).toContain(".eq('opportunity_id', opportunityId)");
    expect(service).toContain(".eq('validation_status', 'valid')");
  });
  it('keeps page selection as bounded navigation after server-side object resolution', () => {
    expect(service.indexOf('createExactReadAccess')).toBeLessThan(service.indexOf('url.hash'));
    expect(client).toContain('?page=${evidence.pageNumber}');
    expect(client).toContain('Open source PDF ↗');
  });
});
