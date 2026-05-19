'use client';

import React, { useState } from 'react';

export type DealFormValues = {
  name: string;
  target_amount: number;
  location: string;
  estimated_closing_date: string;
  overview_text: string;

  // ✅ metrics
  project_unlevered_irr: string;
  project_levered_irr: string;
  target_lp_equity_multiple: string;
  target_lp_levered_irr: string;
  untrended_return_on_cost: string;
  stabilized_return_on_cost: string;
  total_equity_requirement: string;
  construction_loan: string;
  total_project_cost: string;
};

type Props = {
  initialDeal?: Partial<DealFormValues>;
  onSave: (deal: DealFormValues) => Promise<void>;
  loading?: boolean;
};

export default function DealForm({ initialDeal, onSave, loading }: Props) {
  const [deal, setDeal] = useState<DealFormValues>({
    name: initialDeal?.name ?? '',
    target_amount: Number(initialDeal?.target_amount ?? 0),
    location: initialDeal?.location ?? '',
    estimated_closing_date: initialDeal?.estimated_closing_date ?? '',
    overview_text: initialDeal?.overview_text ?? '',

    project_unlevered_irr: initialDeal?.project_unlevered_irr ?? '',
    project_levered_irr: initialDeal?.project_levered_irr ?? '',
    target_lp_equity_multiple: initialDeal?.target_lp_equity_multiple ?? '',
    target_lp_levered_irr: initialDeal?.target_lp_levered_irr ?? '',
    untrended_return_on_cost: initialDeal?.untrended_return_on_cost ?? '',
    stabilized_return_on_cost: initialDeal?.stabilized_return_on_cost ?? '',
    total_equity_requirement: initialDeal?.total_equity_requirement ?? '',
    construction_loan: initialDeal?.construction_loan ?? '',
    total_project_cost: initialDeal?.total_project_cost ?? '',
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

        {/* BASIC INFO */}
        <Section title="Basic Information">

          <Field
            label="Deal Name"
            value={deal.name}
            onChange={(v) => setDeal((p) => ({ ...p, name: v }))}
          />

          <Field
            label="Target Raise"
            type="number"
            value={deal.target_amount}
            onChange={(v) =>
              setDeal((p) => ({ ...p, target_amount: Number(v) }))
            }
          />

          <Field
            label="Location"
            value={deal.location}
            onChange={(v) => setDeal((p) => ({ ...p, location: v }))}
          />

          <Field
            label="Estimated Closing Date"
            type="date"
            value={deal.estimated_closing_date}
            onChange={(v) =>
              setDeal((p) => ({ ...p, estimated_closing_date: v }))
            }
          />

          <TextArea
            label="About This Offering"
            value={deal.overview_text}
            onChange={(v) =>
              setDeal((p) => ({ ...p, overview_text: v }))
            }
          />

        </Section>

        {/* RETURNS */}
        <Section title="Returns">

          <Field
            label="Project Unlevered IRR"
            value={deal.project_unlevered_irr}
            onChange={(v) =>
              setDeal((p) => ({ ...p, project_unlevered_irr: v }))
            }
          />

          <Field
            label="Project Levered IRR"
            value={deal.project_levered_irr}
            onChange={(v) =>
              setDeal((p) => ({ ...p, project_levered_irr: v }))
            }
          />

          <Field
            label="Target LP Equity Multiple"
            value={deal.target_lp_equity_multiple}
            onChange={(v) =>
              setDeal((p) => ({ ...p, target_lp_equity_multiple: v }))
            }
          />

          <Field
            label="Target LP Levered IRR"
            value={deal.target_lp_levered_irr}
            onChange={(v) =>
              setDeal((p) => ({ ...p, target_lp_levered_irr: v }))
            }
          />

        </Section>

        {/* YIELD */}
        <Section title="Yield & Cost">

          <Field
            label="Un-Trended Return on Cost"
            value={deal.untrended_return_on_cost}
            onChange={(v) =>
              setDeal((p) => ({ ...p, untrended_return_on_cost: v }))
            }
          />

          <Field
            label="Stabilized Return on Cost"
            value={deal.stabilized_return_on_cost}
            onChange={(v) =>
              setDeal((p) => ({ ...p, stabilized_return_on_cost: v }))
            }
          />

        </Section>

        {/* CAPITAL STACK */}
        <Section title="Capital Stack">

          <Field
            label="Total Equity Requirement"
            value={deal.total_equity_requirement}
            onChange={(v) =>
              setDeal((p) => ({ ...p, total_equity_requirement: v }))
            }
          />

          <Field
            label="Construction Loan"
            value={deal.construction_loan}
            onChange={(v) =>
              setDeal((p) => ({ ...p, construction_loan: v }))
            }
          />

          <Field
            label="Total Project Cost"
            value={deal.total_project_cost}
            onChange={(v) =>
              setDeal((p) => ({ ...p, total_project_cost: v }))
            }
          />

        </Section>

        <button onClick={handleSubmit} style={primaryBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: FieldProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}


type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextArea({ label, value, onChange }: TextAreaProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...input, height: 140 }}
      />
    </div>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  );
}


/* styles */

const container = {
  background: '#f8fafc',
  padding: 40,
};

const content = {
  maxWidth: 720,
  margin: '0 auto',
  background: '#fff',
  padding: 24,
  borderRadius: 8,
};

const title = {
  fontSize: 20,
  fontWeight: 700,
};

const labelStyle = {
  fontSize: 12,
};

const input = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const primaryBtn = {
  marginTop: 20,
  padding: '8px 16px',
  background: '#003a5d',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
};
