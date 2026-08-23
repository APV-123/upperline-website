import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260823000200_scope_storage_object_policies.sql'), 'utf8');

describe('Storage policy remediation migration contract', () => {
  it('drops exactly the four reviewed global predecessor policies', () => {
    expect([...sql.matchAll(/drop policy "([^"]+)" on storage\.objects/gi)].map(x => x[1])).toEqual([
      'Allow public read 1c1bq73_0', 'Allow public uploads 148yprt_0',
      'Allow public uploads 1c1bq73_0', 'Display Image',
    ]);
  });

  it('creates only bucket-scoped anonymous INSERT policies for public distribution', () => {
    const creates = sql.slice(sql.toLowerCase().indexOf('create policy'));
    expect(creates.match(/create policy/gi)).toHaveLength(2);
    expect(creates.match(/for insert\s+to anon/gi)).toHaveLength(2);
    expect(creates).toMatch(/with check \(bucket_id = 'deal-images'\)/i);
    expect(creates).toMatch(/with check \(bucket_id = 'deal-documents-public'\)/i);
    expect(creates).not.toMatch(/^\s*to\s+(?:public|authenticated)\b/im);
  });

  it('grants no read, overwrite, delete, private-bucket, or future-bucket access', () => {
    const creates = sql.slice(sql.toLowerCase().indexOf('create policy'));
    expect(creates).not.toMatch(/for (?:select|update|delete|all)/i);
    expect(creates).not.toMatch(/using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i);
    expect(creates).not.toContain('deal-documents-private');
    expect(sql).not.toMatch(/storage\.buckets|create bucket|insert into|update\s+storage|delete from/i);
  });
});
