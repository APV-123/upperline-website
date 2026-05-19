'use client';

import { useRouter } from 'next/navigation';
import DealForm from '@/components/deals/DealForm';
import AdminNav from '@/components/navigation/AdminNav';

export default function CreateDealPage() {
  const router = useRouter();

  return (
    <>
      {/* ✅ NAV */}
      <AdminNav />

      {/* ✅ FORM */}
      <DealForm
        onSave={async (newDeal) => {
          try {
            const res = await fetch('/api/deals/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newDeal),
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
              alert(json.error || 'Failed to create deal');
              return;
            }

            // ✅ Go back to deals list
            router.push('/admin');
          } catch (e) {
            console.error('[CREATE ERROR]', e);
            alert('Failed to create deal');
          }
        }}
      />
    </>
  );
}
