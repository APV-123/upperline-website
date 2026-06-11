'use client';

import React from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { ADMIN_THEME } from '@/lib/adminTheme';

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
  colors: typeof ADMIN_THEME.dark;
  isMobile: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  bucket?: 'deal-images';
};

export default function ImageField({
  label,
  url,
  colors,
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
          color: colors.subtext,
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
              maxHeight: 320,
              objectFit: 'cover',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            border: `1px dashed ${colors.border}`,
            color: colors.subtext,
            background: colors.input,
            borderRadius: 8,
            fontSize: 14,

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
              ? colors.surface
              : `${colors.accent}20`,

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
            border: `1px solid ${colors.border}`,
            background: colors.input,
            color: colors.text,
            boxSizing: 'border-box',
          }}
        />
      )}

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
    </div>
  );
}
