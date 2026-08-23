import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('PDF acquisition server/client boundary', () => {
  const serverModules = [
    'src/lib/opportunities/ingestion/pdf-storage-config.ts',
    'src/lib/opportunities/ingestion/supabase-pdf-object-store.ts',
    'src/lib/opportunities/ingestion/supabase-pdf-ingestion-repository.ts',
    'src/lib/opportunities/ingestion/pdf-verification.ts',
  ];

  it.each(serverModules)('%s is explicitly server-only', path => {
    expect(read(path).split(/\r?\n/).slice(0, 3).join('\n')).toContain("import 'server-only'");
  });

  it('does not export server infrastructure from the client-safe ingestion barrel', () => {
    const barrel = read('src/lib/opportunities/ingestion/index.ts');
    expect(barrel).not.toMatch(/supabase-pdf|pdf-storage-config|pdf-verification/);
  });

  it('contains no public URL, broad list, prefix deletion, or upsert behavior', () => {
    const storage = read('src/lib/opportunities/ingestion/supabase-pdf-object-store.ts');
    expect(storage).not.toContain('getPublicUrl');
    expect(storage).not.toMatch(/\.list\s*\(/);
    expect(storage).not.toContain('upsert: true');
    expect(storage).toContain('upsert: false');
    expect(storage).toContain('remove([path])');
  });

  it('keeps service-role and public environment configuration out of acquisition modules', () => {
    const combined = serverModules.map(read).join('\n');
    expect(combined).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(combined).not.toContain('NEXT_PUBLIC_');
    expect(combined).not.toContain('console.log');
  });

  it('declares a Vercel-compatible Node runtime satisfying the structural parser', () => {
    const applicationPackage = JSON.parse(read('package.json')) as {
      engines?: { node?: string };
    };
    const parserPackage = JSON.parse(read('node_modules/pdfjs-dist/package.json')) as {
      version?: string;
      engines?: { node?: string };
      optionalDependencies?: Record<string, string>;
    };

    expect(applicationPackage.engines?.node).toBe('>=22.13.0 <23');
    expect(parserPackage.version).toBe('6.2.108');
    expect(parserPackage.engines?.node).toBe('>=22.13.0 || >=24');
    expect(parserPackage.optionalDependencies).toHaveProperty('@napi-rs/canvas');

    const [major, minor] = process.versions.node.split('.').map(Number);
    expect(major).toBe(22);
    expect(minor).toBeGreaterThanOrEqual(13);
  });
});
