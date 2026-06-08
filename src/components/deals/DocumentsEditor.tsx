'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';

type Props = {
    deal: DealFormValues;
};

export default function DocumentsEditor({
    deal,
}: Props) {
    return (
        <div style={container}>
            <div style={content}>
                <EditorHeader
                    title="Details"
                />
                <h1 style={title}>Documents</h1>

                <DocumentCard
                    label="Deal Snapshot"
                    url={deal.abridged_memo_url}
                />

                <DocumentCard
                    label="Full Investment Memorandum"
                    url={deal.full_memo_url}
                    isPrivate
                />

                <DocumentCard
                    label="About Upperline"
                    url={deal.pitch_book_url}
                />

                <div style={{ marginTop: 24 }}>
                    <label style={labelStyle}>
                        Full Memo Requires CA
                    </label>

                    <div style={valueStyle}>
                        {deal.full_memo_requires_ca
                            ? 'Yes'
                            : 'No'}
                    </div>
                </div>
            </div>
        </div>
    );
}

type DocumentCardProps = {
    label: string;
    url: string;
    isPrivate?: boolean;
};

function DocumentCard({
    label,
    url,
    isPrivate = false,
}: DocumentCardProps) {
    const isHttp = /^https?:\/\//i.test(url);

    return (
        <div style={{ marginTop: 20 }}>
            <label style={labelStyle}>
                {label}

                {isPrivate && (
                    <span
                        style={{
                            marginLeft: 8,
                            color: '#64748b',
                            fontSize: 11,
                        }}
                    >
                        (private)
                    </span>
                )}
            </label>

            {!url && (
                <div style={emptyState}>
                    No document uploaded
                </div>
            )}

            {!!url && (
                <div style={card}>
                    {isHttp ? (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={link}
                        >
                            View Document
                        </a>
                    ) : (
                        <div style={fileName}>
                            {url.split('/').pop()}
                        </div>
                    )}
                </div>
            )}
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

const card: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 14,
};

const link: React.CSSProperties = {
    color: '#003a5d',
    fontWeight: 600,
    textDecoration: 'none',
};

const fileName: React.CSSProperties = {
    color: '#003a5d',
    fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
    marginTop: 8,
    padding: 12,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
};

const emptyState: React.CSSProperties = {
    padding: 14,
    border: '1px dashed #cbd5e1',
    borderRadius: 8,
    color: '#64748b',
};