'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useParams } from 'next/navigation';

type Deal = {
  id: string;
  name: string;
  target_amount: number;
};

type PublicDealResponse = {
  ok: boolean;
  deal?: Deal;
  error?: string;
};

export default function DealExecutiveSummaryPage() {
  const { dealId } = useParams<{ dealId: string }>();

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
          console.error('[PUBLIC DEAL LOAD FAILED]', json?.error);
          setDeal(null);
        }
      } catch (e) {
        console.error('[PUBLIC DEAL FETCH ERROR]', e);
        setDeal(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dealId]);

  if (loading)
    return <div style={container}>Loading summary…</div>;

  if (!deal)
    return (
      <div style={container}>
        <div style={content}>
          <h1 style={title}>Deal Not Available</h1>
          <p style={subtitle}>
            This deal is either not published or does not exist.
          </p>
        </div>
      </div>
    );

  return (
    <div style={container}>
      <div style={content}>

        {/* Header */}
        <h1 style={title}>{deal.name}</h1>
        <p style={subtitle}>Confidential Investment Opportunity</p>

        {/* Overview */}
        <Section title="Opportunity Overview">
          <p>
            Upperline is pleased to present an opportunity to participate in the
            acquisition and development of a high-quality commercial site.
          </p>
          <p>
            The project offers investors exposure to a well-located asset with
            strong fundamentals and attractive long-term upside.
          </p>
        </Section>

        {/* Highlights */}
        <Section title="Investment Highlights">
          <ul>
            <li>Prime location within a high-growth Houston submarket</li>
            <li>Strong demand drivers and favorable demographics</li>
            <li>Disciplined acquisition basis with downside protection</li>
            <li>Clear execution plan with defined exit strategy</li>
          </ul>
        </Section>

        {/* Structure */}
        <Section title="Investment Structure">
          <Row label="Target Equity Raise">
            ${deal.target_amount.toLocaleString()}
          </Row>
          <Row label="Investment Type">Equity</Row>
          <Row label="Sponsor">Upperline</Row>
        </Section>

        {/* Business Plan */}
        <Section title="Business Plan">
          <p>
            The strategy is to acquire the site and execute a targeted development
            plan designed to maximize long-term value.
          </p>
          <p>
            The business plan focuses on careful capital deployment, risk
            mitigation, and alignment with market demand.
          </p>
        </Section>

        {/* CTA */}
        <div style={cta}>
          <strong>Next Step</strong>
          <p>
            Please reach out if you would like to review detailed materials or
            discuss the opportunity further.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ✅ Components unchanged */

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <div style={section}>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

type RowProps = {
  label: string;
  children: ReactNode;
};

function Row({ label, children }: RowProps) {
  return (
    <div style={row}>
      <span style={rowLabel}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/* styles unchanged */

const container: React.CSSProperties = {
  background: '#f8fafc',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
};

const content: React.CSSProperties = {
  maxWidth: 800,
  width: '100%',
  background: '#ffffff',
  padding: 40,
  borderRadius: 8,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  lineHeight: 1.6,
};

const title: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  marginBottom: 6,
};

const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 30,
};

const section: React.CSSProperties = {
  marginBottom: 28,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 10,
};

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  padding: '4px 0',
};

const rowLabel: React.CSSProperties = {
  opacity: 0.6,
};

const cta: React.CSSProperties = {
  marginTop: 30,
  padding: 16,
  borderRadius: 6,
  background: '#f1f5f9',
};
