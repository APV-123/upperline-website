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
        <div style={imagePlaceholder}>
          Deal Image
        </div>

        {/* INVESTMENT METRICS */}
        <div style={section}>
          <h2 style={sectionTitle}>Investment Metrics</h2>

          <div style={metricsGrid}>

            <Metric label="Target Raise">
              ${deal.target_amount.toLocaleString()}
            </Metric>

            <Metric label="Project Unlevered IRR">
              {deal.project_unlevered_irr || "—"}
            </Metric>

            <Metric label="Project Levered IRR">
              {deal.project_levered_irr || "—"}
            </Metric>

            <Metric label="Target LP Equity Multiple">
              {deal.target_lp_equity_multiple || "—"}
            </Metric>

            <Metric label="Target LP Levered IRR">
              {deal.target_lp_levered_irr || "—"}
            </Metric>

            <Metric label="Un-Trended Return on Cost">
              {deal.untrended_return_on_cost || "—"}
            </Metric>

            <Metric label="Stabilized Return on Cost">
              {deal.stabilized_return_on_cost || "—"}
            </Metric>

            <Metric label="Total Equity Requirement">
              {deal.total_equity_requirement || "—"}
            </Metric>

            <Metric label="Construction Loan">
              {deal.construction_loan || "—"}
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
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
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
