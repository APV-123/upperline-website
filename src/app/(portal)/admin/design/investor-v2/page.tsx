'use client';

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
                                Log Commitment
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

                                <h2>Relationship Timeline</h2>

                                <div className={styles.timelineFilters}>

                                    <button className={styles.filterActive}>
                                        All
                                    </button>

                                    <button className={styles.filter}>
                                        Emails
                                    </button>

                                    <button className={styles.filter}>
                                        Notes
                                    </button>

                                    <button className={styles.filter}>
                                        Meetings
                                    </button>

                                    <button className={styles.filter}>
                                        Documents
                                    </button>

                                    <button className={styles.filter}>
                                        Tasks
                                    </button>

                                </div>

                            </div>

                            <div className={styles.timeline}>

                                <div className={styles.timelineEvent}>
                                    <div className={styles.eventType}>
                                        📄 Document
                                    </div>

                                    <div className={styles.eventTitle}>
                                        Financial Model Downloaded
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Today • 9:42 AM • Portal
                                    </div>
                                </div>

                                <div className={styles.timelineEvent}>
                                    <div className={styles.eventType}>
                                        📄 Document
                                    </div>

                                    <div className={styles.eventTitle}>
                                        Investment Memorandum Viewed
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Today • 9:38 AM • Portal
                                    </div>
                                </div>

                                <div className={styles.timelineEvent}>
                                    <div className={styles.eventType}>
                                        📝 Note
                                    </div>

                                    <div className={styles.eventTitle}>
                                        Internal Note Added
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Jun 22 • Alex Vitenas
                                    </div>
                                </div>

                                <div className={styles.timelineEvent}>
                                    <div className={styles.eventType}>
                                        📧 Email
                                    </div>

                                    <div className={styles.eventTitle}>
                                        Investor replied to follow-up email
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Jun 20 • Outlook
                                    </div>
                                </div>

                                <div className={styles.timelineEvent}>
                                    <div className={styles.eventType}>
                                        🔄 Stage
                                    </div>

                                    <div className={styles.eventTitle}>
                                        Introduced → Interested
                                    </div>

                                    <div className={styles.eventMeta}>
                                        Jun 19 • Alex Vitenas
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