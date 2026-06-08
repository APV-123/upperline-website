'use client';

import React from 'react';
import { getSupabase } from '@/lib/supabase';

async function uploadFile(
  file: File,
  bucket: string,
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

  if (bucket !== 'deal-documents-private') {
    const { data } =
      supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  }

  return path;
}

type Props = {
  label: string;
  url: string;
  onChange: (value: string) => void;
  bucket:
    | 'deal-documents-public'
    | 'deal-documents-private';
  disabled?: boolean;
  accept?: string;
};

export default function DocumentField({
  label,
  url,
  onChange,
  bucket,
  disabled,
  accept = '.pdf,.doc,.docx,.ppt,.pptx',
}: Props) {
  const [uploading, setUploading] =
    React.useState(false);

  const isDisabled =
    disabled || uploading;

  const isHttp =
    /^https?:\/\//i.test(url);

  const fileName = url
    ? url.split('/').pop()
    : '';

  const inputId =
    `doc-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>
        {label}

        {bucket === 'deal-documents-private' && (
          <span style={privateTag}>
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
            <div style={fileNameStyle}>
              {fileName}
            </div>
          )}
        </div>
      ) : (
        <div style={emptyStyle}>
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
            ...buttonStyle,
            background: isDisabled
              ? '#94a3b8'
              : '#003a5d',
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
              const safeName =
                file.name.replace(/\s+/g, '-');

              const path =
                `deals/${Date.now()}-${safeName}`;

              const result =
                await uploadFile(
                  file,
                  bucket,
                  path
                );

              if (result) {
                onChange(result);
              }
            } finally {
              setUploading(false);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      {uploading && (
        <div style={uploadingStyle}>
          Uploading...
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
};

const privateTag: React.CSSProperties = {
  marginLeft: 6,
  color: '#64748b',
  fontSize: 11,
};

const emptyStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#64748b',
};

const fileNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#003a5d',
};

const uploadingStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: '#666',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};