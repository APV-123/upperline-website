export const PRIVATE_DEAL_DOCUMENT_BUCKET = 'deal-documents-private';
export const PRIVATE_DEAL_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
export type PrivateDealDocumentType = 'investment_memorandum' | 'financial_model';

type AuthorizationResponse = { ok: boolean; data?: { authorization?: string; objectPath?: string }; error?: { message?: string } };

export async function uploadPrivateDealDocument(dealId: string, documentType: PrivateDealDocumentType,
  file: File, fetcher: typeof fetch = fetch): Promise<string> {
  if (!dealId || !file || file.size <= 0 || file.size > PRIVATE_DEAL_DOCUMENT_MAX_BYTES) {
    throw new Error('Select a private document smaller than 50 MB.');
  }
  const response = await fetcher(`/api/deals/${encodeURIComponent(dealId)}/private-documents/upload-authorization`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentType, filename: file.name }),
  });
  const payload = await response.json().catch(() => null) as AuthorizationResponse | null;
  const authorization = payload?.data?.authorization;
  const objectPath = payload?.data?.objectPath;
  if (!response.ok || !payload?.ok || !authorization || !objectPath) {
    throw new Error(payload?.error?.message || 'Private document upload could not be authorized.');
  }
  const body = new FormData(); body.append('cacheControl', '3600'); body.append('', file);
  const upload = await fetcher(authorization, { method: 'PUT', headers: { 'x-upsert': 'false' }, body });
  if (!upload.ok) throw new Error('Private document upload failed.');
  return objectPath;
}
