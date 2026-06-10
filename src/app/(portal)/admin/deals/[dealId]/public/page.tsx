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
  const [isDark, setIsDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const COLORS = isDark
    ? {
      background: '#071426',
      surface: '#10213d',
      text: '#ffffff',
      subtext: '#9fb3c8',
      border: 'rgba(255,255,255,.08)',
      accent: '#31c8db',
    }
    : {
      background: '#f3f4f6',
      surface: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: 'rgba(15,23,42,.08)',
      accent: '#003a5d',
    };

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
      } catch {
        setDeal(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };

    check();

    window.addEventListener('resize', check);

    return () =>
      window.removeEventListener('resize', check);
  }, []);
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
          padding: isMobile ? 12 : 16,
          background: COLORS.surface,
          color: COLORS.text,

          borderBottom: `1px solid ${COLORS.border}`,

          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 12 : 0,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: COLORS.text,
          }}
        >
          Previewing: {deal.name}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <button
            onClick={() =>
              router.push(`/admin/deals/${dealId}/edit`)
            }
            style={{
              padding: '6px 12px',
              borderRadius: 6,

              background: COLORS.accent,
              color: '#04152e',

              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Edit Deal
          </button>
        </div>
      </div>

      {/* ✅ SHARED VIEW */}
      <DealExecutiveSummaryView deal={deal} />
    </>
  );
}
