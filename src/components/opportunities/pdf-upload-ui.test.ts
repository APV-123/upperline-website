import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_PDF_MAX_BYTES, flyerErrorMessage, formatFlyerBytes,
  recoverFlyerState, uploadToSignedPdfAuthorization, validateFlyerSelection,
} from './pdf-upload-ui';

describe('manual flyer upload UI model', () => {
  it('performs preliminary PDF selection checks without parsing or hashing', () => {
    expect(validateFlyerSelection(null)).toMatch(/Select/);
    expect(validateFlyerSelection({ name: 'flyer.exe', type: '', size: 10 })).toMatch(/\.pdf/);
    expect(validateFlyerSelection({ name: 'flyer.pdf', type: 'text/plain', size: 10 })).toMatch(/not reported/);
    expect(validateFlyerSelection({ name: 'flyer.pdf', type: 'application/pdf', size: 0 })).toMatch(/empty/);
    expect(validateFlyerSelection({ name: 'flyer.pdf', type: 'application/pdf', size: CLIENT_PDF_MAX_BYTES + 1 })).toMatch(/25 MB/);
    expect(validateFlyerSelection({ name: 'Flyer.PDF', type: 'application/pdf', size: 1024 })).toBeNull();
  });

  it('presents useful safe metadata and stable failure messages', () => {
    expect(formatFlyerBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(flyerErrorMessage('encrypted_pdf')).toMatch(/password-protected/);
    expect(flyerErrorMessage('malformed_pdf')).toMatch(/valid PDF/);
    expect(flyerErrorMessage('pdf_page_limit')).toMatch(/250-page/);
    expect(flyerErrorMessage('storage_unavailable')).toMatch(/temporarily unavailable/);
    expect(flyerErrorMessage('unexpected')).toBe('Something went wrong while processing the flyer.');
  });

  it('recovers only safe pending/verified correlation state', () => {
    const recovered = recoverFlyerState(JSON.stringify({ stage: 'uploaded', ingestionId: 'ingestion',
      idempotencyKey: 'request', filename: 'flyer.pdf', byteSize: 4096 }));
    expect(recovered).toMatchObject({ stage: 'uploaded', filename: 'flyer.pdf', byteSize: 4096 });
    expect(recoverFlyerState(JSON.stringify({ stage: 'uploading', authorization: 'secret' })))
      .toEqual({ stage: 'empty' });
    expect(recoverFlyerState(JSON.stringify({ stage: 'verifying', ingestionId: 'ingestion',
      idempotencyKey: 'request' })).stage).toBe('uploaded');
    expect(JSON.stringify(recovered)).not.toContain('authorization');
  });

  it('mirrors the installed signed-upload multipart primitive without overwrite', async () => {
    const fetcher = async (authorization: string | URL | Request, init?: RequestInit) => {
      expect(authorization).toBe('https://storage.test/signed-secret');
      expect(init?.method).toBe('PUT'); expect(init?.headers).toEqual({ 'x-upsert': 'false' });
      expect(init?.body).toBeInstanceOf(FormData);
      const body = init?.body as FormData;
      expect(body.get('cacheControl')).toBe('3600'); expect(body.get('')).toBeInstanceOf(Blob);
      return new Response(null, { status: 200 });
    };
    await expect(uploadToSignedPdfAuthorization('https://storage.test/signed-secret',
      new Blob(['%PDF-test'], { type: 'application/pdf' }), fetcher)).resolves.toBeUndefined();
  });

  it('renders the complete restrained state vocabulary and no signed credential', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/opportunities/OpportunityFlyer.tsx'), 'utf8');
    for (const label of ['Upload Flyer', 'Preparing…', 'Uploading…', 'Uploaded — verification pending',
      'Verifying…', 'Verified — Ready for Extraction', 'Resume verification', 'pages']) {
      expect(source).toContain(label);
    }
    expect(source).toContain('accept="application/pdf,.pdf"');
    expect(source).not.toMatch(/pdfjs-dist|node:crypto|SUPABASE_SERVICE_ROLE|bucket|objectPath|artifactId/);
    expect(source).not.toContain('>{begun.upload.authorization}<');
  });
});
