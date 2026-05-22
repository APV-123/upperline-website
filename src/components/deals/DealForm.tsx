'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
    // These must exist in the browser build
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // This error is MUCH clearer than “supabaseKey required”
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
    estimated_closing_date: string;
    overview_text: string;

    // ✅ metrics
    project_unlevered_irr: string;
    project_levered_irr: string;
    target_lp_equity_multiple: string;
    target_lp_levered_irr: string;
    untrended_return_on_cost: string;
    stabilized_return_on_cost: string;
    total_equity_requirement: string;
    construction_loan: string;
    total_project_cost: string;

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
    loading?: boolean;
};

export default function DealForm({ initialDeal, onSave, loading }: Props) {
    const [deal, setDeal] = useState<DealFormValues>({
        name: initialDeal?.name ?? '',
        target_amount: Number(initialDeal?.target_amount ?? 0) || 0,
        location: initialDeal?.location ?? '',
        estimated_closing_date: initialDeal?.estimated_closing_date ?? '',
        overview_text: initialDeal?.overview_text ?? '',
        project_unlevered_irr: initialDeal?.project_unlevered_irr ?? '',
        project_levered_irr: initialDeal?.project_levered_irr ?? '',
        target_lp_equity_multiple: initialDeal?.target_lp_equity_multiple ?? '',
        target_lp_levered_irr: initialDeal?.target_lp_levered_irr ?? '',
        untrended_return_on_cost: initialDeal?.untrended_return_on_cost ?? '',
        stabilized_return_on_cost: initialDeal?.stabilized_return_on_cost ?? '',
        total_equity_requirement: initialDeal?.total_equity_requirement ?? '',
        construction_loan: initialDeal?.construction_loan ?? '',
        total_project_cost: initialDeal?.total_project_cost ?? '',
        image_1_url: initialDeal?.image_1_url ?? '',
        image_2_url: initialDeal?.image_2_url ?? '',
        image_3_url: initialDeal?.image_3_url ?? '',
        pitch_book_url: initialDeal?.pitch_book_url ?? '',
        abridged_memo_url: initialDeal?.abridged_memo_url ?? '',
        full_memo_url: initialDeal?.full_memo_url ?? '',
        full_memo_requires_ca: Boolean(initialDeal?.full_memo_requires_ca ?? false),
    });

    const [saving, setSaving] = useState(false);

    async function handleSubmit() {
        setSaving(true);
        try {
            await onSave(deal);
        } catch (e) {
            console.error('[FORM SAVE ERROR]', e);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    }


    return (
        <div style={container}>
            <div style={content}>
                <h1 style={title}>Deal</h1>

                {/* BASIC INFO */}
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
                            setDeal(p => ({
                                ...p,
                                target_amount: v === '' ? 0 : Number(v)
                            }))
                        }

                    />

                    <Field
                        label="Location"
                        value={deal.location}
                        onChange={(v) => setDeal((p) => ({ ...p, location: v }))}
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
                        label="About This Offering"
                        value={deal.overview_text}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, overview_text: v }))
                        }
                    />

                </Section>
                <Section title="Images">

                    <ImageField
                        label="Primary Image"
                        url={deal.image_1_url}
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, image_1_url: v }))}
                    />

                    <ImageField
                        label="Secondary Image"
                        url={deal.image_2_url}
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, image_2_url: v }))}
                    />

                    <ImageField
                        label="Tertiary Image"
                        url={deal.image_3_url}
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, image_3_url: v }))}
                    />

                </Section>
                {/* RETURNS */}
                <Section title="Returns">

                    <Field
                        label="Project Unlevered IRR"
                        value={deal.project_unlevered_irr}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, project_unlevered_irr: v }))
                        }
                    />

                    <Field
                        label="Project Levered IRR"
                        value={deal.project_levered_irr}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, project_levered_irr: v }))
                        }
                    />

                    <Field
                        label="Target LP Equity Multiple"
                        value={deal.target_lp_equity_multiple}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, target_lp_equity_multiple: v }))
                        }
                    />

                    <Field
                        label="Target LP Levered IRR"
                        value={deal.target_lp_levered_irr}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, target_lp_levered_irr: v }))
                        }
                    />

                </Section>

                {/* YIELD */}
                <Section title="Yield & Cost">

                    <Field
                        label="Un-Trended Return on Cost"
                        value={deal.untrended_return_on_cost}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, untrended_return_on_cost: v }))
                        }
                    />

                    <Field
                        label="Stabilized Return on Cost"
                        value={deal.stabilized_return_on_cost}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, stabilized_return_on_cost: v }))
                        }
                    />

                </Section>

                {/* CAPITAL STACK */}
                <Section title="Capital Stack">

                    <Field
                        label="Total Equity Requirement"
                        value={deal.total_equity_requirement}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, total_equity_requirement: v }))
                        }
                    />

                    <Field
                        label="Construction Loan"
                        value={deal.construction_loan}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, construction_loan: v }))
                        }
                    />

                    <Field
                        label="Total Project Cost"
                        value={deal.total_project_cost}
                        onChange={(v) =>
                            setDeal((p) => ({ ...p, total_project_cost: v }))
                        }
                    />

                </Section>
                <Section title="Documents">
                    <DocumentField
                        label="Pitch Book"
                        url={deal.pitch_book_url}
                        bucket="deal-documents-public"
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, pitch_book_url: v }))}
                    />

                    <DocumentField
                        label="Abridged Memo"
                        url={deal.abridged_memo_url}
                        bucket="deal-documents-public"
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, abridged_memo_url: v }))}
                    />

                    <DocumentField
                        label="Full Memo"
                        url={deal.full_memo_url}
                        bucket="deal-documents-private"
                        disabled={saving || !!loading}
                        onChange={(v) => setDeal(p => ({ ...p, full_memo_url: v }))}
                    />

                    <Checkbox
                        label="Full Memo Requires CA"
                        checked={deal.full_memo_requires_ca}
                        onChange={(v) => setDeal(p => ({ ...p, full_memo_requires_ca: v }))}
                    />
                </Section>

                <button
                    onClick={handleSubmit}
                    style={primaryBtn}
                    disabled={saving || !!loading}
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
type CheckboxProps = {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
};
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

    // ✅ Public buckets: return public URL
    if (bucket !== 'deal-documents-private') {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }

    // ✅ Private bucket: store the path (signed URL later)
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
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {url ? 'Replace file' : 'Upload file'}
            </div>
            <input
                type="file"
                accept="image/*"
                style={{ marginTop: 8 }}
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
                    placeholder="Paste image URL (optional)"
                    disabled={isDisabled}
                />
            )}

            {uploading && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>Uploading…</div>
            )}
        </div>
    );
}

function Checkbox({ label, checked, onChange }: CheckboxProps) {
    return (
        <div style={{ marginTop: 12 }}>
            <label style={{ ...labelStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
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

    return (
        <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>{label}</label>

            {url ? (
                <div style={{ marginTop: 8 }}>
                    {isHttp ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">View Document</a>
                    ) : (
                        <span style={{ color: '#666', fontSize: 12 }}>Saved path: {url}</span>
                    )}
                </div>
            ) : (
                <div style={{ marginTop: 8, color: '#888' }}>No document uploaded</div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {url ? 'Replace file' : 'Upload file'}
            </div>
            <input
                type="file"
                accept={accept}
                style={{ marginTop: 8 }}
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
                <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>Uploading…</div>
            )}
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

const container = {
    background: '#f8fafc',
    padding: 40,
};

const content = {
    maxWidth: 720,
    margin: '0 auto',
    background: '#fff',
    padding: 24,
    borderRadius: 8,
};

const title = {
    fontSize: 20,
    fontWeight: 700,
};

const labelStyle = {
    fontSize: 12,
};

const input = {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
};

const primaryBtn = {
    marginTop: 20,
    padding: '8px 16px',
    background: '#003a5d',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
};
