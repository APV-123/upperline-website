import type { LucideIcon } from 'lucide-react';

export type Investor = {

    id: string;

    name: string;

    email: string;

    company: string;

    title: string;

    avatarUrl?: string;

    initials: string;

    stage: string;

    amount: number;

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

    metadata?: Record<string, unknown>;
};
