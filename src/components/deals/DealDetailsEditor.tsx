'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import { ADMIN_THEME } from '@/lib/adminTheme';
import EditorHeader from './EditorHeader';
import { block } from 'sharp';

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
    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;
    return (
        <div
            style={{
                background: colors.background,
                padding: isMobile ? 12 : 40,
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: isMobile ? '100%' : 720,
                    margin: '0 auto',
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    padding: isMobile ? 16 : 24,
                    borderRadius: 8,
                }}
            >
                <EditorHeader
                    title="Details"
                    saveState={saveState}
                    saving={saving}
                    isDark={isDark}
                    isMobile={isMobile}
                    onSave={onSave}
                />

                <Field
                    label="Deal Name"
                    value={deal.name}
                    colors={colors}
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
                    colors={colors}
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
                    colors={colors}
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
                    colors={colors}
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
                    colors={colors}
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
                    colors={colors}
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
    colors: typeof ADMIN_THEME.dark;
    isMobile: boolean;
    onChange: (value: string) => void;
    type?: string;
};

function Field({
    label,
    value,
    colors,
    isMobile,
    onChange,
    type = 'text',
}: FieldProps) {
    return (
        <div style={{ marginTop: 18 }}>
            <label
                style={{
                    fontSize: 12,
                    color: colors.subtext,
                    display: 'block',
                    marginBottom: 6,
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

                    borderRadius: 8,

                    border: `1px solid ${colors.border}`,

                    background: colors.input,

                    color: colors.text,

                    fontSize: 16,

                    marginTop: 6,
                }}
            />
        </div>
    );
}