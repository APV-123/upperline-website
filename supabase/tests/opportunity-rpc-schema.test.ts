import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const phase2Path = resolve(
  process.cwd(),
  'supabase/migrations/20260821000100_create_acquisition_opportunities.sql'
);
const rpcPath = resolve(
  process.cwd(),
  'supabase/migrations/20260821000200_create_opportunity_transaction_rpcs.sql'
);
const phase2 = readFileSync(phase2Path);
const sql = readFileSync(rpcPath, 'utf8');

const rpcNames = [
  'create_opportunity_underwriting_draft',
  'set_active_opportunity_underwriting',
  'replace_opportunity_field_provenance',
  'clone_opportunity_underwriting_version',
] as const;

describe('Opportunity transactional RPC migration', () => {
  it('does not change the production-applied Phase 2 artifact', () => {
    expect(createHash('sha256').update(phase2).digest('hex')).toBe(
      '5168ac28b014d0d615b7039b1fa36c6a9a0fb249d3db0782fb814c566ad0e29d'
    );
  });

  it.each(rpcNames)('creates and secures %s', (name) => {
    expect(sql).toMatch(new RegExp(`create function public\\.${name}\\(`, 'i'));
    expect(sql).toMatch(
      new RegExp(`revoke execute on function public\\.${name}\\([\\s\\S]*?from public;`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(`revoke execute on function public\\.${name}\\([\\s\\S]*?from anon;`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(`revoke execute on function public\\.${name}\\([\\s\\S]*?from authenticated;`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role;`, 'i')
    );
  });

  it('uses invoker rights and a fixed empty search path for every RPC', () => {
    expect(sql.match(/security invoker/gi)).toHaveLength(4);
    expect(sql.match(/set search_path = ''/gi)).toHaveLength(4);
    expect(sql).not.toMatch(/security definer/i);
  });

  it('contains no dynamic SQL or browser execution grants', () => {
    expect(sql).not.toMatch(/\bexecute\s+(format\s*\(|[a-z_][a-z0-9_]*\s*;)/i);
    expect(sql).not.toMatch(/grant execute[\s\S]*?to (public|anon|authenticated)/i);
  });

  it('keeps economics and finalization out of the RPC surface', () => {
    expect(sql).not.toMatch(/calculate_retail|finalize_opportunity/i);
    expect(sql).not.toMatch(/update_opportunity_underwriting_draft/i);
  });
});
