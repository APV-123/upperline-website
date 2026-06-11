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
                    maxWidth: isMobile ? '100%' : 820,
                    margin: '0 auto',
                    background: isDark ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    padding: isMobile ? 16 : 24,
                    borderRadius: 8,
                }}
            >
                <EditorHeader
                    title="Narrative"
                    saveState={saveState}
                    saving={saving}
                    onSave={onSave}
                />

                <TextArea
                    label="Hero Thesis"
                    value={deal.thesis}
                    isDark={isDark}
                    isMobile={isMobile}
                    minHeight={240}
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
                    isDark={isDark}
                    isMobile={isMobile}
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
                    isDark={isDark}
                    isMobile={isMobile}
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
    isDark: boolean;
    isMobile: boolean;
    minHeight?: number;
    onChange: (value: string) => void;
};

function TextArea({
    label,
    value,
    isDark,
    isMobile,
    minHeight,
    onChange,
}: TextAreaProps) {
    return (
        <div style={{ marginTop: 16 }}>
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

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                style={{
                    width: '100%',
                    padding: isMobile ? 12 : 14,
                    borderRadius: 6,
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    minHeight: minHeight ?? (isMobile ? 140 : 180),
                    resize: 'vertical',
                }}
            />
        </div>
    );
}

