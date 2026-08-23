import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('private Deal document trust boundary', () => {
  const dealForm = read('src/components/deals/DealForm.tsx');
  const documentField = read('src/components/deals/DocumentField.tsx');
  const editor = read('src/components/deals/DocumentsEditor.tsx');
  const route = read('src/app/api/deals/[dealId]/private-documents/upload-authorization/route.ts');
  const server = read('src/lib/deals/private-document-upload-server.ts');
  const combinedBrowser = `${dealForm}\n${documentField}\n${editor}`;

  it('routes every private Deal upload through the signed helper', () => {
    expect(combinedBrowser).toContain('uploadPrivateDealDocument');
    expect(combinedBrowser).not.toContain("uploadFile(file, 'deal-documents-private'");
    expect(combinedBrowser).not.toMatch(/\.from\(['"]deal-documents-private['"]\)[\s\S]*?\.upload\s*\(/);
    expect(combinedBrowser).not.toMatch(/getPublicUrl\([^)]*deal-documents-private/);
    expect(combinedBrowser).toContain('documentType="investment_memorandum"');
    expect(combinedBrowser).toContain('documentType="financial_model"');
  });

  it('keeps actor resolution and server-only authority at the route boundary', () => {
    expect(route).toContain("runtime = 'nodejs'");
    expect(route).toContain('await requireUpperlineUser()');
    expect(server).toContain("import 'server-only'");
    expect(server).toContain("PRIVATE_DEAL_DOCUMENT_BUCKET");
    expect(server).toContain('createSignedUploadUrl(objectPath, { upsert: false })');
    expect(server).not.toMatch(/process\.env\.(?:NEXT_PUBLIC|SUPABASE_SERVICE_ROLE_KEY)/);
    expect(`${route}\n${server}`).not.toMatch(/console\.(?:log|error|warn)/);
  });

  it('does not change private read, public document, or image call sites', () => {
    for (const path of [
      'src/app/api/deals/[dealId]/ca/access/route.ts',
      'src/app/api/deals/[dealId]/ca/proforma-access/route.ts',
      'src/app/api/deals/[dealId]/ca/submit/route.ts',
    ]) expect(read(path)).toContain('.createSignedUrl(');
    expect(combinedBrowser).toContain("bucket: 'deal-documents-public' | 'deal-documents-private'");
    expect(dealForm).toContain("bucket = 'deal-images'");
  });
});
