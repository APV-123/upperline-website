'use client';

import { useState } from 'react';
import {
    HUBSPOT_DEAL_STAGES,
    STAGE_LABEL_TO_ID,
} from '@/lib/hubspotStages';

type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

type Investor = {
    id: string;
    name: string;
    email?: string | null;
    amount: number;
    bucket: Bucket;
    lastActivity: string;
    stageLabel?: string | null;
    stageId?: string | null;
    dealId?: string;
    contactId?: string | null;
};

type StageAction = 'engaged' | 'commit' | 'fund' | 'revert' | 'pass';


function getStageAccent(bucket: Bucket) {
    switch (bucket) {
        case 'committed':
            return '#22c55e'; // green

        case 'needs_touch':
            return '#f59e0b'; // amber

        case 'passed':
            return '#ef4444'; // red

        default:
            return '#3b82f6'; // blue
    }
}

function getAllowedActions(stageId?: string | null): StageAction[] {
    if (!stageId) return [];

    switch (stageId) {
        case STAGE_LABEL_TO_ID['Introduced']:
            return ['engaged', 'pass'] as const;

        case STAGE_LABEL_TO_ID['Engaged']:
        case STAGE_LABEL_TO_ID['Soft Interest']:
        case STAGE_LABEL_TO_ID['Docs / IC Review']:
            return ['commit', 'revert', 'pass'] as const;

        case STAGE_LABEL_TO_ID['Committed']:
            return ['fund', 'pass'] as const;

        default:
            return [];
    }
}

function MenuItem({
    label,
    onClick,
    disabled,
    tone = 'default',
}: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    tone?: 'default' | 'warning' | 'danger';
}) {
    const color =
        tone === 'danger'
            ? '#fb7185'
            : tone === 'warning'
                ? '#fbbf24'
                : '#e5e7eb';

    return (
        <button
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();   // ✅ THIS is the key line
                onClick?.();
            }}
            style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                color,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                borderRadius: 6,
            }}
        >
            {label}
        </button>
    );
}

function Divider() {
    return (
        <div
            style={{
                height: 1,
                background: 'rgba(255,255,255,0.08)',
                margin: '6px 0',
            }}
        />
    );
}

export default function InvestorCard({
    investor,
    onOpen,
    colors,
}: {
    investor: Investor;
    onOpen: () => void;
    colors: {
        surface: string;
        input: string;
        text: string;
        subtext: string;
        border: string;
    }
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div
            onClick={onOpen}
            style={{
                background: '#12284a',
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderTop: `3px solid ${getStageAccent(investor.bucket)}`,
                boxShadow: 'none',
                cursor: 'pointer',
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                {investor.name}
            </div>

            <div
                style={{
                    fontSize: 12,
                    color: colors.subtext,
                    marginBottom: 10,
                }}
            >
                {investor.email}
            </div>

            <div
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: getStageAccent(investor.bucket),
                    textTransform: 'uppercase',
                    letterSpacing: '.5px',
                    marginBottom: 12,
                }}
            >
                {investor.stageLabel}
            </div>

            <div
                style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: 10,
                }}
            >
                ${investor.amount.toLocaleString()}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((v) => !v);
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: '#e5e7eb',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            padding: '6px 12px',
                            cursor: 'pointer',
                        }}
                    >
                        Actions ▾
                    </button>

                    {menuOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: '110%',
                                background: '#0f1317',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 10,
                                padding: 6,
                                minWidth: 170,
                                zIndex: 20,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                        >
                            {(() => {
                                const actions = getAllowedActions(investor.stageId);

                                return (
                                    <>
                                        {/* Workflow (stubbed for now) */}
                                        <MenuItem label="Send Terms" disabled />
                                        <MenuItem label="Nudge" disabled />
                                        <MenuItem label="Approve" disabled />

                                        <Divider />

                                        {/* Pipeline transitions */}
                                        {actions.includes('engaged') && (
                                            <MenuItem
                                                label="Mark Engaged"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                }}

                                            />
                                        )}

                                        {actions.includes('commit') && (
                                            <MenuItem
                                                label="Mark Committed"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('fund') && (
                                            <MenuItem
                                                label="Mark Funded"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('revert') && (
                                            <MenuItem
                                                label="↩ Revert to Introduced"
                                                tone="warning"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('pass') && (
                                            <MenuItem
                                                label="Pass Investor"
                                                tone="danger"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}