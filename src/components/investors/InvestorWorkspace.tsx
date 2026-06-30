'use client';

import { useState, } from 'react';

import {
    ListFilter,
    Mail,
    FileText,
    NotebookPen,
    CalendarDays,
    CheckSquare,
    ArrowRightLeft,
    Building2,
    MessageSquare,
    RefreshCw,
    DollarSign,
    CheckCircle2,
} from 'lucide-react';

import {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from "./types";

import { HUBSPOT_DEAL_STAGES } from '@/lib/hubspotStages';

import { formatCurrency } from "./formatters";

import styles from './InvestorWorkspace.module.css';
import TimelineCard from "./TimelineCard";

function getActivityTitle(
    activityType: string
) {
    switch (activityType) {
        case 'investor_created':
            return 'Investor Added';

        case 'status_changed':
            return 'Stage Changed';

        case 'ca_completed':
            return 'Confidentiality Agreement Signed';

        case 'im_viewed':
            return 'Investment Memorandum Viewed';

        case 'financial_model_downloaded':
            return 'Financial Model Downloaded';

        case 'commitment_created':
            return 'Commitment Created';

        case 'commitment_updated':
            return 'Commitment Updated';

        case 'commitment_removed':
            return 'Commitment Removed';

        case 'funded':
            return 'Funds Received';

        case 'note_added':
            return 'Internal Note Added';

        default:
            return activityType
                .replaceAll('_', ' ')
                .replace(/\b\w/g, c =>
                    c.toUpperCase()
                );
    }
}
function getActivityDescription(
    item: TimelineEvent
) {
    const m = item.metadata ?? {};

    switch (item.activity_type) {
        case 'status_changed':
            return `${m.from} → ${m.to}`;

        case 'commitment_created':
            return `$${Number(
                m.amount ?? 0
            ).toLocaleString()} commitment recorded`;

        case 'commitment_updated':
            return `Commitment updated from $${Number(
                m.old_amount ?? 0
            ).toLocaleString()} to $${Number(
                m.new_amount ?? 0
            ).toLocaleString()}`;

        case 'commitment_removed':
            return `$${Number(
                m.amount ?? 0
            ).toLocaleString()} commitment removed`;

        case 'im_viewed':
            return 'Viewed Investment Memorandum';

        case 'financial_model_downloaded':
            return 'Downloaded Financial Model';

        case 'ca_completed':
            return 'Executed Confidentiality Agreement';

        case 'investor_created':
            return 'Added to investor pipeline';

        case 'funded':
            return `$${Number(
                m.amount ?? 0
            ).toLocaleString()} funded`;

        case 'note_added':
            return 'Internal note added';

        default:
            return null;
    }
}

function getActivityBadge(
        activityType: string
    ) {
        switch (activityType) {
            case 'note_added':
                return {
                    label: 'NOTE',
                    color: '#fbbf24',
                    icon: MessageSquare,
                };

            case 'status_changed':
                return {
                    label: 'STATUS',
                    color: '#60a5fa',
                    icon: RefreshCw,
                };

            case 'commitment_created':
            case 'commitment_updated':
            case 'commitment_removed':
                return {
                    label: 'COMMITMENT',
                    color: '#22c55e',
                    icon: DollarSign,
                };

            case 'ca_completed':
            case 'im_viewed':
            case 'financial_model_downloaded':
                return {
                    label: 'DOCUMENT',
                    color: colors.accent,
                    icon: FileText,
                };

            case 'funded':
                return {
                    label: 'FUNDED',
                    color: '#22c55e',
                    icon: CheckCircle2,
                };

            default:
                return {
                    label: 'EVENT',
                    color: colors.subtext,
                };
        }
    }

type InvestorWorkspaceProps = {
    investor: Investor;
    metrics: InvestorMetrics;
    timeline: TimelineEvent[];
};

export default function InvestorWorkspace({
    investor,
    metrics,
    timeline,
}: InvestorWorkspaceProps) {

    const [stage, setStage] = useState(investor.hubspotStageId ?? '');
    const [saving, setSaving] = useState(false);


    return (

        <div className={styles.page}>

            <div className={styles.header}>

                <div>
                    <div className={styles.breadcrumb}>
                        ← Colony Lakes
                    </div>
                    <h1 className={styles.dealTitle}>
                        {investor.name}
                    </h1>

                    <div className={styles.subtitle}>
                        {investor.title && investor.company
                            ? `${investor.title} • ${investor.company}`
                            : investor.title ??
                            investor.company ??
                            ""}
                    </div>

                </div>

            </div>

            <div className={styles.workspace}>

                <aside className={styles.sidebar}>

                    <div className={styles.profileCard}>

                        <div className={styles.avatar}>
                            {investor.initials}
                        </div>

                        <div className={styles.profileEmail}>
                            {investor.email}
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.sectionTitle}>
                            Investment
                        </div>

                        <div className={styles.field}>

                            <label>Current Stage</label>

                            <select
                                className={styles.input}
                                value={stage}
                                onChange={(e) =>
                                    setStage(e.target.value)
                                }
                            >
                                {HUBSPOT_DEAL_STAGES.map((stage) => (
                                    <option
                                        key={stage.id}
                                        value={stage.id}
                                    >
                                        {stage.label}
                                    </option>
                                ))}
                            </select>

                        </div>

                        <div className={styles.field}>

                            <label>Investment Amount</label>

                            <input
                                className={styles.input}
                                defaultValue={formatCurrency(metrics.amount)}
                            />

                        </div>

                        <button
                            className={styles.primaryButton}
                            onClick={async () => {
                                if (
                                    !investor.hubspotDealId ||
                                    !investor.raiseSubscriptionId
                                ) {
                                    return;
                                }

                                setSaving(true);

                                try {
                                    const res = await fetch(
                                        `/api/hubspot/deals/${investor.hubspotDealId}/update-stage`,
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type':
                                                    'application/json',
                                            },
                                            body: JSON.stringify({
                                                stageId: stage,
                                                amount: metrics.amount,
                                                raiseSubscriptionId:
                                                    investor.raiseSubscriptionId,
                                            }),
                                        }
                                    );

                                    const json = await res.json();

                                    if (!json.ok) {
                                        alert(
                                            json.error ??
                                            'Unable to save changes.'
                                        );
                                        return;
                                    }

                                    window.location.reload();

                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            Save Changes
                        </button>

                        <div className={styles.divider} />

                        <div className={styles.sectionTitle}>
                            Relationship
                        </div>

                        <div className={styles.statRow}>
                            <span>Relationship</span>
                            <strong className={styles.good}>
                                ● {investor.relationship}
                            </strong>
                        </div>

                        <div className={styles.statRow}>
                            <span>Last Touch</span>
                            <strong>{investor.lastTouch}</strong>
                        </div>

                        <div className={styles.statRow}>
                            <span>Updated</span>
                            <strong>{investor.lastUpdated}</strong>
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.sectionTitle}>
                            Quick Actions
                        </div>

                        <button className={styles.sidebarButton}>
                            <Mail size={16} />
                            Send Email
                        </button>

                        <button className={styles.sidebarButton}>
                            <NotebookPen size={16} />
                            Add Note
                        </button>

                        <button className={styles.sidebarButton}>
                            <CalendarDays size={16} />
                            Schedule Meeting
                        </button>
                        <button className={styles.sidebarButton}>
                            <Building2 size={16} />
                            Invite to AppFolio
                        </button>
                    </div>

                </aside>

                <main className={styles.main}>

                    <div className={styles.metricsBar}>

                        <div className={styles.metric}>
                            <div className={styles.metricLabel}>
                                Amount
                            </div>

                            <div className={styles.metricValue}>
                                {formatCurrency(metrics.amount)}
                            </div>
                        </div>

                        <div className={styles.metric}>
                            <div className={styles.metricLabel}>
                                Relationship
                            </div>

                            <div className={styles.metricValueGreen}>
                                <span className={styles.statusDot}></span>
                                {metrics.relationship}
                            </div>
                        </div>

                        <div className={styles.metric}>
                            <div className={styles.metricLabel}>
                                Documents Viewed
                            </div>

                            <div className={styles.metricValue}>
                                IM • {metrics.memorandumViews} &nbsp;&nbsp;FM • {metrics.modelDownloads}
                            </div>
                        </div>

                        <div className={styles.metric}>
                            <div className={styles.metricLabel}>
                                Last Contact
                            </div>

                            <div className={styles.metricValue}>
                                {metrics.lastContact}
                            </div>
                        </div>

                        <div className={styles.metric}>
                            <div className={styles.metricLabel}>
                                Next Follow-Up
                            </div>

                            <div className={styles.metricValue}>
                                {metrics.nextFollowUp}
                            </div>
                        </div>

                    </div>

                    <div className={styles.timelineCard}>

                        <div className={styles.timelineHeader}>

                            <h2 className={styles.timelineTitle}>
                                Relationship Timeline
                            </h2>

                            <div className={styles.timelineSubtitle}>
                                Every interaction with this investor in one place.
                            </div>

                            <div className={styles.timelineFilters}>

                                <button className={styles.filterActive}>
                                    <ListFilter size={15} />
                                    All
                                </button>

                                <button className={styles.filter}>
                                    <Mail size={15} />
                                    Emails
                                </button>

                                <button className={styles.filter}>
                                    <NotebookPen size={15} />
                                    Notes
                                </button>

                                <button className={styles.filter}>
                                    <CalendarDays size={15} />
                                    Meetings
                                </button>

                                <button className={styles.filter}>
                                    <FileText size={15} />
                                    Documents
                                </button>

                                <button className={styles.filter}>
                                    <CheckSquare size={15} />
                                    Tasks
                                </button>

                            </div>

                        </div>
                        <div className={styles.timeline}>

                            {timeline.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                />
                            ))}

                        </div>

                    </div>

                </main>

            </div>

        </div>
    );
}