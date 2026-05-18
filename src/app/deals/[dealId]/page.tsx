'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DealExecutiveSummaryView from '@/components/deals/DealExecutiveSummaryView';

type Deal = {
  id: string;
  name: string;
  target_amount: number;
};

type PublicDealResponse = {
  ok: boolean;
  deal?: Deal;
  error?: string;
};

export default function DealPage() {
  const { dealId } = useParams<{ dealId: string }>();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/deals/${dealId}`, {
          cache: 'no-store',
        });

        const json = (await res.json()) as PublicDealResponse;

        if (res.ok && json?.ok && json.deal) {
          setDeal(json.deal);
        } else {
          console.error('[PUBLIC DEAL LOAD FAILED]', json?.error);
          setDeal(null);
        }
      } catch (e) {
        console.error('[PUBLIC DEAL FETCH ERROR]', e);
        setDeal(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  // ✅ Loading state
  if (loading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  // ✅ Not found / not public
  if (!deal) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Deal Not Available</h1>
        <p>This deal is either not published or does not exist.</p>
      </div>
    );
  }

  // ✅ THIS is the key line
  return <DealExecutiveSummaryView deal={deal} />;
}