'use client';

import React, { useState } from 'react';

export type DealFormValues = {
  name: string;
  target_amount: number;
  location: string;
  estimated_closing_date: string; // YYYY-MM-DD (HTML date input)
  overview_text: string;
};

type Props = {
  initialDeal?: Partial<DealFormValues>;
  onSave: (deal: DealFormValues) => Promise<void>;
  loading?: boolean;
  title?: string; // optional override for "Create Deal" vs "Edit Deal"
};

export default function DealForm({ initialDeal, onSave, loading, title }: Props) {
  const [deal, setDeal] = useState<DealFormValues>({
    name: initialDeal?.name ?? '',
    target_amount: Number(initialDeal?.target_amount ?? 0),
    location: initialDeal?.location ?? '',
    estimated_closing_date: initialDeal?.estimated_closing_date ?? '',
    overview_text: initialDeal?.overview_text ?? '',
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
        <h1 style={pageTitle}>{title ?? 'Deal'}</h1>

        {/* Deal Name */}
        <label style={label}>Deal Name</label>
        <input
          value={deal.name}
          onChange={(e) => setDeal((prev) => ({ ...prev, name: e.target.value }))}
          style={input}
        />

        {/* Target Raise */}
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

        {/* Location */}
        <label style={label}>Location</label>
        <input
          value={deal.location}
          onChange={(e) => setDeal((prev) => ({ ...prev, location: e.target.value }))}
          style={input}
          placeholder="19260 Cypress Rose Hill Rd., Tomball, TX"
        />

        {/* Estimated Closing Date */}
        <label style={label}>Estimated Closing Date</label>
        <input
          type="date"
          value={deal.estimated_closing_date}
          onChange={(e) =>
            setDeal((prev) => ({
              ...prev,
              estimated_closing_date: e.target.value,
            }))
          }
          style={input}
        />

        {/* About / Overview */}
        <label style={label}>About This Offering</label>
        <textarea
          value={deal.overview_text}
          onChange={(e) => setDeal((prev) => ({ ...prev, overview_text: e.target.value }))}
          style={{ ...input, height: 160, resize: 'vertical' }}
          placeholder="Write the executive summary / about this offering..."
        />

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
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

/* styles */

const container: React.CSSProperties = {
  background: '#f8fafc',
  minHeight: '100vh',
  padding: 40,
};

const content: React.CSSProperties = {
  maxWidth: 700,
  margin: '0 auto',
  background: '#fff',
  padding: 24,
  borderRadius: 8,
};

const pageTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  marginTop: 12,
  opacity: 0.75,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginTop: 6,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  background: '#003a5d',
  color: '#fff',
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};