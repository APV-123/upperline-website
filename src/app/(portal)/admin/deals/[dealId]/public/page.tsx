'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DealExecutiveSummaryView from '@/components/deals/DealExecutiveSummaryView';
import AdminNav from '@/components/navigation/AdminNav';

type Deal = {
  id: string;
  name: string;
  target_amount: number;
};

type PublicDealResponse = {
  ok: boolean;
  deal?: Deal;
};

export default function AdminDealPreviewPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();

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
          setDeal(null);
        }
      } catch (e) {
        setDeal(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  if (loading) return <div style={{ padding: 40 }}>Loading preview…</div>;

  if (!deal) {
    return (
      <>
        <AdminNav />
        <div style={{ padding: 40 }}>
          <h1>Deal Not Available</h1>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ✅ NAVIGATION (THIS IS THE WIN) */}
      <AdminNav />

      {/* ✅ PREVIEW CONTROL BAR */}
      <div
        style={{
          padding: 16,
          background: '#003a5d',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 600 }}>
          Admin Preview
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() =>
              router.push(`/admin/deals/${dealId}/edit`)
            }
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: '#ffffff',
              color: '#003a5d',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Edit Deal
          </button>

          <button
            onClick={() => router.push('/admin')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: '#ffffff',
              color: '#003a5d',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to Deals
          </button>
        </div>
      </div>

      {/* ✅ SHARED VIEW */}
      <DealExecutiveSummaryView deal={deal} />
    </>
  );
}
