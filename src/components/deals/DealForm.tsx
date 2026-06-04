'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!_supabase) {
    _supabase = createClient(url, key);
  }

  return _supabase;
}

export type DealFormValues = {
  name: string;
  target_amount: number;
  location: string;
  asset_class: string;
  strategy: string;
  estimated_closing_date: string;

  why_we_like_it: string;

  overview_text: string;
  business_plan_text: string;

  image_1_url: string;
  image_2_url: string;
  image_3_url: string;

  pitch_book_url: string;
  abridged_memo_url: string;
  full_memo_url: string;
  full_memo_requires_ca: boolean;
};

type Props = {
  initialDeal?: Partial<DealFormValues>;
  onSave: (deal: DealFormValues) => Promise<void>;
  saving?: boolean;
  loading?: boolean;
};

export default function DealForm({
  initialDeal,
  onSave,
  saving = false,
  loading = false,
}: Props) {
  const [deal, setDeal] = useState<DealFormValues>({
    name: initialDeal?.name ?? '',
    target_amount: Number(initialDeal?.target_amount ?? 0) || 0,
    location: initialDeal?.location ?? '',
    asset_class: initialDeal?.asset_class ?? '',
    strategy: initialDeal?.strategy ?? '',
    estimated_closing_date: initialDeal?.estimated_closing_date ?? '',
    why_we_like_it: initialDeal?.why_we_like_it ?? '',
    overview_text: initialDeal?.overview_text ?? '',
    business_plan_text: initialDeal?.business_plan_text ?? '',
    image_1_url: initialDeal?.image_1_url ?? '',
    image_2_url: initialDeal?.image_2_url ?? '',
    image_3_url: initialDeal?.image_3_url ?? '',
    pitch_book_url: initialDeal?.pitch_book_url ?? '',
    abridged_memo_url: initialDeal?.abridged_memo_url ?? '',
    full_memo_url: initialDeal?.full_memo_url ?? '',
    full_memo_requires_ca: Boolean(initialDeal?.full_memo_requires_ca ?? false),
  });

  async function handleSubmit() {
    try {
      await onSave(deal);
    } catch (e) {
      console.error('[FORM SAVE ERROR]', e);
      alert('Failed to save');
    }
  }

  return (
    <div style={container}>
      <div style={content}>
        <h1 style={title}>Deal</h1>

        <Section title="Basic Information">
          <Field
            label="Deal Name"
            value={deal.name}
            onChange={(v) => setDeal((p) => ({ ...p, name: v }))}
          />

          <Field
            label="Target Raise"
            type="number"
            value={deal.target_amount}
            onChange={(v) =>
              setDeal((p) => ({
                ...p,
                target_amount: v === '' ? 0 : Number(v),
              }))
            }
          />

          <Field
            label="Location"
            value={deal.location}
            onChange={(v) => setDeal((p) => ({ ...p, location: v }))}
          />

          <Field
            label="Asset Class"
            value={deal.asset_class}
            onChange={(v) => setDeal((p) => ({ ...p, asset_class: v }))}
          />

          <Field
            label="Strategy"
            value={deal.strategy}
            onChange={(v) => setDeal((p) => ({ ...p, strategy: v }))}
          />

          <Field
            label="Estimated Closing Date"
            type="date"
            value={deal.estimated_closing_date}
            onChange={(v) =>
              setDeal((p) => ({ ...p, estimated_closing_date: v }))
            }
          />
          <TextArea
            label="Why We Like This Opportunity"
            value={deal.why_we_like_it}
            onChange={(v) =>
              setDeal((p) => ({ ...p, why_we_like_it: v }))
            }
          />
          <TextArea
            label="Overview"
            value={deal.overview_text}
            onChange={(v) =>
              setDeal((p) => ({ ...p, overview_text: v }))
            }
          />

          <TextArea
            label="Business Plan"
            value={deal.business_plan_text}
            onChange={(v) =>
              setDeal((p) => ({ ...p, business_plan_text: v }))
            }
          />
        </Section>

        <Section title="Images">
          <ImageField
            label="Primary Image"
            url={deal.image_1_url}
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, image_1_url: v }))}
          />

          <ImageField
            label="Secondary Image"
            url={deal.image_2_url}
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, image_2_url: v }))}
          />

          <ImageField
            label="Tertiary Image"
            url={deal.image_3_url}
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, image_3_url: v }))}
          />
        </Section>

        <Section title="Documents">

          <DocumentField
            label="Deal Snapshot"
            url={deal.abridged_memo_url}
            bucket="deal-documents-public"
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, abridged_memo_url: v }))}
          />
          <DocumentField
            label="Full Investment Memorandum"
            url={deal.full_memo_url}
            bucket="deal-documents-private"
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, full_memo_url: v }))}
          />
          <DocumentField
            label="About Upperline"
            url={deal.pitch_book_url}
            bucket="deal-documents-public"
            disabled={saving || loading}
            onChange={(v) => setDeal((p) => ({ ...p, pitch_book_url: v }))}
          />
          <Checkbox
            label="Full Memo Requires CA"
            checked={deal.full_memo_requires_ca}
            onChange={(v) =>
              setDeal((p) => ({ ...p, full_memo_requires_ca: v }))
            }
          />
        </Section>

        <button
          onClick={handleSubmit}
          style={{
            ...primaryBtn,
            opacity: saving || loading ? 0.7 : 1,
            cursor: saving || loading ? 'not-allowed' : 'pointer',
          }}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: FieldProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextArea({ label, value, onChange }: TextAreaProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...input, height: 140 }}
      />
    </div>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <label
        style={{
          ...labelStyle,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    </div>
  );
}

