import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
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
      dependencies?: Record<string, string>;
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
    expect(applicationPackage.dependencies?.['@napi-rs/canvas']).toBe('1.0.7');

    const nextConfig = read('next.config.ts');
    expect(nextConfig).toContain('serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"]');
    expect(nextConfig).toContain('"/api/opportunities/*/pdf-ingestions/*/verify"');
    expect(nextConfig).toContain('"./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"');

    const [major, minor] = process.versions.node.split('.').map(Number);
    expect(major).toBe(22);
    expect(minor).toBeGreaterThanOrEqual(13);
  });

  it('makes the production build enforce the server runtime trace contract', () => {
    const applicationPackage = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
    expect(applicationPackage.scripts?.build).toContain('node scripts/verify-pdf-runtime-trace.mjs');

    const traceCheck = read('scripts/verify-pdf-runtime-trace.mjs');
    expect(traceCheck).toContain('pdfjs-dist\\/legacy\\/build\\/pdf');
    expect(traceCheck).toContain('pdf\\.worker\\.mjs');
    expect(traceCheck).toContain('@napi-rs\\/canvas-');
    expect(traceCheck).toContain("resolve(root, '.next/static')");
  });

  it('evaluates the real PDF.js Node entrypoint with supported graphics primitives in a clean process', () => {
    const probe = spawnSync(process.execPath, ['--input-type=module', '--eval', [
      "await import('pdfjs-dist/legacy/build/pdf.mjs');",
      "if (typeof globalThis.DOMMatrix !== 'function') throw new Error('DOMMatrix unavailable');",
      "if (typeof globalThis.Path2D !== 'function') throw new Error('Path2D unavailable');",
    ].join('\n')], { cwd: root, encoding: 'utf8' });
    expect({ status: probe.status, stderr: probe.stderr }).toEqual({ status: 0, stderr: '' });
  });

  it('loads PDF.js lazily inside structural inspection and never statically at route evaluation', () => {
    const verification = read('src/lib/opportunities/ingestion/pdf-verification.ts');
    expect(verification).toContain("await import('@napi-rs/canvas')");
    expect(verification).toContain("await import('pdfjs-dist/legacy/build/pdf.mjs')");
    expect(verification).not.toMatch(/^import .*pdfjs-dist/m);
  });
});
