'use client';

import React from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';
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

export default function DealNarrativeEditor({
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
                    maxWidth: isMobile ? '100%' : 900,
                    margin: '0 auto',
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    padding: isMobile ? 16 : 24,
                    borderRadius: 8,
                }}
            >
                <EditorHeader
                    title="Narrative"
                    saveState={saveState}
                    saving={saving}
                    isDark={isDark}
                    isMobile={isMobile}
                    onSave={onSave}
                />

                <TextArea
                    label="Hero Thesis"
                    value={deal.thesis}
                    colors={colors}
                    isMobile={isMobile}
                    minHeight={80}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                thesis: v,
                            }
                        })
                    }
                />

                <TextArea
                    label="Investment Overview"
                    value={deal.overview_text}
                    colors={colors}
                    isMobile={isMobile}
                    minHeight={220}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                overview_text: v,
                            }
                        })
                    }
                />

                <TextArea
                    label="Business Plan"
                    value={deal.business_plan_text}
                    colors={colors}
                    isMobile={isMobile}
                    minHeight={220}
                    onChange={(v) =>
                        setDeal((p) => {
                            if (!p) return p;

                            return {
                                ...p,
                                business_plan_text: v,
                            }
                        })
                    }
                />
            </div>
        </div>
    );
}

type TextAreaProps = {
    label: string;
    value: string;
    colors: typeof ADMIN_THEME.dark;
    isMobile: boolean;
    minHeight?: number;
    onChange: (value: string) => void;
};

function TextArea({
    label,
    value,
    colors,
    isMobile,
    minHeight,
    onChange,
}: TextAreaProps) {
    return (
        <div style={{ marginTop: 24 }}>
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

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                style={{
                    width: '100%',
                    padding: isMobile ? 12 : 14,
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    background: colors.input,
                    color: colors.text,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    minHeight: minHeight ?? (isMobile ? 140 : 180),
                    resize: 'vertical',
                }}
            />
        </div>
    );
}

