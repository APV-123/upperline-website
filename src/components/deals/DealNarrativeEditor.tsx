'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';

type Props = {
    deal: DealFormValues;
};

export default function DealNarrativeEditor({
    deal,
}: Props) {
    return (
        <div style={container}>
            <div style={content}>
                <EditorHeader
                                    title="Details"
                                />
                <h1 style={title}>Narrative</h1>

                <TextArea
                    label="Hero Thesis"
                    value={deal.thesis}
                />

                <TextArea
                    label="Why We Like This Opportunity"
                    value={deal.why_we_like_it}
                />

                <TextArea
                    label="Overview"
                    value={deal.overview_text}
                />

                <TextArea
                    label="Business Plan"
                    value={deal.business_plan_text}
                />
            </div>
        </div>
    );
}

type TextAreaProps = {
    label: string;
    value: string;
};

function TextArea({
    label,
    value,
}: TextAreaProps) {
    return (
        <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>
                {label}
            </label>

            <textarea
                value={value}
                readOnly
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

const title: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
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