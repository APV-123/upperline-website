import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CLIENT_PDF_MAX_BYTES } from './pdf-upload-ui';
import {
  createOpportunityFromFlyer, createSubmissionGuard, isOpportunityId, validateWorkingTitle,
  type FlyerIntakeFile,
} from './new-from-flyer';

const OPPORTUNITY_ID = '11111111-1111-4111-8111-111111111111';
const INGESTION_ID = '22222222-2222-4222-8222-222222222222';

function flyer(overrides: Partial<{ name: string; type: string; size: number }> = {}): FlyerIntakeFile {
  const blob = new Blob([new Uint8Array(overrides.size ?? 9)],
    { type: overrides.type ?? 'application/pdf' });
  return Object.assign(blob, { name: overrides.name ?? 'flyer.pdf' }) as FlyerIntakeFile;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('New Opportunity from Flyer orchestration', () => {
  it('requires a user-authored working title and a valid PDF', async () => {
    expect(() => validateWorkingTitle('  ')).toThrow('Working title is required');
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason', file: null }))
      .rejects.toThrow('Select a PDF');
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason', file: flyer({ size: 0 }) }))
      .rejects.toThrow('empty');
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason',
      file: flyer({ size: CLIENT_PDF_MAX_BYTES + 1 }) })).rejects.toThrow('25 MB');
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason',
      file: flyer({ name: 'flyer.txt', type: 'text/plain' }) })).rejects.toThrow('.pdf');
  });

  it('accepts only a server-shaped UUID for Opportunity recovery', () => {
    expect(isOpportunityId(OPPORTUNITY_ID)).toBe(true);
    expect(isOpportunityId('../api/deals')).toBe(false);
    expect(isOpportunityId(null)).toBe(false);
  });

  it('creates the sparse shell before acquiring and verifying with the returned ID', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url === '/api/opportunities') return json({ ok: true, data: { opportunity: { id: OPPORTUNITY_ID } } });
      if (url.endsWith('/pdf-ingestions')) return json({ ok: true, data: {
        disposition: 'authorized', ingestionId: INGESTION_ID,
        upload: { authorization: 'https://storage.test/signed' },
      } });
      return json({ ok: true, data: { disposition: 'finalized' } });
    }) as typeof fetch;
    const upload = vi.fn(async () => undefined);
    const stages: string[] = [];
    const recovery: string[] = [];
    const createdIds: string[] = [];
    const result = await createOpportunityFromFlyer({ workingTitle: ' Mason Rd / Mason Manor Dr ', file: flyer() }, {
      fetcher, upload, createIdempotencyKey: () => 'request', onStage: stage => stages.push(stage),
      onOpportunityCreated: opportunityId => createdIds.push(opportunityId),
      onRecoveryState: (_opportunityId, state) => recovery.push(state.stage),
    });
    expect(result).toEqual({ disposition: 'complete', opportunityId: OPPORTUNITY_ID });
    expect(calls.map(call => call.url)).toEqual([
      '/api/opportunities', `/api/opportunities/${OPPORTUNITY_ID}/pdf-ingestions`,
      `/api/opportunities/${OPPORTUNITY_ID}/pdf-ingestions/${INGESTION_ID}/verify`,
    ]);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ opportunity: { name: 'Mason Rd / Mason Manor Dr' } });
    expect(String(calls[0].init?.body)).not.toMatch(/address|market|price|underwriting|deal|extract/i);
    expect(JSON.parse(String(calls[1].init?.body)).idempotencyKey).toBe(`request:${OPPORTUNITY_ID}`);
    expect(upload).toHaveBeenCalledOnce();
    expect(stages).toEqual(['creating', 'preparing', 'uploading', 'verifying', 'complete']);
    expect(recovery).toEqual(['uploaded', 'verifying', 'verified']);
    expect(createdIds).toEqual([OPPORTUNITY_ID]);
  });

  it('does not begin acquisition when shell creation fails', async () => {
    const fetcher = vi.fn(async () => json({ ok: false,
      error: { kind: 'validation', message: 'Opportunity name is required.' } }, 400)) as typeof fetch;
    const upload = vi.fn(async () => undefined);
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason', file: flyer() }, { fetcher, upload }))
      .rejects.toThrow('Opportunity name is required');
    expect(fetcher).toHaveBeenCalledOnce(); expect(upload).not.toHaveBeenCalled();
  });

  it('warns that a lost creation response is ambiguous before a user retries', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('network failed'); }) as typeof fetch;
    await expect(createOpportunityFromFlyer({ workingTitle: 'Mason', file: flyer() }, { fetcher }))
      .rejects.toThrow('Check Opportunities before retrying');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(['authorization', 'byte upload', 'verification'])('preserves the shell after %s failure', async failure => {
    let call = 0;
    const requestUrls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      requestUrls.push(String(input));
      call += 1;
      if (call === 1) return json({ ok: true, data: { opportunity: { id: OPPORTUNITY_ID } } });
      if (call === 2) {
        if (failure === 'authorization') return json({ ok: false, error: { kind: 'storage_unavailable' } }, 503);
        return json({ ok: true, data: { disposition: 'authorized', ingestionId: INGESTION_ID,
          upload: { authorization: 'https://storage.test/signed' } } });
      }
      return failure === 'verification'
        ? json({ ok: false, error: { kind: 'invalid_pdf' } }, 400)
        : json({ ok: true, data: {} });
    });
    const fetcher = fetchMock as typeof fetch;
    const upload = vi.fn(async () => {
      if (failure === 'byte upload') throw new Error('network');
    });
    const result = await createOpportunityFromFlyer({ workingTitle: 'Mason', file: flyer() }, { fetcher, upload });
    expect(result).toEqual({ disposition: 'needs_attention', opportunityId: OPPORTUNITY_ID,
      message: 'The Opportunity was created, but the flyer was not fully uploaded and verified.' });
    expect(requestUrls.filter(url => url === '/api/opportunities')).toHaveLength(1);
  });

  it('guards concurrent double submission', async () => {
    const guard = createSubmissionGuard(); let release!: () => void;
    const operation = vi.fn(() => new Promise<string>(resolvePromise => { release = () => resolvePromise('done'); }));
    const first = guard(operation); const second = guard(operation);
    expect(await second).toBeNull(); expect(operation).toHaveBeenCalledOnce();
    release(); expect(await first).toBe('done');
  });

  it('exposes the action, recovery link, trusted endpoint sequence, and no extraction action', () => {
    const list = readFileSync(resolve(process.cwd(), 'src/components/opportunities/OpportunityListClient.tsx'), 'utf8');
    const view = readFileSync(resolve(process.cwd(), 'src/components/opportunities/NewOpportunityFromFlyer.tsx'), 'utf8');
    expect(list).toContain('New from Flyer');
    expect(view).toContain('Working title *'); expect(view).toContain('Flyer *');
    expect(view).toContain('not a verified property fact');
    expect(view).toContain('Open the created Opportunity to resume.');
    expect(view).toContain("searchParams.set('createdOpportunityId'");
    expect(view).toContain('#sources-documents');
    expect(view).not.toMatch(/extract(?:ion)?|underwriting|\/api\/deals/i);
  });
});
