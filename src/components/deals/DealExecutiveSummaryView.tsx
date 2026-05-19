import React from "react";

type Deal = {
  name: string;
  target_amount: number;

  location?: string;
  estimated_closing_date?: string;
  overview_text?: string;

  project_unlevered_irr?: string;
  project_levered_irr?: string;
  target_lp_equity_multiple?: string;
  target_lp_levered_irr?: string;
  untrended_return_on_cost?: string;
  stabilized_return_on_cost?: string;
  total_equity_requirement?: string;
  construction_loan?: string;
  total_project_cost?: string;

  image_1_url?: string;
  image_2_url?: string;
  image_3_url?: string;

};

export default function DealExecutiveSummaryView({ deal }: { deal: Deal }) {
  return (
    <div style={container}>
      <div style={content}>

        {/* HEADER */}
        <h1 style={title}>{deal.name}</h1>
        <p style={subtitle}>LP Equity Opportunity</p>

        {/* LOCATION + DATE */}
        <div style={metaRow}>
          <div>
            <strong>Location:</strong>{" "}
            {deal.location || "Not provided"}
          </div>

          <div>
            <strong>Estimated Closing:</strong>{" "}
            {deal.estimated_closing_date
              ? formatDate(deal.estimated_closing_date)
              : "Not provided"}
          </div>
        </div>

        {/* IMAGE PLACEHOLDER */}
        <div style={imageGrid}>
          {deal.image_1_url && (
            <img src={deal.image_1_url} style={mainImage} />
          )}

          <div style={sideImages}>
            {deal.image_2_url && (
              <img src={deal.image_2_url} style={smallImage} />
            )}
            {deal.image_3_url && (
              <img src={deal.image_3_url} style={smallImage} />
            )}
          </div>
        </div>


        {/* INVESTMENT METRICS */}
        <div style={section}>
          <h2 style={sectionTitle}>Investment Metrics</h2>

          <div style={metricsGrid}>

            <Metric label="Target Raise">
              {formatCurrency(String(deal.target_amount))}
            </Metric>

            <Metric label="Project Unlevered IRR">
              {formatPercent(deal.project_unlevered_irr)}
            </Metric>

            <Metric label="Project Levered IRR">
              {formatPercent(deal.project_levered_irr)}
            </Metric>

            <Metric label="Target LP Equity Multiple">
              {formatMultiple(deal.target_lp_equity_multiple)}
            </Metric>

            <Metric label="Target LP Levered IRR">
              {formatPercent(deal.target_lp_levered_irr)}
            </Metric>

            <Metric label="Un-Trended Return on Cost">
              {formatPercent(deal.untrended_return_on_cost)}
            </Metric>

            <Metric label="Stabilized Return on Cost">
              {formatPercent(deal.stabilized_return_on_cost)}
            </Metric>

            <Metric label="Total Equity Requirement">
              {formatCurrency(deal.total_equity_requirement)}
            </Metric>

            <Metric label="Construction Loan">
              {deal.construction_loan || "—"}
              {/* leave raw since it may include text like "(65% LTC)" */}
            </Metric>

            <Metric label="Total Project Cost">
              {deal.total_project_cost || "—"}
            </Metric>

          </div>
        </div>

        {/* OVERVIEW */}
        <div style={section}>
          <h2 style={sectionTitle}>About This Offering</h2>
          <p style={paragraph}>
            {deal.overview_text || "No overview provided."}
          </p>
        </div>

      </div>
    </div>
  );
}

/* ✅ Metric */
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

/* ✅ Date formatter */
function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  const d = new Date(year, month - 1, day); // ✅ LOCAL date (no timezone shift)

  return d.toLocaleDateString();
}
function formatPercent(value?: string) {
  if (!value) return '—';
  return value.includes('%') ? value : `${value}%`;
}

function formatMultiple(value?: string) {
  if (!value) return '—';
  return value.toLowerCase().includes('x') ? value : `${value}x`;
}

function formatCurrency(value?: string) {
  if (!value) return '—';

  // strip $ and commas if user added them
  const num = Number(String(value).replace(/[$,]/g, ''));

  if (!Number.isFinite(num)) return value;

  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  }

  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }

  return `$${num}`;
}

/* ✅ Styles */

const container: React.CSSProperties = {
  background: "#f8fafc",
  minHeight: "100vh",
  padding: "40px 20px",
  display: "flex",
  justifyContent: "center",
};

const content: React.CSSProperties = {
  maxWidth: 1000,
  width: "100%",
  background: "#ffffff",
  padding: 40,
  borderRadius: 8,
};

const title: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
};

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  marginBottom: 12,
};

const metaRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  color: "#64748b",
  marginBottom: 24,
};

const imagePlaceholder: React.CSSProperties = {
  height: 300,
  background: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

const paragraph: React.CSSProperties = {
  lineHeight: 1.6,
};

const metricsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
};

const metricCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 12,
  borderRadius: 6,
};

const metricLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
};

const metricValue: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
};
const imageGrid = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: 12,
  marginBottom: 30,
};

const mainImage = {
  width: '100%',
  height: 400,
  objectFit: 'cover' as const,
  borderRadius: 8,
};

const sideImages = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
};

const smallImage = {
  width: '100%',
  height: 194,
  objectFit: 'cover' as const,
  borderRadius: 8,
};