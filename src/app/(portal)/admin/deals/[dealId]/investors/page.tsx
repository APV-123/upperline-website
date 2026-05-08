'use client';

import { useEffect, useMemo, useState } from 'react';

type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

type ApiInvestorRow = {
  dealId: string;
  contactId: string | null;
  investorName: string;
  investorEmail: string | null;
  amount: number;
  dealstage: string | null;
  dealstageLabel: string | null;
  bucket: Bucket;
  pipeline: string | null;
  raise_id: string | null;
  hs_lastactivitydate: string | null;
  hs_lastmodifieddate: string | null;
};

type Investor = {
  id: string;
  name: string;
  email?: string | null;
  amount: number;
  bucket: Bucket;
  lastActivity: string;
  stageLabel?: string | null;
  dealId?: string;
};

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'committed', label: 'Committed' },
  { key: 'circling', label: 'Circling' },
  { key: 'needs_touch', label: 'Needs Touch' },
  { key: 'passed', label: 'Passed' },
];

// For now we hardcode the raise target at the UI layer.
// Later: move target into HubSpot property or a Portal config table keyed by raise_id.
const RAISE_TARGET = 1_500_000;

function formatDateMaybe(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function InvestorCard({ investor }: { investor: Investor }) {
  const isNeedsTouch = investor.bucket === 'needs_touch';

  return (
    <div
      style={{
        background: '#1a1f24', // Iron-toned dark
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        color: '#f1f3f4',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: isNeedsTouch ? '0 0 0 2px rgba(225,29,72,0.35)' : 'none', // calm urgency
      }}
    >
      {/* Investor Name */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '0.2px',
          marginBottom: 6,
        }}
      >
        {investor.name}
      </div>

      {/* Secondary line: email + stage label */}
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 10,
        }}
      >
        {investor.email ? investor.email : '—'}
        {investor.stageLabel ? ` · ${investor.stageLabel}` : ''}
      </div>

      {/* Amount */}
      <div
        style={{
          fontSize: 14,
          opacity: 0.85,
          marginBottom: 10,
        }}
      >
        ${investor.amount.toLocaleString()}
      </div>

      {/* Activity */}
      <div
        style={{
          fontSize: 12,
          opacity: 0.6,
          marginBottom: 18,
        }}
      >
        Last activity · {investor.lastActivity}
      </div>

      {/* Actions (placeholders for now) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {['Send Terms', 'Nudge', 'Approve', 'Mark Committed', 'Pass'].map((label) => (
          <button
            key={label}
            onClick={() => console.log(label, investor.name, investor.dealId)}
            style={{
              background: 'transparent',
              color: '#cfd4d8',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 8,
              fontSize: 12,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DealInvestorsPage() {
  const [rows, setRows] = useState<ApiInvestorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hardcode raiseId for v1; later you can derive from dealId route param or a deal->raise mapping.
  const raiseId = 'INW-ROSE-001';
  async function reloadInvestors() {
    setLoading(true);
    setError(null);
    
    const res = await fetch(`/api/hubspot/raises/${raiseId}`, { cache: 'no-store' });
    const data = await res.json();
    
    if (!res.ok || data?.ok === false) {
        setError(data?.error ?? 'Failed to load investors');
        setRows([]);
    } else {
        setRows((data?.investors ?? []) as ApiInvestorRow[]);
    }
    setLoading(false);
}

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/hubspot/raises/${raiseId}`, { cache: 'no-store' });
        const data = await res.json();

        if (!alive) return;

        if (!res.ok || data?.ok === false) {
          setError(data?.error ?? 'Failed to load investors');
          setRows([]);
          return;
        }

        setRows((data?.investors ?? []) as ApiInvestorRow[]);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Failed to load investors');
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    reloadInvestors();

    return () => {
      alive = false;
    };
  }, [raiseId]);

  const investors: Investor[] = useMemo(() => {
    return rows.map((r) => {
      const lastActivity =
        r.hs_lastactivitydate
          ? formatDateMaybe(r.hs_lastactivitydate)
          : formatDateMaybe(r.hs_lastmodifieddate);

      return {
        id: r.dealId,
        dealId: r.dealId,
        name: r.investorName,
        email: r.investorEmail,
        amount: Number(r.amount ?? 0),
        bucket: r.bucket,
        lastActivity,
        stageLabel: r.dealstageLabel,
      };
    });
  }, [rows]);

  const committedTotal = useMemo(() => {
    return investors
      .filter((i) => i.bucket === 'committed')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [investors]);


  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div
      style={{
        backgroundColor: '#f5f6f7', // soft neutral canvas
        minHeight: '100vh',
        padding: '36px 44px',
      }}
    >
      {/* Header */}
      
    <div
        style={{
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    }}
    >

        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Inwood – Rosehill LP
        </h1>
        <div
          style={{
            fontSize: 14,
            opacity: 0.65,
          }}
        >
          Admin · Investor Command Center
        </div>
      </div>
    
    <button
    onClick={() => setShowAddInvestor(true)}
    style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
    }}
    >
    + Add Investor
    </button>

      {/* Totals */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>${committedTotal.toLocaleString()}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Committed</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>${RAISE_TARGET.toLocaleString()}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Target</div>
        </div>
      </div>

      {/* Status line */}
      <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 40 }}>
        Raise ID · <span style={{ fontWeight: 600 }}>{raiseId}</span>
        {loading ? ' · Loading…' : ''}
        {error ? ` · ${error}` : ''}
      </div>

      {/* Buckets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
        }}
      >
        {BUCKETS.map((bucket) => (
          <div key={bucket.key}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: 18,
              }}
            >
              {bucket.label}
            </h3>

            {investors
              .filter((i) => i.bucket === bucket.key)
              .map((investor) => (
                <InvestorCard key={investor.id} investor={investor} />
              ))}
          </div>
        ))}
      </div>
        {showAddInvestor && (
        <div
            style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
            }}
        >
            <div
            style={{
                background: '#1a1f24',
                color: '#f1f3f4',
                borderRadius: 14,
                padding: 24,
                width: 360,
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            }}
            >
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>
                Add Prospective Investor
            </h3>

            <AddInvestorForm
                raiseId={raiseId}
                onClose={() => setShowAddInvestor(false)}
                onAdded={async () => {
                setShowAddInvestor(false);
                await reloadInvestors();
                }}
            />
            </div>
        </div>
        )}
    </div>
  );
}
function AddInvestorForm({
  raiseId,
  onClose,
  onAdded,
}: {
  raiseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setSaving(true);
      setError(null);

      // 1) Resolve contact by email
      const lookup = await fetch(
        `/api/hubspot/contacts/lookup?email=${encodeURIComponent(email)}`
      );
      const lookupJson = await lookup.json();

      if (!lookup.ok || !lookupJson?.contactId) {
        setError('Contact not found');
        return;
      }

      // 2) Create investor deal
      const res = await fetch(
        `/api/hubspot/raises/${raiseId}/add-investor`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: lookupJson.contactId,
            amount: Number(amount),
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        setError(json?.error ?? 'Failed to add investor');
        return;
      }

      await onAdded();
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <input
        placeholder="Investor email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          marginBottom: 10,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: '#f1f3f4',
        }}
      />

      <input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          marginBottom: 10,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: '#f1f3f4',
        }}
      />

      {error && (
        <div style={{ fontSize: 12, color: '#fb7185', marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#cfd4d8',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            background: '#ffffff',
            color: '#000',
            borderRadius: 8,
            padding: '6px 14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {saving ? 'Adding…' : 'Add Investor'}
        </button>
      </div>
    </>
  );
}