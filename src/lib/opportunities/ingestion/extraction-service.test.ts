import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { opportunityError } from '../application/errors';
import type { ExtractionRepositoryPort, ExtractionRunRecord, VerifiedExtractionArtifact } from './extraction-contracts';
import { DeterministicFakeExtractionProvider } from './fake-extraction-provider';
import { buildExtractionIdempotencyKey, mapValidatedExtraction } from './extraction-mapper';
import { runProviderNeutralExtraction } from './extraction-service';
import type { PrivateArtifactObjectStorePort } from './pdf-acquisition';

const bytes = new TextEncoder().encode('%PDF-safe-fake');
const artifact: VerifiedExtractionArtifact = {
  opportunityId: '11111111-1111-4111-8111-111111111111', ingestionId: '22222222-2222-4222-8222-222222222222',
  artifactId: '33333333-3333-4333-8333-333333333333', storagePath: 'private/path',
  sha256Digest: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.byteLength,
  pageCount: 2, detectedMediaType: 'application/pdf',
};
const configuration = { provider: 'deterministic-fake', model: 'fixture-v1', extractionStrategy: 'land-flyer', extractionVersion: '1', parserVersion: '1', promptVersion: '1', schemaVersion: 'land-flyer-v1' as const, timeoutMilliseconds: 60_000 };
const providerOutput = { schemaVersion: 'land-flyer-v1', assertions: [{ destination: 'pricing.askingPrice', value: { type: 'decimal', value: '1000000' }, unit: 'USD', assertionBasis: 'source_stated', confidence: '0.9', evidence: [{ pageNumber: 1, snippet: 'Price $1,000,000' }] }] };
let uuidCounter = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`;

function objectStore(payload = bytes): PrivateArtifactObjectStorePort {
  return { createExactUploadAuthorization: vi.fn(), inspectExactObject: vi.fn(), createExactReadAccess: vi.fn(), deleteExactUntrustedObject: vi.fn(),
    openExactObject: vi.fn(async () => ({ metadata: { byteSize: payload.byteLength, mediaType: 'application/pdf', lastModifiedAt: null }, bytes: (async function* () { yield payload; })() })) };
}
class MemoryRepository implements ExtractionRepositoryPort {
  run: ExtractionRunRecord | null = null; completed = 0; failed = 0; lastCandidates: unknown[] = [];
  artifact: VerifiedExtractionArtifact | null = artifact;
  async resolveEligibleArtifact() { return this.artifact; }
  async allocateRun(input: Parameters<ExtractionRepositoryPort['allocateRun']>[0]) {
    if (this.run) return { run: this.run, disposition: 'recovered' as const };
    this.run = { runId: input.runId, attemptNumber: 1, status: 'running' }; return { run: this.run, disposition: 'allocated' as const };
  }
  async completeRun(input: Parameters<ExtractionRepositoryPort['completeRun']>[0]) { this.completed++; this.lastCandidates = input.candidates; this.run = { runId: input.runId, attemptNumber: 1, status: 'succeeded', candidateCount: input.candidates.length, evidenceCount: input.candidates.flatMap(c => c.evidence).length }; return this.run; }
  async failRun() { this.failed++; if (this.run) this.run.status = 'failed'; }
  async recoverSucceededRun() { return this.run!; }
}
const authorizer = { authorize: vi.fn(async () => undefined) };
const actor = { email: 'reviewer@upperlineco.com', name: 'Reviewer' };

describe('provider-neutral extraction orchestration', () => {
  it('completes fake extraction without passing persistence identities to provider', async () => {
    uuidCounter = 0; const repository = new MemoryRepository(); const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    const result = await runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration, idFactory });
    expect(result.run.status).toBe('succeeded'); expect(repository.completed).toBe(1); expect(provider.calls).toBe(1);
    expect(repository.lastCandidates[0]).toMatchObject({ destinationDomain: 'source', economicRole: 'descriptive_fact' });
  });
  it('does not let telemetry failure alter a successful extraction', async () => {
    const repository = new MemoryRepository();
    const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, {
      authorizer, repository, objectStore: objectStore(), provider, configuration,
      telemetry: { record: vi.fn(() => { throw new Error('telemetry unavailable'); }) }, idFactory,
    })).resolves.toMatchObject({ disposition: 'completed' });
  });
  it.each([
    ['timeout', new DeterministicFakeExtractionProvider({ kind: 'timeout' }), 'provider_timeout'],
    ['provider failure', new DeterministicFakeExtractionProvider({ kind: 'failure' }), 'provider_failure'],
    ['malformed output', new DeterministicFakeExtractionProvider({ kind: 'success', output: { nope: true } }), 'provider_invalid_output'],
  ])('fails closed for %s', async (_name, provider, kind) => {
    const repository = new MemoryRepository();
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration, idFactory })).rejects.toMatchObject({ kind });
    expect(repository.failed).toBe(1); expect(repository.completed).toBe(0);
  });
  it('recovers succeeded replay and rejects concurrent running replay', async () => {
    const succeeded = new MemoryRepository(); succeeded.run = { runId: 'run', attemptNumber: 1, status: 'succeeded', candidateCount: 1 };
    const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository: succeeded, objectStore: objectStore(), provider, configuration })).resolves.toMatchObject({ disposition: 'recovered' });
    expect(provider.calls).toBe(0);
    const running = new MemoryRepository(); running.run = { runId: 'run', attemptNumber: 1, status: 'running' };
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository: running, objectStore: objectStore(), provider, configuration })).rejects.toMatchObject({ kind: 'extraction_already_running' });
  });
  it('enforces artifact limits before provider invocation', async () => {
    const repository = new MemoryRepository(); repository.artifact = { ...artifact, pageCount: 26 };
    const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration })).rejects.toMatchObject({ kind: 'artifact_not_ready' });
    expect(provider.calls).toBe(0);
  });
  it.each([{ pageCount: Number.NaN }, { byteSize: 1.5 }, { sha256Digest: 'not-a-digest' }])(
    'rejects malformed authoritative artifact metadata %#', async malformed => {
      const repository = new MemoryRepository(); repository.artifact = { ...artifact, ...malformed };
      const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
      await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration })).rejects.toMatchObject({ kind: 'artifact_not_ready' });
      expect(provider.calls).toBe(0);
    });
  it('detects authoritative byte mismatch and never calls provider', async () => {
    const repository = new MemoryRepository(); const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(new Uint8Array([1])), provider, configuration })).rejects.toMatchObject({ kind: 'artifact_not_ready' });
    expect(provider.calls).toBe(0);
  });
  it('sanitizes an unexpected object-store failure as persistence failure', async () => {
    const repository = new MemoryRepository(); const store = objectStore();
    store.openExactObject = vi.fn(async () => { throw new Error('private storage path and credential'); });
    const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: store, provider, configuration })).rejects.toMatchObject({
      kind: 'persistence_failure', message: 'The verified artifact could not be retrieved.',
    });
    expect(provider.calls).toBe(0);
  });
  it('fails closed when persistence completion fails', async () => {
    const repository = new MemoryRepository();
    repository.completeRun = vi.fn(async () => { throw opportunityError('persistence_failure', 'Extraction persistence failed.'); });
    const provider = new DeterministicFakeExtractionProvider({ kind: 'success', output: providerOutput });
    await expect(runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration, idFactory })).rejects.toMatchObject({ kind: 'persistence_failure' });
    expect(repository.failed).toBe(1);
  });
  it('uses stable configuration-sensitive idempotency keys', () => {
    const first = buildExtractionIdempotencyKey({ artifactDigest: artifact.sha256Digest, configuration });
    expect(first).toBe(buildExtractionIdempotencyKey({ artifactDigest: artifact.sha256Digest, configuration }));
    expect(first).not.toBe(buildExtractionIdempotencyKey({ artifactDigest: artifact.sha256Digest, configuration: { ...configuration, promptVersion: '2' } }));
  });
  it('derives identities and warning state server-side', () => {
    const candidates = mapValidatedExtraction({ output: { schemaVersion: 'land-flyer-v1', assertions: [{ destination: 'site.zoning', value: { type: 'text', value: 'C-2' }, unit: 'NONE', assertionBasis: 'model_inference', confidence: null, evidence: [{ pageNumber: 1, snippet: 'Zoning C-2' }] }] }, extractionVersion: '1', idFactory });
    expect(candidates[0]).toMatchObject({ destinationDomain: 'source', validationState: 'warning', validationIssues: ['MODEL_INFERENCE_REQUIRES_REVIEW'], ordinal: 0 });
  });
  it.each(['resolve', 'reject'])('prevents a late provider %s from reaching persistence after timeout', async outcome => {
    vi.useFakeTimers();
    try {
      const repository = new MemoryRepository();
      const provider = { identifier: 'deterministic-fake', extract: vi.fn(() => new Promise<unknown>((resolve, reject) => {
        setTimeout(() => outcome === 'resolve' ? resolve(providerOutput) : reject(new Error('private provider detail')), 61_000);
      })) };
      const pending = runProviderNeutralExtraction({ actor, opportunityId: artifact.opportunityId }, { authorizer, repository, objectStore: objectStore(), provider, configuration, idFactory });
      const assertion = expect(pending).rejects.toMatchObject({ kind: 'provider_timeout' });
      await vi.advanceTimersByTimeAsync(60_000);
      await assertion;
      await vi.advanceTimersByTimeAsync(1_000);
      expect(repository.completed).toBe(0);
      expect(repository.failed).toBe(1);
    } finally { vi.useRealTimers(); }
  });
});
