import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";

type Deal = {
  id: string;
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
  alwaysShow?: boolean;
};

export default function DealExecutiveSummaryView({ deal }: { deal: Deal }) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const images = useMemo(
    () =>
      [deal.image_1_url, deal.image_2_url, deal.image_3_url].filter(
        (x): x is string => Boolean(x)
      ),
    [deal.image_1_url, deal.image_2_url, deal.image_3_url]
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () =>
    setLightboxIndex((i) => (i + 1) % images.length);

  const prevImage = () =>
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  const [showCA, setShowCA] = useState(false);
  const [caBusy, setCaBusy] = useState(false);
  const [caFirstName, setCaFirstName] = useState('');
  const [caLastName, setCaLastName] = useState('');
  const [caEmail, setCaEmail] = useState('');
  const [caCompany, setCaCompany] = useState('');
  const [caJobTitle, setCaJobTitle] = useState('');
  const [caPhone, setCaPhone] = useState('');
  const [caAgree, setCaAgree] = useState(false);
  const [caError, setCaError] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!hasAccess) return;

    const savedEmail = localStorage.getItem(`ca:${deal.id}`);
    if (!savedEmail) return;

    fetch(`/api/deals/${deal.id}/ca/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstname: "Returning",
        lastname: "User",
        email: savedEmail,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.signedUrl) {
          setSelectedDoc({
            label: "Full Equity Memo",
            url: json.signedUrl,
            gated: false,
          });
        }
      });

  }, [hasAccess, deal.id]);


  useEffect(() => {
    const savedEmail = localStorage.getItem(`ca:${deal.id}`);
    if (savedEmail) {
      setHasAccess(true);
    }
  }, [deal.id]);

  useEffect(() => {
    const docs = buildDocuments(deal);
    if (docs.length > 0 && !selectedDoc) {
      setSelectedDoc(docs[0]);
    }
  }, [deal]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, images.length]);
  
  async function openFullMemo() {
    const savedEmail = localStorage.getItem(`ca:${deal.id}`);

    // If we don't have an email saved, we can't mint the signed URL without asking again
    if (!savedEmail) {
      setShowCA(true);
      return;
    }

    const res = await fetch(`/api/deals/${deal.id}/ca/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstname: "Returning",
        lastname: "User",
        email: savedEmail,
        company: "",
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok || !json?.signedUrl) {
      setCaError(json?.error ?? "Unable to grant access.");
      // If something went wrong, fall back to the modal
      setShowCA(true);
      return;
    }

    setSelectedDoc({
      label: "Full Equity Memo",
      url: json.signedUrl,
      gated: false,
    });
  }



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
        url: '',
        gated: !hasAccess && (deal.full_memo_requires_ca ?? true),
        alwaysShow: true,
      },
    ].filter((doc) => doc.alwaysShow || Boolean(doc.url));

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
            <img
              src={deal.image_1_url}
              style={{ ...mainImage, cursor: "zoom-in" }}
              onClick={() => openLightbox(0)}
            />
          )}

          <div style={sideImages}>
            {deal.image_2_url && (
              <img
                src={deal.image_2_url}
                style={{ ...smallImage, cursor: "zoom-in" }}
                onClick={() => openLightbox(1)}
              />
            )}
            {deal.image_3_url && (
              <img
                src={deal.image_3_url}
                style={{ ...smallImage, cursor: "zoom-in" }}
                onClick={() => openLightbox(2)}
              />
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
                      // 🔥 SPECIAL CASE: FULL EQUITY MEMO
                      if (doc.label === "Full Equity Memo") {
                        const savedEmail = localStorage.getItem(`ca:${deal.id}`);

                        // If user has not signed → show modal
                        if (!savedEmail) {
                          setShowCA(true);
                          return;
                        }

                        // ✅ User HAS access → fetch signed URL
                        fetch(`/api/deals/${deal.id}/ca/submit`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            firstname: "Returning",
                            lastname: "User",
                            email: savedEmail,
                          }),
                        })
                          .then((r) => r.json())
                          .then((json) => {
                            if (json?.signedUrl) {
                              setSelectedDoc({
                                label: "Full Equity Memo",
                                url: json.signedUrl,
                                gated: false,
                              });
                            }
                          });

                        return;
                      }

                      // ✅ NORMAL DOCUMENTS
                      setSelectedDoc(doc);
                    }}

                    style={{
                      ...docItem,
                      background: isActive ? '#eef2f7' : '#fff',
                      opacity: doc.gated ? 0.6 : 1,
                      cursor: 'pointer',
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
        {lightboxOpen && images.length > 0 && (
          <div style={lbBackdrop} onClick={() => setLightboxOpen(false)}>
            <div style={lbTop} onClick={(e) => e.stopPropagation()}>
              <div style={{ opacity: 0.85 }}>
                {lightboxIndex + 1} / {images.length}
              </div>
              <button style={lbClose} onClick={() => setLightboxOpen(false)}>
                ✕
              </button>
            </div>

            <button
              style={lbArrowLeft}
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>

            <img
              src={images[lightboxIndex]}
              style={lbImage}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              style={lbArrowRight}
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </div>
        )}
        {showCA && (
          <div style={sheetBackdrop} onClick={() => !caBusy && setShowCA(false)}>
            <div style={sheet} onClick={(e) => e.stopPropagation()}>

              {/* Handle */}
              <div style={sheetHandle} />

              {/* Header */}
              <div style={sheetHeader}>
                <div style={{ fontWeight: 700 }}>
                  {deal.name} Confidentiality Agreement
                </div>
                <button
                  style={sheetClose}
                  onClick={() => setShowCA(false)}
                  disabled={caBusy}
                >
                  ✕
                </button>
              </div>

              {/* FORM FIRST */}
              <div style={sheetFooter}>

                {/* FIRST / LAST ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                  <div>
                    <label style={sheetLabel}>First Name</label>
                    <input
                      style={sheetInput}
                      value={caFirstName}
                      onChange={(e) => setCaFirstName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={sheetLabel}>Last Name</label>
                    <input
                      style={sheetInput}
                      value={caLastName}
                      onChange={(e) => setCaLastName(e.target.value)}
                    />
                  </div>

                </div>

                <div style={sheetFormRow}>
                  <label style={sheetLabel}>Email</label>
                  <input
                    style={sheetInput}
                    value={caEmail}
                    onChange={(e) => setCaEmail(e.target.value)}
                  />
                </div>

                <div style={sheetFormRow}>
                  <label style={sheetLabel}>Company (optional)</label>
                  <input
                    style={sheetInput}
                    value={caCompany}
                    onChange={(e) => setCaCompany(e.target.value)}
                  />
                </div>
                {/* Job Title */}
                <div style={sheetFormRow}>
                  <label style={sheetLabel}>Job Title (optional)</label>
                  <input
                    style={sheetInput}
                    value={caJobTitle}
                    onChange={(e) => setCaJobTitle(e.target.value)}
                  />
                </div>

                {/* Phone */}
                <div style={sheetFormRow}>
                  <label style={sheetLabel}>Phone Number (optional)</label>
                  <input
                    style={sheetInput}
                    value={caPhone}
                    onChange={(e) => setCaPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* LEGAL AGREEMENT SCROLLER */}
              <div style={agreementScroll}>

                <h4 style={agreementTitle}>Confidentiality Agreement</h4>

                <p style={agreementText}>
                  This Confidentiality and Non-Disclosure Agreement (“Agreement”) governs access to proprietary and non-public information for the purpose of evaluating a potential investment opportunity.
                </p>

                <p style={agreementText}>
                  By accessing these materials, you acknowledge that all information provided constitutes confidential information, including but not limited to financial statements, projections, ownership structures, investment models, and all documents made available through this deal portal.
                </p>

                <p style={agreementText}>
                  You agree that such information shall be used solely for the purpose of evaluating a potential investment and shall not be disclosed, reproduced, or distributed to any third party without prior written consent.
                </p>

                <p style={agreementText}>
                  You further agree not to contact any tenants, lenders, investors, brokers, or other parties identified within the materials without explicit authorization from Upperline.
                </p>

                <p style={agreementText}>
                  All confidential information remains the exclusive property of Upperline. No license or ownership rights are granted by access to these materials.
                </p>

                <p style={agreementText}>
                  This Agreement shall remain in effect for a period of five (5) years from the date of acceptance. Unauthorized use or disclosure may result in legal action and injunctive relief.
                </p>

                <p style={agreementText}>
                  Acceptance of this Agreement electronically constitutes a legally binding agreement enforceable to the same extent as a manually executed agreement.
                </p>

              </div>

              {/* ACCEPTANCE + ACTIONS */}
              <div style={sheetFooter}>

                <label style={sheetCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={caAgree}
                    onChange={(e) => setCaAgree(e.target.checked)}
                  />
                  I have read and accept the terms of the confidentiality agreement.
                </label>
                {caError && (
                  <div style={caErrorStyle}>
                    {caError}
                  </div>
                )}
                <div style={sheetActions}>
                  <button
                    style={sheetSecondaryBtn}
                    onClick={() => setShowCA(false)}
                    disabled={caBusy}
                  >
                    Cancel
                  </button>

                  <button
                    style={sheetPrimaryBtn}
                    disabled={caBusy}
                    onClick={async () => {

                      // ✅ VALIDATION FIRST
                      if (!caFirstName.trim() || !caLastName.trim()) {
                        setCaError("First and last name are required.");
                        return;
                      }

                      if (!caEmail.includes("@")) {
                        setCaError("Valid email is required.");
                        return;
                      }

                      if (!caAgree) {
                        setCaError("You must accept the confidentiality agreement.");
                        return;
                      }

                      // ✅ CLEAR ERROR
                      setCaError('');
                      setCaBusy(true);

                      try {
                        const res = await fetch(`/api/deals/${deal.id}/ca/submit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            firstname: caFirstName,
                            lastname: caLastName,
                            email: caEmail,
                            company: caCompany,
                            jobtitle: caJobTitle,
                            phone: caPhone,
                          }),
                        });

                        const json = await res.json().catch(() => null);

                        if (!res.ok || !json?.ok || !json?.signedUrl) {
                          setCaError(json?.error ?? "Unable to grant access");
                          return;
                        }

                        localStorage.setItem(`ca:${deal.id}`, caEmail);
                        setHasAccess(true);

                        setSelectedDoc({
                          label: "Full Equity Memo",
                          url: json.signedUrl,
                          gated: false,
                        });

                        setShowCA(false);

                      } finally {
                        setCaBusy(false);
                      }
                    }}
                  >
                    {caBusy ? "Granting access…" : "Access Full Memo"}
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}
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
const lbBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.82)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const lbImage: React.CSSProperties = {
  maxWidth: "92vw",
  maxHeight: "82vh",
  objectFit: "contain",
  borderRadius: 10,
  boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
};

const lbTop: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: 16,
  right: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#fff",
  zIndex: 10000,
};

const lbClose: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 22,
  cursor: "pointer",
};

const lbArrowLeft: React.CSSProperties = {
  position: "fixed",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 52,
  color: "#fff",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  zIndex: 10000,
};

const lbArrowRight: React.CSSProperties = {
  position: "fixed",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 52,
  color: "#fff",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  zIndex: 10000,
};
const caBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10001,
  padding: 20,
};

const caCard: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  background: '#fff',
  borderRadius: 10,
  padding: 18,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
};

const caLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#334155',
  marginTop: 10,
  marginBottom: 6,
};

const caInput: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
};

const caPrimaryBtn: React.CSSProperties = {
  background: '#1f3d36',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

const caSecondaryBtn: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#0f172a',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  cursor: 'pointer',
  fontWeight: 600,
};
const sheetBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 10001,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

const sheet: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  background: "#fff",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  boxShadow: "0 -20px 60px rgba(0,0,0,0.35)",
  overflow: "hidden",
};

const sheetHandle: React.CSSProperties = {
  width: 40,
  height: 4,
  background: "#cbd5e1",
  borderRadius: 999,
  margin: "8px auto",
};

const sheetHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  borderBottom: "1px solid #e5e7eb",
};

const sheetClose: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
};

const sheetScroll: React.CSSProperties = {
  maxHeight: "32vh",
  overflowY: "auto",
  padding: "12px 16px",
  background: "#f8fafc",
};

const sheetP: React.CSSProperties = {
  fontSize: 13,
  marginBottom: 10,
  color: "#334155",
  lineHeight: 1.4,
};

const sheetFooter: React.CSSProperties = {
  padding: "16px",
};

const sheetFormRow: React.CSSProperties = {
  marginBottom: 10,
};

const sheetLabel: React.CSSProperties = {
  fontSize: 12,
  display: "block",
  marginBottom: 4,
  color: "#475569",
};

const sheetInput: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};

const sheetCheckboxRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
  fontSize: 13,
};

const sheetActions: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
};

const sheetPrimaryBtn: React.CSSProperties = {
  background: "#1f3d36",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const sheetSecondaryBtn: React.CSSProperties = {
  background: "#f1f5f9",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  cursor: "pointer",
};
const agreementScroll: React.CSSProperties = {
  maxHeight: 180,
  overflowY: "auto",
  padding: "14px 16px",
  margin: "10px 16px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#f8fafc",
};

const agreementTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 8,
};

const agreementText: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.5,
  marginBottom: 10,
  color: "#334155",
};

const caErrorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  marginTop: 8,
};