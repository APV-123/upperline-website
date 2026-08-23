'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import styles from './opportunities.module.css';
import flyerStyles from './OpportunityFlyer.module.css';
import {
  flyerErrorMessage, formatFlyerBytes, recoverFlyerState, uploadToSignedPdfAuthorization,
  validateFlyerSelection,
  type FlyerUiState,
} from './pdf-upload-ui';

type Api<T> = { ok: boolean; data?: T; error?: { kind?: string } };
type BeginResponse = { disposition: 'authorized' | 'uploaded_pending_verification' | 'ready';
  ingestionId: string; upload?: { authorization: string; maximumByteSize: number }; readyForExtraction: boolean };
type VerifyResponse = { disposition: 'finalized' | 'already_ready'; ingestionId: string;
  readyForExtraction: true; verified?: { byteSize: number; pageCount: number; mediaType: 'application/pdf' } };
type StateResponse = null | { ingestionId: string; status: 'awaiting_upload' | 'ready' | 'failed' | 'cancelled';
  readyForExtraction: boolean; failureCode?: string };

export default function OpportunityFlyer({ opportunityId }: { opportunityId: string }) {
  const storageKey = `upperline:pdf-acquisition:${opportunityId}`;
  const [state, setState] = useState<FlyerUiState>({ stage: 'empty' });
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const local = recoverFlyerState(localStorage.getItem(storageKey));
    setState(local);
    void api<StateResponse>(`/api/opportunities/${opportunityId}/pdf-ingestions`, { method: 'GET' })
      .then(remote => {
        if (remote?.readyForExtraction) setState(current => ({ ...current, stage: 'verified', ingestionId: remote.ingestionId }));
      }).catch(() => undefined);
  }, [opportunityId, storageKey]);

  function persist(next: FlyerUiState) {
    setState(next);
    if (['uploaded', 'verifying', 'verified'].includes(next.stage)) localStorage.setItem(storageKey, JSON.stringify(next));
  }
  function select(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    const error = validateFlyerSelection(selected);
    if (error) { setFile(null); setState({ stage: 'failed', error }); return; }
    setFile(selected);
    setState({ stage: 'selected', filename: selected!.name, byteSize: selected!.size,
      idempotencyKey: `manual-pdf:${opportunityId}:${crypto.randomUUID()}` });
  }
  async function upload() {
    if (!file || !state.idempotencyKey) return;
    setState(current => ({ ...current, stage: 'preparing', error: undefined }));
    try {
      const begun = await api<BeginResponse>(`/api/opportunities/${opportunityId}/pdf-ingestions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          idempotencyKey: state.idempotencyKey, originalFilename: file.name,
          declaredMediaType: file.type || null, declaredByteSize: file.size,
        }),
      });
      const correlated = { ...state, ingestionId: begun.ingestionId };
      if (begun.disposition === 'ready') { persist({ ...correlated, stage: 'verified' }); return; }
      if (begun.disposition === 'uploaded_pending_verification') {
        persist({ ...correlated, stage: 'uploaded' }); await verify(begun.ingestionId, correlated); return;
      }
      if (!begun.upload?.authorization) throw new Error('Upload authorization was unavailable.');
      setState({ ...correlated, stage: 'uploading' });
      await uploadToSignedPdfAuthorization(begun.upload.authorization, file);
      persist({ ...correlated, stage: 'uploaded' });
      await verify(begun.ingestionId, correlated);
    } catch (cause) { fail(cause); }
  }
  async function resume() {
    if (!state.ingestionId) return;
    try { await verify(state.ingestionId, state); } catch (cause) { fail(cause); }
  }
  async function verify(ingestionId: string, current: FlyerUiState) {
    persist({ ...current, ingestionId, stage: 'verifying', error: undefined });
    const verified = await api<VerifyResponse>(
      `/api/opportunities/${opportunityId}/pdf-ingestions/${ingestionId}/verify`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    persist({ ...current, ingestionId, stage: 'verified',
      byteSize: verified.verified?.byteSize ?? current.byteSize,
      pageCount: verified.verified?.pageCount ?? current.pageCount });
  }
  function fail(cause: unknown) {
    const error = cause as Error & { kind?: string; safeMessage?: string };
    setState(current => ({ ...current, stage: 'failed',
      error: error.safeMessage ?? flyerErrorMessage(error.kind) }));
  }
  const busy = ['preparing', 'uploading', 'verifying'].includes(state.stage);
  return <div className={flyerStyles.flyer}>
    <div className={`${styles.header} ${flyerStyles.header}`}>
      <div><h3 className={`${styles.sectionTitle} ${flyerStyles.sectionTitle}`}>Flyer</h3><p className={styles.muted}>{statusLabel(state.stage)}</p></div>
      {state.stage !== 'verified' && <button type="button" className={styles.button} disabled={busy}
        onClick={() => input.current?.click()}>Upload Flyer</button>}
      <input ref={input} className={flyerStyles.visuallyHidden} type="file" accept="application/pdf,.pdf" onChange={select}/>
    </div>
    {state.filename && <div className={flyerStyles.flyerMeta}><span>{state.filename}</span><span>PDF</span>
      <span>{formatFlyerBytes(state.byteSize)}</span>{state.pageCount && <span>{state.pageCount} pages</span>}</div>}
    {state.stage === 'selected' && <button type="button" className={styles.button} onClick={() => void upload()}>Upload selected PDF</button>}
    {state.stage === 'uploaded' && <button type="button" className={styles.button} onClick={() => void resume()}>Resume verification</button>}
    {state.stage === 'failed' && <div className={`${styles.notice} ${styles.error}`}>{state.error}
      {state.ingestionId && <button type="button" className={flyerStyles.retry} onClick={() => void resume()}>Try verification again</button>}</div>}
    {state.stage === 'verified' && <div className={`${styles.notice} ${flyerStyles.verified}`}><strong>Verified</strong> · Ready for Extraction</div>}
    <p className={styles.muted}>Browser checks are preliminary. The server verifies the stored bytes, PDF structure, size, encryption, and page count.</p>
  </div>;
}

function statusLabel(stage: FlyerUiState['stage']): string {
  return ({ empty: 'No flyer', selected: 'Selected', preparing: 'Preparing…', uploading: 'Uploading…',
    uploaded: 'Uploaded — verification pending', verifying: 'Verifying…',
    verified: 'Verified — Ready for Extraction', failed: 'Action needed' })[stage];
}
async function api<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const json = await response.json() as Api<T>;
  if (!json.ok || !Object.prototype.hasOwnProperty.call(json, 'data')) {
    const error = new Error('PDF acquisition failed.') as Error & { kind?: string; safeMessage?: string };
    error.kind = json.error?.kind; error.safeMessage = flyerErrorMessage(error.kind); throw error;
  }
  return json.data as T;
}
