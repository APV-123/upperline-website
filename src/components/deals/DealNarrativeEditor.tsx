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
    onSave: () => void;
};

export default function DealNarrativeEditor({
    deal,
    setDeal,
    saveState,
    saving,
    onSave,
}: Props) {
    if (!deal) return null;
    return (
        <div style={container}>
            <div style={content}>
                <EditorHeader
                    title="Narrative"
                    saveState={saveState}
                    saving={saving}
                    onSave={onSave}
                />

                <TextArea
                    label="Hero Thesis"
                    value={deal.thesis}
                    onChange={(v) =>
                        setDeal((p) => {
                            if(!p) return p;

                            return {
                                ...p,
                                thesis: v,
                            }
                        })
                    }
                />

                <TextArea
                    label="Why We Like This Opportunity"
                    value={deal.why_we_like_it}
                    onChange={(v) => 
                        setDeal((p) => {
                            if(!p) return p;

                            return {
                                ...p,
                                why_we_like_it: v,
                            }
                        })
                    }
                />

                <TextArea
                    label="Overview"
                    value={deal.overview_text}
                    onChange={(v) =>
                        setDeal((p) => {
                            if(!p) return p;

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
                    onChange={(v) =>
                        setDeal((p) => {
                            if(!p) return p;

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
    onChange: (value: string) => void;
};

function TextArea({
    label,
    value,
    onChange,
}: TextAreaProps) {
    return (
        <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>
                {label}
            </label>

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                style={{
                    ...input,
                    minHeight: 180,
                    resize: 'vertical',
                }}
            />
        </div>
    );
}

const container: React.CSSProperties = {
    background: '#f8fafc',
    padding: 40,
};

const content: React.CSSProperties = {
    maxWidth: 820,
    margin: '0 auto',
    background: '#fff',
    padding: 24,
    borderRadius: 8,
};

const labelStyle: React.CSSProperties = {
    fontSize: 12,
    display: 'block',
    marginBottom: 6,
};

const input: React.CSSProperties = {
    width: '100%',
    padding: 12,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: 14,
};