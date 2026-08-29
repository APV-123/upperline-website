import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';
import { readPdfStorageConfig } from './pdf-storage-config';
import { SupabasePrivatePdfObjectStore } from './supabase-pdf-object-store';

type VerifiedArtifact = { storage_bucket: string; storage_path: string; page_count: number | null };

export async function createOpportunitySourcePdfAccess(client: SupabaseClient, opportunityId: string, page: number | null): Promise<string> {
  const { data: ingestions, error: ingestionError } = await client.from('opportunity_ingestions').select('id')
    .eq('opportunity_id', opportunityId).eq('entry_type', 'pdf').order('created_at', { ascending: false });
  if (ingestionError) throw failure(ingestionError);
  const ingestionIds = (ingestions ?? []).map((row: { id: string }) => row.id);
  if (ingestionIds.length === 0) throw opportunityError('not_found', 'No verified source PDF exists for this Opportunity.');
  const { data, error } = await client.from('opportunity_source_artifacts').select('storage_bucket,storage_path,page_count')
    .in('ingestion_id', ingestionIds).eq('validation_status', 'valid').eq('detected_mime_type', 'application/pdf')
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1);
  if (error) throw failure(error);
  const artifact = data?.[0] as VerifiedArtifact | undefined;
  if (!artifact) throw opportunityError('not_found', 'No verified source PDF exists for this Opportunity.');
  if (page !== null && (!Number.isSafeInteger(page) || page < 1 || artifact.page_count === null || page > artifact.page_count)) {
    throw opportunityError('validation', 'The requested source page is invalid.');
  }
  const config = readPdfStorageConfig();
  if (artifact.storage_bucket !== config.bucket) throw opportunityError('integrity_conflict', 'The private document location is inconsistent.');
  const access = await new SupabasePrivatePdfObjectStore(client, config).createExactReadAccess(artifact.storage_path, 300);
  if (page === null) return access.url;
  const url = new URL(access.url); url.hash = `page=${page}`; return url.toString();
}

function failure(cause: unknown) { return opportunityError('persistence_failure', 'The source PDF could not be resolved.', cause); }
