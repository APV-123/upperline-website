'use client';
import { FormEvent, useEffect, useState } from 'react';
import type { OpportunitySourceDto } from '@/lib/opportunities/application/dtos';
import styles from './opportunities.module.css';
import OpportunityFlyer from './OpportunityFlyer';
import flyerStyles from './OpportunityFlyer.module.css';

export default function OpportunitySources({ opportunityId }: { opportunityId: string }) {
  const [sources, setSources] = useState<OpportunitySourceDto[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/opportunities/${opportunityId}/sources`, { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.ok) setSources(j.data); }).catch(() => undefined); }, [opportunityId]);
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = event.currentTarget; const sourceUrl = String(new FormData(form).get('sourceUrl') || ''); try { const response = await fetch(`/api/opportunities/${opportunityId}/sources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl }) }); const json = await response.json(); if (!json.ok) throw new Error(json.error?.message || 'Source could not be saved.'); setSources(current => [json.data, ...current]); form.reset(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Source could not be saved.'); } finally { setBusy(false); } }
  return <section className={styles.panel}><h2 className={styles.sectionTitle}>Sources &amp; documents</h2><OpportunityFlyer opportunityId={opportunityId}/><div className={flyerStyles.sourceUrls}>{sources.length === 0 ? <p className={styles.muted}>No source URLs saved.</p> : <ul>{sources.map(source => <li key={source.id}>{source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceUrl}</a> : source.title || source.type}</li>)}</ul>}<form className={styles.actions} onSubmit={add}><label className={styles.field} style={{ flex: 1 }}>Add source URL<input className={styles.input} name="sourceUrl" type="url" required /></label><button className={styles.button} disabled={busy}>{busy ? 'Saving…' : 'Add source'}</button></form>{error && <div className={`${styles.notice} ${styles.error}`}>{error}</div>}</div></section>;
}
