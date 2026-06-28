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

                    <button className={styles.actionButton}>
                        Actions
                    </button>

                </div>

                <div className={styles.workspace}>

                    <aside className={styles.sidebar}>

                        <div className={styles.card}>
                            <h3>Investor</h3>
                        </div>

                        <div className={styles.card}>
                            <h3>Opportunity</h3>
                        </div>

                        <div className={styles.card}>
                            <h3>Relationship</h3>
                        </div>

                        <div className={styles.card}>
                            <h3>Quick Actions</h3>
                        </div>

                    </aside>

                    <main className={styles.main}>

                        <div className={styles.card}>
                            <h2>Relationship Snapshot</h2>
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