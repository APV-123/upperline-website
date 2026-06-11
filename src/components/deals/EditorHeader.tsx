'use client';

import React from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';

type Props = {
    title: string;
    saveState?: 'idle' | 'dirty' | 'saved';
    saving?: boolean;
    isDark: boolean;
    isMobile: boolean;
    onSave?: () => void;
};

export default function EditorHeader({
    title,
    saveState = 'idle',
    saving = false,
    isDark,
    isMobile,
    onSave,
}: Props) {
    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;
    const canSave =
        saveState === 'dirty' && !saving;
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 12 : 16,
                marginBottom: 20,
            }}
        >
            <div>
                <h1
                    style={{
                        margin: 0,
                        fontSize: isMobile ? 32 : 40,
                        fontWeight: 700,
                        color: colors.text,
                    }}
                >
                    {title}
                </h1>
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
                            <span style={{ color: '#f59e0b' }}>
                                ● Unsaved Changes
                            </span>
                        )}

                        {saveState === 'saved' && (
                            <span style={{ color: colors.accent }}>
                                ✓ Saved
                            </span>
                        )}
                    </div>
                )}
                <button
                    onClick={onSave}
                    disabled={!canSave}
                    style={{
                        background: canSave
                            ? `${colors.accent}20`
                            : colors.surface,

                        color: canSave
                            ? colors.accent
                            : colors.subtext,

                        border: `1px solid ${canSave
                                ? colors.accent
                                : colors.border
                            }`,

                        borderRadius: 10,

                        padding: isMobile
                            ? '12px 16px'
                            : '12px 20px',

                        fontWeight: 600,
                        fontSize: 14,

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