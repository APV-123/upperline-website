'use client';

import React from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { ADMIN_THEME } from '@/lib/adminTheme';
import { uploadPrivateDealDocument, type PrivateDealDocumentType } from '@/lib/deals/private-document-upload';

async function uploadFile(
  file: File,
  bucket: 'deal-documents-public',
  path: string
) {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('[UPLOAD ERROR]', error);
    alert(error.message || 'Upload failed');
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

type Props = {
  label: string;
  url: string;
  colors: typeof ADMIN_THEME.dark;
  isMobile: boolean;
  onChange: (value: string) => void;
  bucket:
  | 'deal-documents-public'
  | 'deal-documents-private';
  disabled?: boolean;
  accept?: string;
  dealId?: string;
  documentType?: PrivateDealDocumentType;
};

export default function DocumentField({
  label,
  url,
  colors,
  isMobile,
  onChange,
  bucket,
  disabled,
  accept = '.pdf,.doc,.docx,.ppt,.pptx',
  dealId,
  documentType,
}: Props) {
  const [uploading, setUploading] =
    React.useState(false);

  const isPrivate = bucket === 'deal-documents-private';
  const isDisabled = disabled || uploading || (isPrivate && (!dealId || !documentType));

  const isHttp =
    /^https?:\/\//i.test(url);

  const fileName = url
    ? url.split('/').pop()
    : '';

  const inputId =
    `doc-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div style={{ marginTop: 12 }}>
      <label
        style={{
          fontSize: 12,
          color: colors.subtext,
        }}
      >
        {label}

        {bucket === 'deal-documents-private' && (
          <span
            style={{
              marginLeft: 6,
              color: colors.subtext,
              fontSize: 11,
            }}
          >
            (private)
          </span>
        )}
      </label>

      {url ? (
        <div style={{ marginTop: 8 }}>
          {isHttp ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Document
            </a>
          ) : (
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.accent,
              }}
            >
              {fileName}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            color: colors.subtext,
          }}
        >
          No document uploaded
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() =>
            document.getElementById(inputId)?.click()
          }
          style={{
            padding: isMobile ? '10px 14px' : '8px 12px',
            color: isDisabled
              ? colors.subtext
              : colors.accent,
            border: `1px solid ${isDisabled
                ? colors.border
                : colors.accent
              }`,
            borderRadius: 6,
            cursor: isDisabled
              ? 'not-allowed'
              : 'pointer',
            fontSize: 13,
            background: isDisabled
              ? colors.surface
              : `${colors.accent}20`,
          }}
        >
          {url
            ? 'Replace Document'
            : 'Upload Document'}
        </button>

        <input
          id={inputId}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          disabled={isDisabled}
          onChange={async (e) => {
            const file =
              e.target.files?.[0];

            if (!file) return;

            setUploading(true);

            try {
              const result = bucket === 'deal-documents-private'
                ? await uploadPrivateDealDocument(dealId!, documentType!, file)
                : await uploadFile(file, bucket, `deals/${Date.now()}-${file.name.replace(/\s+/g, '-')}`);

              if (result) {
                onChange(result);
              }
            } catch (error) {
              alert(error instanceof Error ? error.message : 'Private document upload failed.');
            } finally {
              setUploading(false);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      {uploading && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: colors.subtext,
          }}
        >
          Uploading...
        </div>
      )}
      {isPrivate && !dealId && (
        <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
          Save the Deal before uploading confidential documents.
        </div>
      )}
    </div>
  );
}
