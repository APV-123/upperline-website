import type { LucideIcon } from 'lucide-react';

export type Investor = {

    id: string;

    hubspotDealId: string | null;

    raiseSubscriptionId: string | null;

    hubspotStageId: string | null;

    name: string;

    email?: string | null;

    company?: string | null;

    title?: string | null;

    avatarUrl?: string | null;

    initials: string;

    stage: string;

    relationship: string;

    lastTouch: string;

    lastUpdated: string;
};

export type InvestorMetrics = {

    amount: number;

    relationship: string;

    memorandumViews: number;

    modelDownloads: number;

    lastContact: string;

    nextFollowUp: string;

};

export type TimelineEvent = {
    id: string;

    type:
        | "email"
        | "note"
        | "document"
        | "meeting"
        | "task"
        | "stage"
        | "commitment";

    source:
        | "portal"
        | "hubspot"
        | "outlook"
        | "employee";

    title: string;

    description: string;

    actor?: string;

    timestamp: string;

    metadata?: {
    opens?: number;
    clicks?: number;
    replied?: boolean;

    [key: string]: unknown;
};
};
