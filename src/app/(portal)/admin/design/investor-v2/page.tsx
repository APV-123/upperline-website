'use client';

import AdminNav from '@/components/navigation/AdminNav';

import InvestorWorkspace from '@/components/investors/InvestorWorkspace';

import {
    Investor,
    InvestorMetrics,
    TimelineEvent,
} from '@/components/investors/types';

export default function InvestorV2Page() {

    const investor: Investor = {
        id: '1',
        name: 'Alexander Vitenas',
        email: 'alex@upperlineco.com',
        company: 'Upperline Capital',
        title: 'Managing Partner',
        initials: 'AV',
        stage: 'Committed',
        amount: 250000,
        relationship: 'Highly Engaged',
        lastTouch: 'Viewed Financial Model',
        lastUpdated: '2 hours ago',
    };

    const metrics: InvestorMetrics = {
        amount: 250000,
        relationship: 'Healthy',
        memorandumViews: 11,
        modelDownloads: 2,
        lastContact: 'Jun 23',
        nextFollowUp: 'Tomorrow',
    };

    const timeline: TimelineEvent[] = [
        {
            id: '1',
            type: 'document',
            source: 'portal',
            title: 'Financial Model Downloaded',
            description: 'Downloaded from the Investor Portal.',
            actor: 'Portal',
            timestamp: 'Today • 9:42 AM',
        },
        {
            id: '2',
            type: 'document',
            source: 'portal',
            title: 'Investment Memorandum Viewed',
            description: 'Investor has viewed the memorandum 11 times.',
            actor: 'Portal',
            timestamp: 'Today • 9:38 AM',
        },
        {
            id: '3',
            type: 'note',
            source: 'employee',
            title: 'Internal Note Added',
            description:
                'Waiting on investment committee feedback before scheduling another call.',
            actor: 'Alex Vitenas',
            timestamp: 'Jun 22 • 4:17 PM',
        },
        {
            id: '4',
            type: 'email',
            source: 'outlook',
            title: 'Investor Replied',
            description:
                "Investor replied that they'll review everything over the weekend.",
            actor: 'Outlook',
            timestamp: 'Jun 20 • 2:49 PM',
        },
        {
            id: '5',
            type: 'stage',
            source: 'employee',
            title: 'Stage Changed',
            description: 'Introduced → Interested',
            actor: 'Alex Vitenas',
            timestamp: 'Jun 19 • 4:38 PM',
        },
    ];

    return (
        <>
            <AdminNav />

            <InvestorWorkspace
                investor={investor}
                metrics={metrics}
                timeline={timeline}
            />
        </>
    );
}