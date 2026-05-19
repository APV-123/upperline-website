import React from "react";
import Image from "next/image";

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

  pitch_book_url?: string;
  abridged_memo_url?: string;
  full_memo_url?: string;
  full_memo_requires_ca?: boolean;
};
type Document = {
  label: string;
  url: string;
  gated: boolean;
};

export default function DealExecutiveSummaryView({ deal }: { deal: Deal }) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  function buildDocuments(deal: Deal): Document[] {
    return [
      {
        label: 'Upperline Pitch Book',
        url: deal.pitch_book_url || '',
        gated: false,
      },
      {
        label: 'Deal Preview Memo',
        url: deal.abridged_memo_url || '',
        gated: false,
      },
      {
        label: 'Full Equity Memo',
        url: deal.full_memo_url || '',
        gated: deal.full_memo_requires_ca ?? true,
      },
    ].filter((doc) => doc.url); // ✅ only keep docs that exist
  }
  return (
    <div style={container}>
      <div style={content}>

        {/* HEADER */}
        <div style={headerRow}>

          <Image
            src="/upperline-logo.png"
            alt="Upperline"
            width={120}
            height={32}
          />


          <button
            style={ctaBtn}
            onClick={() => window.location.href = 'mailto:bh@upperline.com'}
          >
            Discuss Further
          </button>
        </div>

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
        {/* DOCUMENTS */}
        <div style={section}>
          <h2 style={sectionTitle}>Documents</h2>

          <div style={docContainer}>

            {/* LEFT: DOCUMENT LIST */}
            <div style={docList}>
              {buildDocuments(deal).map((doc) => {
                const isActive = selectedDoc?.label === doc.label;

                return (
                  <div
                    key={doc.label}
                    onClick={() => {
                      if (doc.gated) {
                        alert('Please sign confidentiality agreement to access this document.');
                        return;
                      }
                      setSelectedDoc(doc);
                    }}
                    style={{
                      ...docItem,
                      background: isActive ? '#eef2f7' : '#fff',
                      opacity: doc.gated ? 0.6 : 1,
                    }}
                  >
                    {doc.gated ? '🔒 ' : '📄 '}
                    {doc.label}
                  </div>
                );
              })}
            </div>

            {/* RIGHT: PREVIEW */}
            <div style={docPreview}>
              {selectedDoc ? (
                <>
                  <div style={docHeader}>
                    <div>{selectedDoc.label}</div>
                    <a href={selectedDoc.url} target="_blank">
                      <button style={downloadBtn}>Download</button>
                    </a>
                  </div>

                  <iframe src={selectedDoc.url} style={iframe} />
                </>
              ) : (
                <div style={{ padding: 20 }}>Select a document</div>
              )}
            </div>

          </div>
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
const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
};

const logo: React.CSSProperties = {
  height: 32,
};

const ctaBtn: React.CSSProperties = {
  background: '#1f3d36',
  color: '#fff',
  padding: '10px 18px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};
const docContainer = {
  display: 'grid',
  gridTemplateColumns: '250px 1fr',
  gap: 16,
  height: 500,
};

const docList = {
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  overflow: 'auto',
};

const docItem = {
  padding: 12,
  borderBottom: '1px solid #e5e7eb',
  cursor: 'pointer',
  fontSize: 13,
};

const docPreview = {
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
};

const iframe = {
  flex: 1,
  width: '100%',
  border: 'none',
};

const docHeader = {
  padding: 12,
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const downloadBtn = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
};
