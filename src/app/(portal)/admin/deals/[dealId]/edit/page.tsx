'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DealForm from '@/components/deals/DealForm';
import AdminNav from '@/components/navigation/AdminNav';

type Deal = {
  id: string;
  name: string;
  target_amount: number;
};

export default function DealEditPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load deal
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
          console.error('[EDIT LOAD FAILED]', json?.error);
        }
      } catch (e) {
        console.error('[EDIT FETCH ERROR]', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  // ✅ Loading state
  if (loading) {
    return <div style={{ padding: 40 }}>Loading deal…</div>;
  }

  // ✅ Not found
  if (!deal) {
    return (
      <>
        <AdminNav />
        <div style={{ padding: 40 }}>
          <h1>Deal not found</h1>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ✅ NAV */}
      <AdminNav />

      {/* ✅ FORM */}
      <DealForm
        initialDeal={deal}
        onSave={async (updatedDeal) => {
          const res = await fetch(`/api/deals/${dealId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDeal),
          });

          const text = await res.text();

          let json;
          try {
            json = JSON.parse(text);
          } catch {
            console.error('[NON JSON RESPONSE]', text);
            alert('Server error');
            return;
          }

          if (!res.ok || !json.ok) {
            alert(json.error || 'Failed to save');
            return;
          }

          // ✅ go back to preview after saving
          router.push(`/admin/deals/${dealId}/public`);
        }}
      />
    </>
  );
}