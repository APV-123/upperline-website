'use client';

import React from 'react';
import { getSupabase } from '@/lib/supabaseClient';

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

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

type Props = {
  label: string;
  url: string;
  isDark: boolean;
  isMobile: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  bucket?: 'deal-images';
};

export default function ImageField({
  label,
  url,
  isDark,
  isMobile,
  onChange,
  disabled,
  bucket = 'deal-images',
}: Props) {
  const [uploading, setUploading] =
    React.useState(false);

  const isDisabled =
    !!disabled || uploading;

  const inputId = `img-upload-${label
    .replace(/\s+/g, '-')
    .toLowerCase()}`;

  return (
    <div style={{ marginTop: 20 }}>
      <label
        style={{
          fontSize: 12,
          display: 'block',
          marginBottom: 6,
          color: isDark ? '#cbd5e1' : '#475569',
        }}
      >
        {label}
      </label>

      {url ? (
        <div style={{ marginTop: 8 }}>
          <img
            src={url}
            alt={label}
            style={{
              width: '100%',
              maxHeight: 250,
              objectFit: 'cover',
              borderRadius: 8,
              border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            border: `1px dashed ${isDark ? '#475569' : '#cbd5e1'}`,
            borderRadius: 8,
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: 14,
            background: isDark ? '#0f172a' : 'transparent',
          }}
        >
          No image uploaded
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() =>
            document
              .getElementById(inputId)
              ?.click()
          }
          style={{
            padding: '8px 12px',
            background: isDisabled
              ? '#94a3b8'
              : '#163a63',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isDisabled
              ? 'not-allowed'
              : 'pointer',
            fontSize: 13,
          }}
        >
          {url
            ? 'Replace Image'
            : 'Upload Image'}
        </button>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={isDisabled}
          onChange={async (e) => {
            const file =
              e.target.files?.[0];

            if (!file) return;

            setUploading(true);

            try {
              const safeName =
                file.name.replace(
                  /\s+/g,
                  '-'
                );

              const path = `deals/${Date.now()}-${safeName}`;

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

      {!url && (
        <input
          value={url}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder="Paste image URL"
          disabled={isDisabled}
          style={{
            width: '100%',
            padding: isMobile ? 10 : 12,
            marginTop: 8,
            borderRadius: 6,
            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
            background: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            boxSizing: 'border-box',
          }}
        />
      )}

      {uploading && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          Uploading...
        </div>
      )}
    </div>
  );
}
