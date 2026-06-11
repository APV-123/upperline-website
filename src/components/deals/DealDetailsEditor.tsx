'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';

type EditableDeal = DealFormValues & {
    id: string;
};

type Props = {
    deal: EditableDeal | null;
    setDeal: React.Dispatch<
        React.SetStateAction<EditableDeal | null>
    >;
    saveState: 'idle' | 'dirty' | 'saved';
    saving: boolean;
    isMobile: boolean;
    isDark: boolean;
    onSave: () => void;
};

export default function DealDetailsEditor({
    deal,
    setDeal,
    saveState,
    saving,
    isMobile,
    isDark,
    onSave,
}: Props) {
    if (!deal) return null;
    return (
        <div
            style={{
                background: isDark ? '#0f172a' : '#f8fafc',
                padding: isMobile ? 12 : 40,
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: isMobile ? '100%' : 720,
                    margin: '0 auto',
                    background: isDark ? '#1e293b' : '#ffffff',
                    padding: isMobile ? 16 : 24,
                    borderRadius: 8,
                }}
            >
                <EditorHeader
                    title="Details"
                    saveState={saveState}
                    saving={saving}
                    onSave={onSave}
                />

                <Field
                    label="Deal Name"
                    value={deal.name}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                name: v,
                            };
                        })
                    }
                />

                <Field
                    label="Target Raise"
                    type="number"
                    value={deal.target_amount}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                target_amount: v === '' ? 0 : Number(v),
                            };
                        })
                    }
                />

                <Field
                    label="Location"
                    value={deal.location}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                location: v,
                            };
                        })
                    }
                />

                <Field
                    label="Asset Class"
                    value={deal.asset_class}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                asset_class: v,
                            };
                        })
                    }
                />

                <Field
                    label="Strategy"
                    value={deal.strategy}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                strategy: v,
                            };
                        })
                    }
                />

                <Field
                    label="Estimated Closing Date"
                    type="date"
                    value={deal.estimated_closing_date}
                    isDark={isDark}
                    isMobile={isMobile}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                estimated_closing_date: v,
                            };
                        })
                    }
                />
            </div>
        </div>
    );
}

type FieldProps = {
    label: string;
    value: string | number;
    isDark: boolean;
    isMobile: boolean;
    onChange: (value: string) => void;
    type?: string;
};

function Field({
    label,
    value,
    isDark,
    isMobile,
    onChange,
    type = 'text',
}: FieldProps) {
    return (
        <div style={{ marginTop: 12 }}>
            <label
                style={{
                    fontSize: 12,
                    color: isDark ? '#cbd5e1' : '#475569',
                }}
            >
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '100%',
                    padding: isMobile ? 10 : 12,
                    borderRadius: 6,
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 16,
                }}
            />
        </div>
    );
}