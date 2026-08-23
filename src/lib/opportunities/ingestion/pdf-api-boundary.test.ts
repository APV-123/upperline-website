import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('PDF acquisition route boundary', () => {
  const begin = 'src/app/api/opportunities/[id]/pdf-ingestions/route.ts';
  const verify = 'src/app/api/opportunities/[id]/pdf-ingestions/[ingestionId]/verify/route.ts';
  it.each([begin, verify])('%s is authenticated and explicitly Node-only', path => {
    const source = read(path);
    expect(source).toContain("export const runtime = 'nodejs'");
    expect(source).toContain('authenticatedOpportunityEndpoint');
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE|NEXT_PUBLIC_|console\.|EdgeRuntime/);
  });
  it('keeps parser, Storage, and database composition server-only', () => {
    const server = read('src/lib/opportunities/ingestion/pdf-api.ts');
    expect(server.split(/\r?\n/).slice(0, 3).join('\n')).toContain("import 'server-only'");
    const client = read('src/components/opportunities/OpportunityFlyer.tsx');
    expect(client).not.toMatch(/pdf-api|pdf-verification|supabase-pdf|pdfjs-dist|node:crypto/);
    expect(client).not.toMatch(/bucket|objectPath|artifactId|sha256/);
  });
});
