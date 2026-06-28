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

                                <label>Stage</label>

                                <select className={styles.input}>
                                    <option>Introduced</option>
                                    <option>Interested</option>
                                    <option>Circling</option>
                                    <option>Committed</option>
                                    <option>Funded</option>
                                </select>

                            </div>

                            <div className={styles.field}>

                                <label>Amount</label>

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
                                <span>Status</span>
                                <strong className={styles.good}>
                                    ● Highly Engaged
                                </strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>Last Activity</span>
                                <strong>Viewed Financial Model</strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>When</span>
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

                        <div className={styles.cardLarge}>
                            <h2>Relationship Timeline</h2>
                        </div>

                        <div className={styles.card}>
                            <h2>Communications</h2>
                        </div>

                        <div className={styles.card}>
                            <h2>Notes</h2>
                        </div>

                        <div className={styles.card}>
                            <h2>Meetings</h2>
                        </div>

                        <div className={styles.card}>
                            <h2>Tasks</h2>
                        </div>

                    </main>

                </div>

            </div>
        </>
    );
}