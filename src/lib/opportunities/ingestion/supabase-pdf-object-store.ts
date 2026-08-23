import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import type {
  PrivateArtifactObjectStorePort, StoredObjectMetadata, StoredObjectReader,
} from './pdf-acquisition';
import { EXPECTED_PDF_MEDIA_TYPE, MAX_PDF_BYTES } from './pdf-acquisition';
import type { PdfStorageConfig } from './pdf-storage-config';

const EXACT_PDF_PATH = /^opportunities\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/ingestions\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/artifacts\/\1\/source\.pdf$/;
const SIGNED_UPLOAD_LIFETIME_MS = 2 * 60 * 60 * 1000;

type StorageErrorLike = { status?: number; statusCode?: string };

export class SupabasePrivatePdfObjectStore implements PrivateArtifactObjectStorePort {
  constructor(
    private readonly client: SupabaseClient,
    private readonly config: PdfStorageConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createExactUploadAuthorization(input: {
    objectPath: string; mediaType: typeof EXPECTED_PDF_MEDIA_TYPE;
    maximumByteSize: number; overwrite: false;
  }): Promise<{ authorization: string; expiresAt: string }> {
    const path = exactPath(input.objectPath);
    if (input.mediaType !== EXPECTED_PDF_MEDIA_TYPE || input.maximumByteSize !== MAX_PDF_BYTES || input.overwrite !== false) {
      throw opportunityError('invalid_upload_request', 'PDF upload authorization policy is invalid.');
    }
    const { data, error } = await this.client.storage.from(this.config.bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.signedUrl) throw storageFailure(error);
    return {
      authorization: data.signedUrl,
      // @supabase/storage-js 2.105.4 fixes signed upload authorization at two hours.
      expiresAt: new Date(this.now().getTime() + SIGNED_UPLOAD_LIFETIME_MS).toISOString(),
    };
  }

  async inspectExactObject(objectPath: string): Promise<StoredObjectMetadata | null> {
    const path = exactPath(objectPath);
    const { data, error } = await this.client.storage.from(this.config.bucket).info(path);
    if (error) {
      if (isNotFound(error)) return null;
      throw storageFailure(error);
    }
    return {
      byteSize: typeof data.size === 'number' ? data.size : null,
      mediaType: typeof data.contentType === 'string' ? data.contentType : null,
      lastModifiedAt: typeof data.lastModified === 'string' ? data.lastModified : null,
    };
  }

  async openExactObject(objectPath: string): Promise<StoredObjectReader | null> {
    const path = exactPath(objectPath);
    const { data, error } = await this.client.storage.from(this.config.bucket)
      .download(path, {}, { cache: 'no-store' });
    if (error) {
      if (isNotFound(error)) return null;
      throw storageFailure(error);
    }
    if (!data) throw storageFailure(null);
    return {
      metadata: { byteSize: data.size, mediaType: data.type || null, lastModifiedAt: null },
      // The installed SDK resolves download() to a Blob before this adapter can expose
      // its stream. Consumers receive chunks, but the SDK boundary itself is buffered.
      bytes: readBlob(data),
    };
  }

  async createExactReadAccess(objectPath: string, expiresInSeconds: number): Promise<{ url: string }> {
    if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 3600) {
      throw opportunityError('invalid_upload_request', 'Read authorization lifetime is invalid.');
    }
    const path = exactPath(objectPath);
    const { data, error } = await this.client.storage.from(this.config.bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) throw storageFailure(error);
    return { url: data.signedUrl };
  }

  async deleteExactUntrustedObject(objectPath: string): Promise<void> {
    const path = exactPath(objectPath);
    const { error } = await this.client.storage.from(this.config.bucket).remove([path]);
    if (error) throw storageFailure(error);
  }
}

function exactPath(path: string): string {
  if (typeof path !== 'string' || !EXACT_PDF_PATH.test(path)) {
    throw opportunityError('invalid_upload_request', 'PDF object identity is invalid.');
  }
  return path;
}

function isNotFound(error: unknown): boolean {
  const candidate = error as StorageErrorLike | null;
  return candidate?.status === 404 || candidate?.statusCode === '404' || candidate?.statusCode === 'not_found';
}

function storageFailure(cause: unknown) {
  return opportunityError('storage_unavailable', 'Private PDF Storage is unavailable.', cause);
}

async function* readBlob(blob: Blob): AsyncIterable<Uint8Array> {
  const reader = blob.stream().getReader();
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) return;
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}
