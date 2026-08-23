import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const serverFiles = ['extraction-provider.ts', 'fake-extraction-provider.ts', 'extraction-service.ts', 'supabase-extraction-repository.ts'];

describe('extraction server/client boundary', () => {
  it.each(serverFiles)('%s is explicitly server-only', file => {
    expect(readFileSync(join(root, 'src/lib/opportunities/ingestion', file), 'utf8').trimStart()).toMatch(/^import 'server-only';/);
  });
  it('client-safe barrel does not export extraction server internals', () => {
    const barrel = readFileSync(join(root, 'src/lib/opportunities/ingestion/index.ts'), 'utf8');
    for (const file of serverFiles) expect(barrel).not.toContain(file.replace('.ts', ''));
  });
  it('provider boundary has no Supabase, Storage, Opportunity, Deal, or underwriting authority', () => {
    const contracts = readFileSync(join(root, 'src/lib/opportunities/ingestion/extraction-contracts.ts'), 'utf8');
    const request = contracts.slice(contracts.indexOf('export type ExtractionProviderRequest'), contracts.indexOf('export interface ExtractionProviderPort'));
    expect(request).not.toMatch(/Supabase|storagePath|Opportunity|Deal|underwriting|credential|signed/i);
  });
  it('keeps extraction configuration out of the caller-controlled request', () => {
    const service = readFileSync(join(root, 'src/lib/opportunities/ingestion/extraction-service.ts'), 'utf8');
    const request = service.slice(service.indexOf('export type RunExtractionInput'), service.indexOf('export type RunExtractionResult'));
    expect(request).not.toContain('configuration');
    expect(service).toContain('configuration: ExtractionConfiguration;');
  });
  it('uses only existing transaction RPCs for extraction mutations', () => {
    const repository = readFileSync(join(root, 'src/lib/opportunities/ingestion/supabase-extraction-repository.ts'), 'utf8');
    expect(repository).toContain("rpc('allocate_opportunity_extraction_run'");
    expect(repository).toContain("rpc('complete_opportunity_extraction_run'");
    expect(repository).toContain("rpc('fail_opportunity_extraction_run'");
    expect(repository).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  });
});
