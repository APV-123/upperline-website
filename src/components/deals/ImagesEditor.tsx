'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';

type Props = {
    deal: DealFormValues;
};

export default function ImagesEditor({
    deal,
}: Props) {
    return (
        <div style={container}>
            <div style={content}>
                <EditorHeader
                                    title="Images"
                                />

                <ImageCard
                    label="Primary Image"
                    url={deal.image_1_url}
                />

                <ImageCard
                    label="Secondary Image"
                    url={deal.image_2_url}
                />

                <ImageCard
                    label="Tertiary Image"
                    url={deal.image_3_url}
                />
            </div>
        </div>
    );
}

type ImageCardProps = {
    label: string;
    url: string;
};

function ImageCard({
    label,
    url,
}: ImageCardProps) {
    return (
        <div style={{ marginTop: 20 }}>
            <label style={labelStyle}>
                {label}
            </label>

            {url ? (
                <div style={{ marginTop: 8 }}>
                    <img
                        src={url}
                        alt={label}
                        style={{
                            width: '100%',
                            maxHeight: 300,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                        }}
                    />
                </div>
            ) : (
                <div style={emptyState}>
                    No image uploaded
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

const labelStyle: React.CSSProperties = {
    fontSize: 12,
    display: 'block',
    marginBottom: 6,
};

const emptyState: React.CSSProperties = {
    marginTop: 8,
    padding: 16,
    border: '1px dashed #cbd5e1',
    borderRadius: 8,
    color: '#64748b',
    fontSize: 14,
};