'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
  const [saving, setSaving] = useState(false);

  // ✅ Load existing deal
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

  async function handleSave() {
    if (!deal) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/deals/${dealId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deal.name,
          target_amount: deal.target_amount,
        }),
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        alert(JSON.stringify(json));
        return;
      }

      // ✅ Go back to preview after save
      router.push(`/admin/deals/${dealId}/public`);
    } catch (e) {
      console.error('[SAVE ERROR]', e);
      alert('Failed to save deal');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading deal…</div>;
  }

  if (!deal) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Deal not found</h1>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={content}>
        <h1 style={title}>Edit Deal</h1>

        {/* Name */}
        <label style={label}>Deal Name</label>
        <input
          value={deal.name}
          onChange={(e) =>
            setDeal((prev) =>
              prev ? { ...prev, name: e.target.value } : prev
            )
          }
          style={input}
        />

        {/* Target Amount */}
        <label style={label}>Target Raise</label>
        <input
          type="number"
          value={deal.target_amount}
          onChange={(e) =>
            setDeal((prev) =>
              prev
                ? { ...prev, target_amount: Number(e.target.value) }
                : prev
            )
          }
          style={input}
        />

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={handleSave} style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            onClick={() =>
              router.push(`/admin/deals/${dealId}/public`)
            }
            style={secondaryBtn}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ✅ Styles */

const container: React.CSSProperties = {
  background: '#f8fafc',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
};

const content: React.CSSProperties = {
  maxWidth: 600,
  width: '100%',
  background: '#ffffff',
  padding: 30,
  borderRadius: 8,
};

const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 20,
};

const label: React.CSSProperties = {
  fontSize: 12,
  marginTop: 12,
  display: 'block',
  opacity: 0.7,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  marginTop: 6,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: '#003a5d',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: '#e5e7eb',
  border: 'none',
  cursor: 'pointer',
};
