'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import InvestorWorkspace from '@/components/investors/InvestorWorkspace';

import type {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from '@/components/investors/types';

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

    useEffect(() => {
        loadInvestor();
    }, [dealId, investorId]);

    async function loadInvestor() {
        const res = await fetch(
            `/api/deals/${dealId}/investors/${investorId}`,
            {
                cache: 'no-store',
            }
        );

        const json = await res.json();

        console.log(json);

        // Next commit:
        // setInvestor(json.investor);
        // setMetrics(json.metrics);
        // setTimeline(json.timeline);
    }

    if (!investor || !metrics) {
        return <div>Loading...</div>;
    }

    return (
        <InvestorWorkspace
            investor={investor}
            metrics={metrics}
            timeline={timeline}
        />
    );
}