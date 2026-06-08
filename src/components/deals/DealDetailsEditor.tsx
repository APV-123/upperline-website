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
};

export default function DealDetailsEditor({
    deal,
    setDeal,
}: Props) {
    if (!deal) return null;
    return (
        <div style={container}>
            <div style={content}>
                <EditorHeader
                    title="Details"
                />

                <Field
                    label="Deal Name"
                    value={deal.name}
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

const labelStyle: React.CSSProperties = {
    fontSize: 12,
};

const input: React.CSSProperties = {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
};