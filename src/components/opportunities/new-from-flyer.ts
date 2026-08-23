import {
  flyerErrorMessage, uploadToSignedPdfAuthorization, validateFlyerSelection,
  type FlyerUiState, type PreliminaryFile,
} from './pdf-upload-ui';

export type FlyerIntakeFile = Blob & PreliminaryFile;
export type FlyerIntakeStage = 'creating' | 'preparing' | 'uploading' | 'verifying' | 'complete';

export type FlyerIntakeResult =
  | { disposition: 'complete'; opportunityId: string }
  | { disposition: 'needs_attention'; opportunityId: string; message: string };

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { kind?: string; message?: string } };
type CreatedOpportunity = { opportunity: { id: string } };
type BeginResponse = {
  disposition: 'authorized' | 'uploaded_pending_verification' | 'ready';
  ingestionId: string;
  upload?: { authorization: string };
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FlyerIntakeDependencies = {
  fetcher?: typeof fetch;
  upload?: typeof uploadToSignedPdfAuthorization;
  createIdempotencyKey?: () => string;
  onStage?: (stage: FlyerIntakeStage) => void;
  onOpportunityCreated?: (opportunityId: string) => void;
  onRecoveryState?: (opportunityId: string, state: FlyerUiState) => void;
};

export function validateWorkingTitle(value: string): string {
  const title = value.trim();
  if (!title) throw new Error('Working title is required.');
  return title;
}

export function isOpportunityId(value: string | null): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function createSubmissionGuard() {
  let active = false;
  return async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    if (active) return null;
    active = true;
    try { return await operation(); } finally { active = false; }
  };
}

export async function createOpportunityFromFlyer(
  input: { workingTitle: string; file: FlyerIntakeFile | null },
  dependencies: FlyerIntakeDependencies = {},
): Promise<FlyerIntakeResult> {
  const title = validateWorkingTitle(input.workingTitle);
  const fileError = validateFlyerSelection(input.file);
  if (fileError) throw new Error(fileError);
  const file = input.file!;
  const fetcher = dependencies.fetcher ?? fetch;
  const upload = dependencies.upload ?? uploadToSignedPdfAuthorization;
  const idempotencyKey = (dependencies.createIdempotencyKey ??
    (() => `manual-pdf:${crypto.randomUUID()}`))();

  dependencies.onStage?.('creating');
  let created: CreatedOpportunity;
  try {
    created = await request<CreatedOpportunity>(fetcher, '/api/opportunities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity: { name: title } }),
    });
  } catch (cause) {
    if (cause instanceof ApiResponseError) throw cause;
    throw new Error('Opportunity creation could not be confirmed. Check Opportunities before retrying.');
  }
  const opportunityId = created.opportunity?.id;
  if (!isOpportunityId(opportunityId)) {
    throw new Error('Opportunity creation returned an invalid response.');
  }
  dependencies.onOpportunityCreated?.(opportunityId);

  try {
    dependencies.onStage?.('preparing');
    const correlatedIdempotencyKey = `${idempotencyKey}:${opportunityId}`;
    const begun = await request<BeginResponse>(fetcher,
      `/api/opportunities/${opportunityId}/pdf-ingestions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: correlatedIdempotencyKey,
          originalFilename: file.name,
          declaredMediaType: file.type || null,
          declaredByteSize: file.size,
        }),
      });
    if (begun.disposition === 'ready') {
      dependencies.onStage?.('complete');
      return { disposition: 'complete', opportunityId };
    }
    if (begun.disposition === 'authorized') {
      if (!begun.upload?.authorization) throw new Error('Upload authorization was unavailable.');
      dependencies.onStage?.('uploading');
      await upload(begun.upload.authorization, file, fetcher);
    }
    dependencies.onRecoveryState?.(opportunityId, {
      stage: 'uploaded', ingestionId: begun.ingestionId,
      idempotencyKey: correlatedIdempotencyKey, filename: file.name, byteSize: file.size,
    });
    dependencies.onStage?.('verifying');
    dependencies.onRecoveryState?.(opportunityId, {
      stage: 'verifying', ingestionId: begun.ingestionId,
      idempotencyKey: correlatedIdempotencyKey, filename: file.name, byteSize: file.size,
    });
    await request(fetcher,
      `/api/opportunities/${opportunityId}/pdf-ingestions/${begun.ingestionId}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
    dependencies.onRecoveryState?.(opportunityId, {
      stage: 'verified', ingestionId: begun.ingestionId,
      idempotencyKey: correlatedIdempotencyKey, filename: file.name, byteSize: file.size,
    });
    dependencies.onStage?.('complete');
    return { disposition: 'complete', opportunityId };
  } catch {
    return {
      disposition: 'needs_attention', opportunityId,
      message: 'The Opportunity was created, but the flyer was not fully uploaded and verified.',
    };
  }
}

async function request<T>(fetcher: typeof fetch, url: string, init: RequestInit): Promise<T> {
  const response = await fetcher(url, { cache: 'no-store', ...init });
  let json: ApiEnvelope<T> | null = null;
  try { json = await response.json() as ApiEnvelope<T>; } catch { /* sanitized below */ }
  if (!response.ok || !json?.ok || !Object.prototype.hasOwnProperty.call(json, 'data')) {
    const kind = json?.error?.kind;
    const message = url === '/api/opportunities'
      ? json?.error?.message || 'Opportunity could not be created.'
      : flyerErrorMessage(kind);
    throw new ApiResponseError(message);
  }
  return json.data as T;
}

class ApiResponseError extends Error {}
