import React from "react";

type Deal = {
  name: string;
  target_amount: number;
};

export default function DealExecutiveSummaryView({ deal }: { deal: Deal }) {
  return (
    <div style={container}>
      <div style={content}>

        {/* Header */}
        <h1 style={title}>{deal.name}</h1>
        <p style={subtitle}>LP Equity Opportunity</p>

        {/* Location */}
        <div style={meta}>Houston, TX</div>

        {/* Image placeholder */}
        <div style={imagePlaceholder}>
          Deal Image
        </div>

        {/* Metrics */}
        <div style={section}>
          <h2 style={sectionTitle}>Investment Metrics</h2>

          <div style={metricsGrid}>
            <Metric label="Target Raise">
              ${deal.target_amount.toLocaleString()}
            </Metric>

            <Metric label="Target IRR">
              18–22%
            </Metric>

            <Metric label="Equity Multiple">
              1.8x – 2.2x
            </Metric>
          </div>
        </div>

        {/* Overview */}
        <div style={section}>
          <h2 style={sectionTitle}>Opportunity Overview</h2>
          <p>
            Upperline is pleased to present an opportunity to participate in the
            acquisition and development of a high-quality commercial site.
          </p>
        </div>

        {/* Business Plan */}
        <div style={section}>
          <h2 style={sectionTitle}>Business Plan</h2>
          <p>
            The strategy is to acquire the site and execute a targeted development
            plan designed to maximize long-term value.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ✅ Metric sub-component */
function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={metricCard}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{children}</div>
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
  maxWidth: 900,
  width: '100%',
  background: '#ffffff',
  padding: 40,
  borderRadius: 8,
};

const title: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
};

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: '#64748b',
  marginBottom: 10,
};

const meta: React.CSSProperties = {
  fontSize: 12,
  marginBottom: 20,
  color: '#64748b',
};

const imagePlaceholder: React.CSSProperties = {
  height: 300,
  background: '#e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 30,
};

const section: React.CSSProperties = {
  marginBottom: 30,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 10,
};

const metricsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
};

const metricCard: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  padding: 12,
  borderRadius: 6,
};

const metricLabel: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
};

const metricValue: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
};