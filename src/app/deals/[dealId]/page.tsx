'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DealExecutiveSummaryView from '@/components/deals/DealExecutiveSummaryView';

type Deal = {
  id: string;
  name: string;
  target_amount: number;
};

export default function DealPage() {
  const { dealId } = useParams<{ dealId: string }>();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/deals/${dealId}`, {
          cache: 'no-store',
        });

        const json = await res.json();

        if (res.ok && json?.ok && json.deal) {
          setDeal(json.deal);
        } else {
          console.error('[DEAL LOAD FAILED]', json?.error);
          setDeal(null);
        }
      } catch (e) {
        console.error('[DEAL FETCH ERROR]', e);
        setDeal(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
    }
  }, []);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  if (!deal) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Deal Not Available</h1>
        <p>This deal is not public or does not exist.</p>
      </div>
    );
  }

  // ✅ SINGLE SOURCE OF UI
  return <DealExecutiveSummaryView deal={deal} />;
}