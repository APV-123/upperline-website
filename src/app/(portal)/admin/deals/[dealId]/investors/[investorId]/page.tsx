'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import InvestorWorkspace from '@/components/investors/InvestorWorkspace';

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

    const loadInvestor = async () => {
        const res = await fetch(
            `/api/deals/${dealId}/investors/${investorId}`,
            {
                cache: 'no-store',
            }
        );

        const json = await res.json();

        setInvestor(json.investor);
        setMetrics(json.metrics);
        setTimeline(json.timeline);
    };

    useEffect(() => {
        loadInvestor();
    }, [dealId, investorId]);


    if (!investor || !metrics) {
        return <div>Loading...</div>;
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