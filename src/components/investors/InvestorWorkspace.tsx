'use client';

import {
    useEffect,
    useState,
} from 'react';

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
    const [selectedFilter, setSelectedFilter] =
        useState<
            | 'all'
            | 'email'
            | 'note'
            | 'meeting'
            | 'document'
            | 'task'
        >('all');
    const [employeeDirectory, setEmployeeDirectory] =
        useState<
            Record<
                string,
                {
                    displayName: string;
                    initials: string;
                }
            >
        >({});
    const emailCount = timeline.filter(
        (t) => t.type === 'email'
    ).length;

    const noteCount = timeline.filter(
        (t) => t.type === 'note'
    ).length;

    const meetingCount = timeline.filter(
        (t) => t.type === 'meeting'
    ).length;

    const documentCount = timeline.filter(
        (t) => t.type === 'document'
    ).length;

    const taskCount = timeline.filter(
        (t) => t.type === 'task'
    ).length;

    const totalCount = timeline.length;

    const filteredTimeline =
        selectedFilter === 'all'
            ? timeline
            : timeline.filter(
                (t) =>
                    t.type ===
                    selectedFilter
            );

    useEffect(() => {
        async function loadEmployees() {
            const res = await fetch(
                '/api/employees'
            );

            if (!res.ok) return;

            const json = await res.json();

            setEmployeeDirectory(
                json.directory ?? {}
            );
        }

        loadEmployees();
    }, []);

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
                                IM:{metrics.memorandumViews} &nbsp;&nbsp;FM: {metrics.modelDownloads}
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
                                Relationship History ({totalCount})
                            </h2>

                            <div className={styles.timelineSubtitle}>
                                Every interaction with this investor in one place.
                            </div>

                            <div className={styles.timelineFilters}>

                                <button
                                    className={
                                        selectedFilter === 'all'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('all')
                                    }
                                >
                                    <ListFilter size={15} />
                                    All
                                </button>

                                <button
                                    className={
                                        selectedFilter === 'email'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('email')
                                    }
                                >
                                    <Mail size={15} />
                                    Emails ({emailCount})
                                </button>

                                <button
                                    className={
                                        selectedFilter === 'note'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('note')
                                    }
                                >
                                    <NotebookPen size={15} />
                                    Notes ({noteCount})
                                </button>

                                <button
                                    className={
                                        selectedFilter === 'meeting'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('meeting')
                                    }
                                >

                                    <CalendarDays size={15} />
                                    Meetings ({meetingCount})
                                </button>

                                <button
                                    className={
                                        selectedFilter === 'document'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('document')
                                    }
                                >
                                    <FileText size={15} />
                                    Documents ({documentCount})
                                </button>

                                <button
                                    className={
                                        selectedFilter === 'task'
                                            ? styles.filterActive
                                            : styles.filter
                                    }
                                    onClick={() =>
                                        setSelectedFilter('task')
                                    }
                                >
                                    <CheckSquare size={15} />
                                    Tasks ({taskCount})
                                </button>

                            </div>

                        </div>
                        <div className={styles.timeline}>

                            {filteredTimeline.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    employeeDirectory={
                                        employeeDirectory
                                    }
                                />
                            ))}

                        </div>

                    </div>

                </main>

            </div>

        </div>
    );
}