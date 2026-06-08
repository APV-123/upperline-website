'use client';

import React from 'react';

type Props = {
    title: string;
    saveState?: 'idle' | 'dirty' | 'saved';
    saving?: boolean;
    onSave?: () => void;
};

export default function EditorHeader({
    title,
    saveState = 'idle',
    saving = false,
    onSave,
}: Props) {
    const canSave =
        saveState === 'dirty' && !saving;
    return (
        <div style={container}>
            <div>
                <h1 style={titleStyle}>{title}</h1>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                {saveState !== 'idle' && (
                    <div style={statusStyle}>
                        {saveState === 'dirty' && (
                            <span style={{ color: '#b45309' }}>
                                ● Unsaved Changes
                            </span>
                        )}

                        {saveState === 'saved' && (
                            <span style={{ color: '#15803d' }}>
                                ✓ Saved
                            </span>
                        )}
                    </div>
                )}
                <button
                    onClick={onSave}
                    disabled={!canSave}
                    style={{
                        ...buttonStyle,
                        opacity: canSave ? 1 : 0.6,
                        cursor: canSave
                            ? 'pointer'
                            : 'not-allowed',
                    }}
                >
                    {saving ? 'Saving...' : 'Save Deal'}
                </button>
            </div>
        </div>
    );
}

const container: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
};

const statusStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
};

const buttonStyle: React.CSSProperties = {
    background: '#163a63',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontWeight: 600,
    fontSize: 14,
};