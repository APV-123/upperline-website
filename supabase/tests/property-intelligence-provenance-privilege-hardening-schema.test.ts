import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260828000200_harden_property_intelligence_provenance_privileges.sql'), 'utf8')

describe('Phase 4C.3.2B.1H provenance privilege hardening', () => {
  it('removes row-lock privilege coupling in every replaced provenance function', () => {
    expect(sql).not.toMatch(/for\s+(?:no\s+key\s+)?update|for\s+(?:key\s+)?share/i)
    expect(sql.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(7)
    expect(sql).not.toContain('pg_advisory_lock(')
  })

  it('uses domain-separated transaction lock families in deterministic order', () => {
    expect(sql).toContain('property-intelligence-provenance-v1|command|')
    expect(sql).toContain('property-intelligence-provenance-v1|authority|acquisition-kind|')
    expect(sql).toContain('property-intelligence-provenance-v1|authority|upstream-edition|')
    expect(sql).toContain('property-intelligence-provenance-v1|proposal|')
    expect(sql.indexOf('|authority|acquisition-kind|')).toBeLessThan(sql.indexOf('|authority|upstream-edition|'))
  })

  it('revokes inherited service-role authority before granting only select and insert', () => {
    expect(sql).toContain("revoke all privileges on table public.%I from service_role")
    expect(sql).toContain("grant select,insert on table public.%I to service_role")
    expect(sql).toContain("revoke all privileges on table public.%I from public,anon,authenticated")
  })
})
