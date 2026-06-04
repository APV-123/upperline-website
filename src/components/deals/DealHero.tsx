'use client';

type Metric = {
  key: string;
  value?: string | null;
};

type Deal = {
  name: string;
  location?: string;
  image_1_url?: string;
  estimated_closing_date?: string;
  why_we_like_it?: string;
  metrics?: Metric[];
};

type Props = {
  deal: Deal;
};

function MetricCard({
  value,
  label,
}: {
  value?: string | null;
  label: string;
}) {
  return (
    <div style={metricCard}>
      <div style={metricValue}>
        {value || '—'}
      </div>

      <div style={metricLabel}>
        {label}
      </div>
    </div>
  );
}

export default function DealHero({
  deal,
}: Props) {
  const lpIrr =
    deal.metrics?.find(
      (m) => m.key === 'lp_irr'
    )?.value ?? null;

  const moic =
    deal.metrics?.find(
      (m) => m.key === 'lp_moic'
    )?.value ?? null;

  const minimumInvestment =
    deal.metrics?.find(
      (m) => m.key === 'minimum_investment'
    )?.value ?? null;

  const lpRaise =
    deal.metrics?.find(
      (m) =>
        m.key === 'lp_equity' ||
        m.key === 'total_equity'
    )?.value ?? null;

  return (
    <div style={container}>
      {deal.image_1_url && (
        <img
          src={deal.image_1_url}
          alt={deal.name}
          style={heroImage}
        />
      )}

      <div style={content}>
        <h1 style={title}>
          {deal.name}
        </h1>

        <div style={metaRow}>
          {deal.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                deal.location
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={locationLink}
            >
              📍 {deal.location}
            </a>
          )}

          {deal.estimated_closing_date && (
            <div style={closingBadge}>
              Closing:{' '}
              {new Date(
                deal.estimated_closing_date
              ).toLocaleDateString()}
            </div>
          )}
        </div>

        {deal.why_we_like_it && (
          <p style={thesis}>
            {deal.why_we_like_it}
          </p>
        )}

        <div style={metricGrid}>
          <MetricCard
            value={lpIrr}
            label="LP IRR"
          />

          <MetricCard
            value={moic}
            label="MOIC"
          />

          <MetricCard
            value={lpRaise}
            label="LP Raise"
          />

          <MetricCard
            value={minimumInvestment}
            label="Minimum Investment"
          />
        </div>
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  marginBottom: 48,
};

const heroImage: React.CSSProperties = {
  width: '100%',
  height: 500,
  objectFit: 'cover',
  borderRadius: 16,
  marginBottom: 28,
};

const content: React.CSSProperties = {
  maxWidth: 1200,
};

const title: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 16,
  color: '#0f172a',
};

const metaRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: 24,
};

const locationLink: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 16,
  fontWeight: 500,
};

const closingBadge: React.CSSProperties = {
  padding: '8px 14px',
  background: '#f1f5f9',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
};

const thesis: React.CSSProperties = {
  fontSize: 22,
  lineHeight: 1.6,
  color: '#334155',
  maxWidth: 900,
  marginBottom: 28,
};

const metricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit,minmax(200px,1fr))',
  gap: 16,
};

const metricCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20,
};

const metricValue: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: 6,
};

const metricLabel: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: '#64748b',
};