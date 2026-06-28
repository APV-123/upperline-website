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

                        <h1 className={styles.title}>
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

                            <h2 className={styles.profileName}>
                                Alexander Vitenas
                            </h2>

                            <div className={styles.profileTitle}>
                                Managing Partner
                            </div>

                            <div className={styles.profileCompany}>
                                Upperline Capital
                            </div>

                            <div className={styles.profileEmail}>
                                alex@upperlineco.com
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.sectionTitle}>
                                Opportunity
                            </div>

                            <div className={styles.statRow}>
                                <span>Stage</span>
                                <strong>Committed</strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>Amount</span>
                                <strong>$250,000</strong>
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.sectionTitle}>
                                Relationship
                            </div>

                            <div className={styles.statRow}>
                                <span>Health</span>
                                <strong>Excellent</strong>
                            </div>

                            <div className={styles.statRow}>
                                <span>Last Activity</span>
                                <strong>2h ago</strong>
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
                                    Stage
                                </div>

                                <div className={styles.metricValue}>
                                    Committed
                                </div>
                            </div>

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
                                    Last Activity
                                </div>

                                <div className={styles.metricValue}>
                                    2 hours ago
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>
                                    Next Action
                                </div>

                                <div className={styles.metricValue}>
                                    Follow Up
                                </div>
                            </div>

                        </div>

                        <div className={styles.cardLarge}>
                            <h2>Timeline</h2>
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