async function uploadFile(file: File, bucket: string, path: string) {
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
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  return path;
}

function ImageField({
  label,
  url,
  onChange,
  disabled,
  bucket = 'deal-images',
}: {
  label: string;
  url: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  bucket?: 'deal-images';
}) {
  const [uploading, setUploading] = React.useState(false);
  const isDisabled = !!disabled || uploading;
  const inputId = `img-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>

      {url ? (
        <div style={{ marginTop: 8 }}>
          <img
            src={url}
            alt={label}
            style={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
            }}
          />
        </div>
      ) : (
        <div style={{ marginTop: 8, color: '#888' }}>No image uploaded</div>
      )}

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => document.getElementById(inputId)?.click()}
          style={{
            padding: '8px 12px',
            background: isDisabled ? '#94a3b8' : '#003a5d',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {url ? 'Replace image' : 'Upload image'}
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
              const safeName = file.name.replace(/\s+/g, '-');
              const path = `deals/${Date.now()}-${safeName}`;
              const result = await uploadFile(file, bucket, path);
              if (result) onChange(result);
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
          onChange={(e) => onChange(e.target.value)}
          style={{ ...input, marginTop: 8 }}
          placeholder="Paste image URL (optional)"
          disabled={isDisabled}
        />
      )}

      {uploading && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
          Uploading…
        </div>
      )}
    </div>
  );
}

function DocumentField({
  label,
  url,
  onChange,
  bucket,
  disabled,
  accept = '.pdf,.doc,.docx,.ppt,.pptx',
}: {
  label: string;
  url: string;
  onChange: (value: string) => void;
  bucket: 'deal-documents-public' | 'deal-documents-private';
  disabled?: boolean;
  accept?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const isDisabled = !!disabled || uploading;

  const isHttp = /^https?:\/\//i.test(url);
  const fileName = url ? url.split('/').pop() : '';
  const inputId = `doc-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>
        {label}
        {label === 'Full Memo' && (
          <span style={{ marginLeft: 6, color: '#888', fontSize: 11 }}>
            (private)
          </span>
        )}
      </label>

      <div style={{ marginTop: 8 }}>
        {url ? (
          <div style={{ marginBottom: 6 }}>
            {isHttp ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 500 }}
              >
                View {label}
              </a>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#003a5d',
                }}
              >
                {fileName}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 6, color: '#888' }}>
            No document uploaded
          </div>
        )}

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => document.getElementById(inputId)?.click()}
          style={{
            padding: '8px 12px',
            background: isDisabled ? '#94a3b8' : '#003a5d',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {url ? 'Replace document' : 'Upload document'}
        </button>
      </div>

      <input
        id={inputId}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        disabled={isDisabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          setUploading(true);
          try {
            const safeName = file.name.replace(/\s+/g, '-');
            const path = `deals/${Date.now()}-${safeName}`;
            const result = await uploadFile(file, bucket, path);
            if (result) onChange(result);
          } finally {
            setUploading(false);
            e.currentTarget.value = '';
          }
        }}
      />

      {!url && (
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...input, marginTop: 8 }}
          placeholder="Paste document URL (optional)"
          disabled={isDisabled}
        />
      )}

      {uploading && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
          Uploading…
        </div>
      )}
    </div>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  );
}

/* styles */

const container: React.CSSProperties = {
  background: '#f8fafc',
  padding: 40,
};

const content: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  background: '#fff',
  padding: 24,
  borderRadius: 8,
};

const title: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 20,
  padding: '8px 16px',
  background: '#003a5d',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
};
