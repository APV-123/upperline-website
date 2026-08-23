'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './opportunities.module.css';
import { formatFlyerBytes, validateFlyerSelection } from './pdf-upload-ui';
import {
  createOpportunityFromFlyer, createSubmissionGuard,
  isOpportunityId, type FlyerIntakeFile, type FlyerIntakeStage,
} from './new-from-flyer';

type ViewStage = 'ready' | FlyerIntakeStage | 'needs_attention';

export default function NewOpportunityFromFlyer() {
  const router = useRouter();
  const guard = useRef(createSubmissionGuard()).current;
  const [file, setFile] = useState<FlyerIntakeFile | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState<ViewStage>('ready');
  const [createdOpportunityId, setCreatedOpportunityId] = useState<string | null>(null);
  const busy = ['creating', 'preparing', 'uploading', 'verifying'].includes(stage);

  useEffect(() => {
    const recovered = new URLSearchParams(window.location.search).get('createdOpportunityId');
    if (!isOpportunityId(recovered)) return;
    setCreatedOpportunityId(recovered);
    setStage('needs_attention');
    setError('The Opportunity was created. Open it to resume or confirm the flyer status.');
  }, []);

  function select(selected: FlyerIntakeFile | null) {
    const validation = validateFlyerSelection(selected);
    setFileError(validation ?? '');
    setFile(validation ? null : selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await guard(async () => {
      setError('');
      const form = new FormData(event.currentTarget);
      try {
        const result = await createOpportunityFromFlyer({
          workingTitle: String(form.get('workingTitle') || ''), file,
        }, { onStage: setStage, onOpportunityCreated: opportunityId => {
          setCreatedOpportunityId(opportunityId);
          const recoveryUrl = new URL(window.location.href);
          recoveryUrl.searchParams.set('createdOpportunityId', opportunityId);
          window.history.replaceState(null, '', recoveryUrl);
        }, onRecoveryState: (opportunityId, recovery) =>
          localStorage.setItem(`upperline:pdf-acquisition:${opportunityId}`, JSON.stringify(recovery)) });
        setCreatedOpportunityId(result.opportunityId);
        if (result.disposition === 'needs_attention') {
          setStage('needs_attention'); setError(result.message); return;
        }
        setStage('complete');
        router.push(`/admin/opportunities/${result.opportunityId}#sources-documents`);
      } catch (cause) {
        setStage('ready');
        setError(cause instanceof Error ? cause.message : 'Opportunity could not be created.');
      }
    });
  }

  return <div className={styles.shell}><main className={styles.main}>
    <div className={styles.header}><div><h1 className={styles.title}>New Opportunity from Flyer</h1>
      <p className={styles.muted}>Create an early-look workspace, then securely upload and verify one flyer.</p></div></div>
    <form className={styles.panel} onSubmit={submit}>
      <div className={styles.grid2}>
        <label className={styles.field}>Working title *
          <input className={styles.input} name="workingTitle" required autoFocus
            placeholder="Mason Rd / Mason Manor Dr" disabled={busy || createdOpportunityId !== null}/>
          <span className={styles.muted}>For organizing this Opportunity only—not a verified property fact.</span>
        </label>
        <label className={styles.field}>Flyer *
          <input className={styles.input} type="file" accept="application/pdf,.pdf" required
            disabled={busy || createdOpportunityId !== null}
            onChange={event => select((event.target.files?.[0] as FlyerIntakeFile | undefined) ?? null)}/>
          {file && <span className={styles.muted}>{file.name} · PDF · {formatFlyerBytes(file.size)}</span>}
        </label>
      </div>
      {fileError && <div className={`${styles.notice} ${styles.error}`}>{fileError}</div>}
      {stage !== 'ready' && stage !== 'needs_attention' && <div className={styles.notice}>{stageLabel(stage)}</div>}
      {error && <div className={`${styles.notice} ${stage === 'needs_attention' ? styles.warning : styles.error}`}>
        {error}{createdOpportunityId && <> <Link href={`/admin/opportunities/${createdOpportunityId}#sources-documents`}>
          Open the created Opportunity to resume.</Link></>}
      </div>}
      <div className={styles.actions} style={{ marginTop: 20 }}>
        {!createdOpportunityId && <button className={styles.button} disabled={busy || Boolean(fileError)}>
          {busy ? stageLabel(stage as FlyerIntakeStage) : 'Create Opportunity & Upload Flyer'}
        </button>}
        <Link className={`${styles.button} ${styles.buttonSecondary}`}
          href={createdOpportunityId ? `/admin/opportunities/${createdOpportunityId}#sources-documents` : '/admin/opportunities'}>
          {createdOpportunityId ? 'Open Opportunity' : 'Cancel'}
        </Link>
      </div>
    </form>
  </main></div>;
}

function stageLabel(stage: FlyerIntakeStage): string {
  return ({ creating: 'Creating Opportunity…', preparing: 'Preparing Flyer…',
    uploading: 'Uploading Flyer…', verifying: 'Verifying Flyer…', complete: 'Complete' })[stage];
}
