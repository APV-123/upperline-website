'use client';

import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'next/navigation';

import InvestorWorkspace from '@/components/investors/InvestorWorkspace';
import styles from "./page.module.css";

import type {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from '@/components/investors/types';

import AdminNav from '@/components/navigation/AdminNav';

export default function InvestorPage() {
    const { dealId, investorId } = useParams<{
        dealId: string;
        investorId: string;
    }>();

    const [investor, setInvestor] =
        useState<Investor | null>(null);

    const [metrics, setMetrics] =
        useState<InvestorMetrics | null>(null);

    const [timeline, setTimeline] =
        useState<TimelineEvent[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const loadInvestor = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/deals/${dealId}/investors/${investorId}`,
                {
                    cache: 'no-store',
                }
            );

            if (!res.ok) {
                throw new Error(
                    "Unable to load investor."
                );
            }

            const json = await res.json();

            setInvestor(json.investor);
            setMetrics(json.metrics);
            setTimeline(json.timeline);

        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unknown error"
            );

        } finally {
            setLoading(false);
        }
    }, [dealId, investorId]);

    useEffect(() => {
    loadInvestor();
}, [loadInvestor]);


    if (loading) {
        return (
            <>
                <AdminNav />

                <div className={styles.loadingPage}>

                    <div className={styles.loadingSidebar} />

                    <div className={styles.loadingContent}>

                        <div className={styles.loadingMetrics} />

                        <div className={styles.loadingTimeline}>
                            <div className={styles.loadingCard} />
                            <div className={styles.loadingCard} />
                            <div className={styles.loadingCard} />
                            <div className={styles.loadingCard} />
                        </div>

                    </div>

                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <AdminNav />

                <div className={styles.errorState}>
                    <h2>Unable to load investor</h2>

                    <p>
                        Something went wrong while loading
                        this workspace.
                    </p>

                    <button
                        className={styles.retryButton}
                        onClick={loadInvestor}
                    >
                        Try Again
                    </button>
                </div>
            </>

        );
    }

    if (!investor || !metrics) {
        return null;
    }

    return (
        <>
            <AdminNav />

            <InvestorWorkspace
                investor={investor}
                metrics={metrics}
                timeline={timeline}
                refresh={loadInvestor}
            />
        </>
    );

}
