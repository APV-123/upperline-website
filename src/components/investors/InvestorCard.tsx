'use client';

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
            <div
                style={{
                    marginTop: 18,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.subtext,
                    opacity: 0.8,
                }}
            >
                View investor →
            </div>
        </div>
    );
}