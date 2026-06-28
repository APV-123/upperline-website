'use client';

import {
    ListFilter,
    Mail,
    FileText,
    NotebookPen,
    CalendarDays,
    CheckSquare,
    ArrowRightLeft,
} from 'lucide-react';


import AdminNav from '@/components/navigation/AdminNav';
import styles from './page.module.css';

export default function InvestorV2Page() {
    return (
        <>
            <AdminNav />

            <div className={styles.page}>

                <div className={styles.header}>

                    <div>

                        <div className={styles.breadcrumb}>
                            ← Colony Lakes
                        </div>
                        <h1 className={styles.dealTitle}>
                            Alexander Vitenas
                        </h1>

                        <div className={styles.subtitle}>
                            Managing Partner • Upperline Capital
                        </div>

                    </div>

                </div>

                <div className={styles.workspace}>

                    <aside className={styles.sidebar}>

                        <div className={styles.profileCard}>

                            <div className={styles.avatar}>
                                AV
                            </div>

                            <div className={styles.profileEmail}>
                                alex@upperlineco.com
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.sectionTitle}>
                                Investment
                            </div>

                            <div className={styles.field}>

                                <label>Current Stage</label>

                                <select className={styles.input}>
                                    <option>Introduced</option>
                                    <option>Interested</option>
                                    <option>Circling</option>
                                    <option>Committed</option>
                                    <option>Funded</option>
                                </select>

                            </div>

                            <div className={styles.field}>

                                <label>Investment Amount</label>

                                <input
                                    className={styles.input}
                                    defaultValue="$250,000"
                                />

                            </div>

                            <button className={styles.primaryButton}>
                                Save Changes
                            </button>

                            <div className={styles.divider} />

                            <div className={styles.sectionTitle}>
                                Relationship
                            </div>

                            <div className={styles.statRow}>
                                <span>Relationship</span>
                                <strong className={styles.good}>
                                    ● Highly Engaged
                                </strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>Last Touch</span>
                                <strong>Viewed Financial Model</strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>Updated</span>
                                <strong>2 hours ago</strong>
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.sectionTitle}>
                                Quick Actions
                            </div>

                            <button className={styles.sidebarButton}>
                                Send Email
                            </button>

                            <button className={styles.sidebarButton}>
                                Add Note
                            </button>

                            <button className={styles.sidebarButton}>
                                Schedule Meeting
                            </button>
                            <button className={styles.sidebarButton}>
                                Invite to Appfolio
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
                                    $250,000
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>
                                    Relationship
                                </div>

                                <div className={styles.metricValueGreen}>
                                    ● Healthy
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>
                                    Documents Viewed
                                </div>

                                <div className={styles.metricValue}>
                                    IM • 11&nbsp;&nbsp;FM • 2
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>
                                    Last Contact
                                </div>

                                <div className={styles.metricValue}>
                                    Jun&nbsp;23
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>
                                    Next Follow-Up
                                </div>

                                <div className={styles.metricValue}>
                                    Tomorrow
                                </div>
                            </div>

                        </div>

                        <div className={styles.timelineCard}>

                            <div className={styles.timelineHeader}>

                                <div>
                                    <h2 className={styles.timelineTitle}>
                                        Relationship Timeline
                                    </h2>

                                    <div className={styles.timelineSubtitle}>
                                        Every interaction with this investor in one place.
                                    </div>
                                </div>

                                <div className={styles.timelineFilters}>

                                    <button className={styles.filterActive}>
                                        <ListFilter size={15} />   All
                                    </button>

                                    <button className={styles.filter}>
                                        <Mail size={15} />
                                        Emails
                                    </button>

                                    <button className={styles.filter}>
                                        <NotebookPen size={15} />  Notes
                                    </button>

                                    <button className={styles.filter}>
                                        <CalendarDays size={15} /> Meetings
                                    </button>

                                    <button className={styles.filter}>
                                        <FileText size={15} />     Documents
                                    </button>

                                    <button className={styles.filter}>
                                        <CheckSquare size={15} />  Tasks
                                    </button>

                                </div>

                            </div>

                            <div className={styles.timeline}>

                                <div className={`${styles.timelineEvent} ${styles.document}`}>

                                    <div className={styles.eventTop}>

                                        <span className={styles.eventBadge}>
                                            <FileText size={13} />
                                            DOCUMENT
                                        </span>

                                        <span className={styles.eventTime}>
                                            Today • 9:42 AM
                                        </span>

                                    </div>

                                    <div className={styles.eventTitle}>
                                        Financial Model Downloaded
                                    </div>

                                    <div className={styles.eventDescription}>
                                        Downloaded from the Investor Portal.
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Portal
                                    </div>

                                </div>


                                <div className={`${styles.timelineEvent} ${styles.document}`}>

                                    <div className={styles.eventTop}>

                                        <span className={styles.eventBadge}>
                                            📄 DOCUMENT
                                        </span>

                                        <span className={styles.eventTime}>
                                            Today • 9:38 AM
                                        </span>

                                    </div>

                                    <div className={styles.eventTitle}>
                                        Investment Memorandum Viewed
                                    </div>

                                    <div className={styles.eventDescription}>
                                        Investor has viewed the memorandum 11 times.
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Portal
                                    </div>

                                </div>


                                <div className={`${styles.timelineEvent} ${styles.note}`}>

                                    <div className={styles.eventTop}>

                                        <span className={styles.eventBadge}>
                                            <NotebookPen size={13} />
                                            NOTE
                                        </span>

                                        <span className={styles.eventTime}>
                                            Jun 22 • 4:17 PM
                                        </span>

                                    </div>

                                    <div className={styles.eventTitle}>
                                        Internal Note Added
                                    </div>

                                    <div className={styles.eventDescription}>
                                        Waiting on investment committee feedback before scheduling another call.
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Alex Vitenas
                                    </div>

                                </div>


                                <div className={`${styles.timelineEvent} ${styles.email}`}>

                                    <div className={styles.eventTop}>

                                        <span className={styles.eventBadge}>
                                            <Mail size={13} />
                                            EMAIL
                                        </span>

                                        <span className={styles.eventTime}>
                                            Jun 20 • 2:49 PM
                                        </span>

                                    </div>

                                    <div className={styles.eventTitle}>
                                        Investor Replied
                                    </div>

                                    <div className={styles.eventDescription}>
                                        Investor replied that they&apos;ll review everything over the weekend.
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Outlook
                                    </div>

                                </div>


                                <div className={`${styles.timelineEvent} ${styles.stage}`}>

                                    <div className={styles.eventTop}>

                                        <span className={styles.eventBadge}>
                                            <ArrowRightLeft size={13} />
                                            STAGE
                                        </span>

                                        <span className={styles.eventTime}>
                                            Jun 19 • 4:38 PM
                                        </span>

                                    </div>

                                    <div className={styles.eventTitle}>
                                        Stage Changed
                                    </div>

                                    <div className={styles.eventDescription}>
                                        Introduced → Interested
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Alex Vitenas
                                    </div>

                                </div>

                            </div>

                        </div>

                    </main>

                </div>

            </div>
        </>
    );
}