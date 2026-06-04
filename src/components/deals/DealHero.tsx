'use client';

type Metric = {
  key: string;
  value?: string | null;
};

type Deal = {
  name: string;
  location?: string;
  image_1_url?: string;
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
        m.key === 'lp_equity_total' ||
        m.key === 'lp_equity'
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

        <div style={location}>
          {deal.location}
        </div>

        <p style={thesis}>
          Acquire a well-located retail asset
          with meaningful value-add potential
          through lease-up, tenant upgrades,
          and mark-to-market rent growth.
        </p>

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
  marginBottom: 40,
};

const heroImage: React.CSSProperties = {
  width: '100%',
  height: 420,
  objectFit: 'cover',
  borderRadius: 16,
  marginBottom: 24,
};

const content: React.CSSProperties = {
  maxWidth: 1100,
};

const title: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 12,
  color: '#0f172a',
};

const location: React.CSSProperties = {
  fontSize: 18,
  color: '#64748b',
  marginBottom: 20,
};

const thesis: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.6,
  maxWidth: 900,
  color: '#334155',
  marginBottom: 28,
};

const metricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit,minmax(180px,1fr))',
  gap: 16,
};

const metricCard: React.CSSProperties = {
  background: '#ffffff',
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
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: '#64748b',
};