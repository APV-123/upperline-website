'use client';

import { useState } from 'react';

type Deal = {
  name: string;
  target_amount: number;
};

type Props = {
  initialDeal?: Deal;
  onSave: (deal: Deal) => Promise<void>;
  loading?: boolean;
};

export default function DealForm({ initialDeal, onSave, loading }: Props) {
  const [deal, setDeal] = useState<Deal>({
    name: initialDeal?.name ?? '',
    target_amount: initialDeal?.target_amount ?? 0,
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);

    try {
      await onSave(deal);
    } catch (e) {
      console.error('[FORM SAVE ERROR]', e);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={container}>
      <div style={content}>
        <h1 style={title}>Deal</h1>

        {/* Name */}
        <label style={label}>Deal Name</label>
        <input
          value={deal.name}
          onChange={(e) =>
            setDeal((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
          style={input}
        />

        {/* Target Amount */}
        <label style={label}>Target Raise</label>
        <input
          type="number"
          value={deal.target_amount}
          onChange={(e) =>
            setDeal((prev) => ({
              ...prev,
              target_amount: Number(e.target.value),
            }))
          }
          style={input}
        />

        {/* Buttons */}
        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            style={primaryBtn}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ✅ styles */

const container: React.CSSProperties = {
  background: '#f8fafc',
  minHeight: '100vh',
  padding: 40,
};

const content: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  background: '#fff',
  padding: 24,
  borderRadius: 8,
};

const title: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 20,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  marginTop: 12,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: 8,
  marginTop: 6,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const primaryBtn: React.CSSProperties = {
  background: '#003a5d',
  color: '#fff',
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};