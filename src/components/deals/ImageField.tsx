'use client';

import React from 'react';
import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  if (!_supabase) {
    _supabase = createClient(url, key);
  }

  return _supabase;
}

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
  onChange: (value: string) => void;
  disabled?: boolean;
  bucket?: 'deal-images';
};

export default function ImageField({
  label,
  url,
  onChange,
  disabled,
  bucket = 'deal-images',
}: Props) {
  const [uploading, setUploading] = React.useState(false);

  const isDisabled = !!disabled || uploading;

  const inputId = `img-upload-${label
    .replace(/\s+/g, '-')
    .toLowerCase()}`;

  return (
    <div style={{ marginTop: 20 }}>
      <label style={labelStyle}>{label}</label>

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
              border: '1px solid #e5e7eb',
            }}
          />
        </div>
      ) : (
        <div style={emptyState}>
          No image uploaded
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
          {url ? 'Replace Image' : 'Upload Image'}
        </button>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={isDisabled}
          onChange={async (e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            setUploading(true);

            try {
              const safeName = file.name.replace(
                /\s+/g,
                '-'
              );

              const path = `deals/${Date.now()}-${safeName}`;

              const result = await uploadFile(
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

      <input
        value={url}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder="Paste image URL"
        disabled={isDisabled}
        style={{
          ...input,
          marginTop: 8,
        }}
      />

      {uploading && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: '#64748b',
          }}
        >
          Uploading...
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  display: 'block',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const emptyState: React.CSSProperties = {
  marginTop: 8,
  padding: 16,
  border: '1px dashed #cbd5e1',
  borderRadius: 8,
  color: '#64748b',
  fontSize: 14,
};