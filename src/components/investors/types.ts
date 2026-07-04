import type { LucideIcon } from 'lucide-react';

export type Investor = {

    id: string;

    hubspotDealId: string | null;

    raiseSubscriptionId: string | null;

    hubspotStageId: string | null;

    name: string;

    dealName: string;

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
    communicationId?: string;

    subject?: string;

    status?: string;

    direction?: string;

    senderEmail?: string;

    recipientEmail?: string;

    sentAt?: string;

    deliveredAt?: string;

    notes?: string;

    opens?: number;

    clicks?: number;

    replied?: boolean;

    graphMessageId?: string;

    graphConversationId?: string;

    [key: string]: unknown;
};
};
