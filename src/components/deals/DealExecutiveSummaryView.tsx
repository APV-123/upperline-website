import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";

type DealMetric = {
  key: string;
  value?: string;
  section: string;
  display_order: number;
  is_visible?: boolean;
};

type Deal = {
  id: string;
  name: string;
  target_amount: number;

  location?: string;
  asset_class?: string;
  strategy?: string;

  estimated_closing_date?: string;

  overview_text?: string;
  business_plan_text?: string;

  metrics?: DealMetric[];

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

export default function DealExecutiveSummaryView({ deal, isDark }: { deal: Deal; isDark?: boolean }) {
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

  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i + 1) % images.length),
    [images.length]
  );

  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
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
  const [isMobile, setIsMobile] = useState(false);
  const [openLP, setOpenLP] = useState(true);
  const [openProject, setOpenProject] = useState(false);
  const [openCapital, setOpenCapital] = useState(false);

  const buildDocuments = useCallback((deal: Deal): Document[] => {
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
  }, [hasAccess]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!hasAccess) return;

    const savedEmail = localStorage.getItem(`ca:${deal.id}`);
    if (!savedEmail) return;

    fetch(`/api/deals/${deal.id}/ca/access`, {
      method: "POST",
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
  }, [deal, selectedDoc, buildDocuments]);


  useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, nextImage, prevImage]);




  function getSection(section: string) {
    return (deal.metrics ?? [])
      .filter((m) => m.section === section && m.is_visible !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }

  return (
    <div style={isDark ? containerDark : container}>
      <div
        style={{
          ...(isDark ? contentDark : content),
          padding: isMobile ? 20 : 40,
        }}
      >
        {/* HEADER */}
        <div style={{
          ...headerRow,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 12 : 0,
        }}>


          <div
            style={{ cursor: "pointer", display: "inline-block" }}
            onClick={() => (window.location.href = "https://portal.upperlineco.com")}
          >
            <Image
              src={isDark ? "/Upperline-logo-inverted.png" : "/upperline-logo.png"}
              alt="Upperline"
              width={180}
              height={48}
              priority
            />
          </div>



          <button
            style={{
              ...ctaBtn,
              width: isMobile ? "100%" : "auto",
              background: isDark ? "#2f6fed" : "#2e6d5f",
              boxShadow: isDark
                ? "0 6px 20px rgba(47,111,237,0.25)"
                : undefined

            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = isDark ? "#3b82ff" : "#3a7f70")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = isDark ? "#2f6fed" : "#2e6d5f")
            }
            onClick={() => (window.location.href = "mailto:bh@upperline.com")}
          >
            Discuss Further
          </button>

        </div>

        <h1 style={isDark ? { ...title, ...textPrimaryDark } : title}>
          {deal.name}
        </h1>
        {(deal.asset_class || deal.strategy) && (
          <p style={isDark ? { ...subtitle, ...textSecondaryDark } : subtitle}>
            {deal.asset_class || ""}
            {deal.asset_class && deal.strategy ? " · " : ""}
            {deal.strategy || ""}
          </p>
        )}

        {/* LOCATION + DATE */}

        <div
          style={{
            ...metaRow,
            ...(isDark ? textSecondaryDark : {}),
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ?
              8 : 12,
          }}
        >

          <div>
            <strong>Location:</strong>{" "}
            {deal.location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={isDark ? locationLinkStyleDark : locationLinkStyle}
              >
                {deal.location}
              </a>
            ) : (
              "Not provided"
            )}
          </div>

          <div>
            <strong>Estimated Closing:</strong>{" "}
            {deal.estimated_closing_date
              ? formatDate(deal.estimated_closing_date)
              : "Not provided"}
          </div>
        </div>
        <div style={section}>
          <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Overview</h2>
          <p style={isDark ? { ...paragraph, ...textSecondaryDark } : paragraph}>
            {deal.overview_text || "No overview provided."}
          </p>

        </div>
        {/* IMAGE PLACEHOLDER */}
        <div style={{
          ...imageGrid,
          gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
        }}>
          {deal.image_1_url && (
            <img
              src={deal.image_1_url}
              style={{
                ...mainImage,
                height: isMobile ? 220 : 400,
                cursor: "zoom-in",
                filter: isDark ? "brightness(0.92)" : "none",
              }}
              onClick={() => openLightbox(0)}
            />
          )}

          <div
            style={{
              ...sideImages,
              flexDirection: isMobile ? 'row' : 'column',
            }}
          >
            {deal.image_2_url && (
              <img
                src={deal.image_2_url}

                style={{
                  ...smallImage,
                  height: isMobile ? 140 : 194,
                  cursor: "zoom-in",
                  filter: isDark ? "brightness(0.92)" : "none",
                }}

                onClick={() => openLightbox(1)}
              />
            )}
            {deal.image_3_url && (
              <img
                src={deal.image_3_url}

                style={{
                  ...smallImage,
                  height: isMobile ? 140 : 194,
                  cursor: "zoom-in",
                  filter: isDark ? "brightness(0.92)" : "none",
                }}

                onClick={() => openLightbox(2)}
              />
            )}
          </div>
        </div>
        <div style={section}>
          <div

            style={
              isDark
                ? {
                  ...sectionHeader,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }
                : sectionHeader
            }

            onClick={() => setOpenLP((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenLP((v) => !v);
              }
            }}
          >
            <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>LP Return Summary</h2>

            <button
              type="button"
              style={isDark ? { ...sectionToggleBtn, ...buttonDark } : sectionToggleBtn}
              onClick={(e) => {
                e.stopPropagation();
                setOpenLP((v) => !v);
              }}
            >
              {openLP ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div style={getCollapseStyle(openLP, 700)}>
            <div style={metricsGrid}>
              <Metric label="LP Equity Total" isDark={isDark}>
                {formatCurrency(String(deal.target_amount))}
              </Metric>

              {getSection('lp_summary').map((m) => (
                <Metric key={m.key} label={formatKey(m.key)} isDark={isDark}>
                  {formatValue(m.value, m.key)}
                </Metric>
              ))}
            </div>
          </div>
        </div>
        <div style={section}>
          <div

            style={
              isDark
                ? {
                  ...sectionHeader,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }
                : sectionHeader
            }

            onClick={() => setOpenProject((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenProject((v) => !v);
              }
            }}
          >

            <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>
              Project Returns
            </h2>


            <button
              type="button"
              style={isDark ? { ...sectionToggleBtn, ...buttonDark } : sectionToggleBtn}
              onClick={(e) => {
                e.stopPropagation();
                setOpenProject((v) => !v);
              }}
            >
              {openProject ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div style={getCollapseStyle(openProject, 400)}>
            <div style={metricsGrid}>
              {getSection('project_returns').map((m) => (
                <Metric key={m.key} label={formatKey(m.key)} isDark={isDark}>
                  {formatValue(m.value, m.key)}
                </Metric>
              ))}
            </div>
          </div>
        </div>
        <div style={section}>
          <div

            style={
              isDark
                ? {
                  ...sectionHeader,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }
                : sectionHeader
            }

            onClick={() => setOpenCapital((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenCapital((v) => !v);
              }
            }}
          >
            <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Equity Capital Stack</h2>

            <button
              type="button"
              style={isDark ? { ...sectionToggleBtn, ...buttonDark } : sectionToggleBtn}
              onClick={(e) => {
                e.stopPropagation();
                setOpenCapital((v) => !v);
              }}
            >
              {openCapital ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div style={getCollapseStyle(openCapital, 400)}>
            <div style={metricsGrid}>
              <Metric label="LP Equity" isDark={isDark}>
                {formatCurrency(String(deal.target_amount))}
              </Metric>

              {getSection('capital_stack').map((m) => (
                <Metric key={m.key} label={formatKey(m.key)} isDark={isDark}>
                  {formatValue(m.value, m.key)}
                </Metric>
              ))}
            </div>
          </div>
        </div>
        {/* BUSINESS PLAN */}

        <div style={section}>
          <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Business Plan</h2>
          <p style={isDark ? { ...paragraph, ...textSecondaryDark } : paragraph}>
            {deal.business_plan_text || "No business plan provided."}
          </p>
        </div>

        <div style={websiteLinkContainer}>
          <a
            href="https://www.upperlineco.com"
            target="_blank"
            rel="noopener noreferrer"
            style={isDark ? websiteLinkStyleDark : websiteLinkStyle}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            🌐 Visit Upperline Website
          </a>
        </div>

        {/* DOCUMENTS */}
        <div style={section}>
          <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Documents</h2>

          <div style={{
            ...docContainer,
            gridTemplateColumns: isMobile ? "1fr" : "250px 1fr",
            height: isMobile ? "auto" : 500,
          }}>

            {/* LEFT: DOCUMENT LIST */}

            <div
              style={
                isDark
                  ? {
                    ...docList,
                    background: "#05070a",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }
                  : docList
              }
            >

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
                        fetch(`/api/deals/${deal.id}/ca/access`, {
                          method: "POST",
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
                      background: isDark
                        ? (isActive ? "#0f172a" : "#05070a")
                        : (isActive ? "#eef2f7" : "#fff"),
                      color: isDark ? "#ffffff" : "#0f172a",
                      borderBottom: isDark
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid #e5e7eb",
                      opacity: doc.gated ? 0.6 : 1,
                      cursor: "pointer",
                    }}

                  >
                    {doc.gated ? '🔒 ' : '📄 '}
                    {doc.label}
                  </div>
                );
              })}
            </div>

            {/* RIGHT: PREVIEW */}

            <div
              style={{
                ...docPreview,
                ...(isDark ? panelDarkAlt : {}),
                display: "flex",
                flexDirection: "column",
              }}
            >

              {selectedDoc ? (
                <>
                  <div
                    style={{
                      ...docHeader,
                      ...(isDark
                        ? {
                          color: "#ffffff",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }
                        : {}),
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: isMobile ? 8 : 0,
                    }}
                  >
                    <div>{selectedDoc.label}</div>
                    <a href={selectedDoc.url} target="_blank">
                      <button
                        style={{
                          ...(isDark ? { ...downloadBtn, ...buttonDark } : downloadBtn),
                          width: isMobile ? "100%" : "auto",
                        }}
                      >Download</button>
                    </a>
                  </div>

                  {selectedDoc.url ? (
                    <iframe src={selectedDoc.url}
                      style={{
                        ...iframe,
                        minHeight: isMobile ? 300 : undefined,
                      }}
                    />
                  ) : (
                    <div style={{ padding: 20, color: "#64748b" }}>
                      {selectedDoc.label === "Full Equity Memo"
                        ? "Click to load full memo."
                        : "Select a document to preview."}
                    </div>
                  )}

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
            <div
              style={
                isDark
                  ? {
                    ...sheet,
                    background: "#0f172a",
                    color: "#ffffff",
                  }
                  : sheet
              }
              onClick={(e) => e.stopPropagation()}
            >


              {/* Handle */}
              <div style={sheetHandle} />

              {/* Header */}
              <div
                style={
                  isDark
                    ? {
                      ...sheetHeader,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }
                    : sheetHeader
                }
              >
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

              <div style={{
                flex: 1,
                overflowY: "auto",
              }}>
                <div style={sheetFooter}>


                  {/* FIRST / LAST ROW */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>First Name</label>
                      <input
                        style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                        value={caFirstName}
                        onChange={(e) => setCaFirstName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>Last Name</label>
                      <input
                        style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                        value={caLastName}
                        onChange={(e) => setCaLastName(e.target.value)}
                      />
                    </div>

                  </div>

                  <div style={sheetFormRow}>
                    <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>Email</label>
                    <input
                      style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                      value={caEmail}
                      onChange={(e) => setCaEmail(e.target.value)}
                    />
                  </div>

                  <div style={sheetFormRow}>
                    <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>Company (optional)</label>
                    <input
                      style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                      value={caCompany}
                      onChange={(e) => setCaCompany(e.target.value)}
                    />
                  </div>
                  {/* Job Title */}
                  <div style={sheetFormRow}>
                    <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>Job Title (optional)</label>
                    <input
                      style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                      value={caJobTitle}
                      onChange={(e) => setCaJobTitle(e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div style={sheetFormRow}>
                    <label style={isDark ? { ...sheetLabel, ...mutedTextDark } : sheetLabel}>Phone Number (optional)</label>
                    <input
                      style={isDark ? { ...sheetInput, ...inputDark } : sheetInput}

                      value={caPhone}
                      onChange={(e) => setCaPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* LEGAL AGREEMENT SCROLLER */}

                <div
                  style={
                    isDark
                      ? {
                        ...agreementScroll,
                        background: "#0b1220",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                      : agreementScroll
                  }
                >


                  <h4 style={agreementTitle}>Confidentiality Agreement</h4>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    This Confidentiality and Non-Disclosure Agreement (“Agreement”) governs access to proprietary and non-public information for the purpose of evaluating a potential investment opportunity.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    By accessing these materials, you acknowledge that all information provided constitutes confidential information, including but not limited to financial statements, projections, ownership structures, investment models, and all documents made available through this deal portal.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    You agree that such information shall be used solely for the purpose of evaluating a potential investment and shall not be disclosed, reproduced, or distributed to any third party without prior written consent.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    You further agree not to contact any tenants, lenders, investors, brokers, or other parties identified within the materials without explicit authorization from Upperline.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    All confidential information remains the exclusive property of Upperline. No license or ownership rights are granted by access to these materials.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    This Agreement shall remain in effect for a period of two (2) years from the date of acceptance. Unauthorized use or disclosure may result in legal action and injunctive relief.
                  </p>

                  <p style={isDark ? { ...agreementText, ...textSecondaryDark } : agreementText}>
                    Acceptance of this Agreement electronically constitutes a legally binding agreement enforceable to the same extent as a manually executed agreement.
                  </p>

                </div>
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
                <div
                  style={{
                    ...sheetActions,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 12,
                  }}
                >
                  <button
                    style={{
                      ...sheetSecondaryBtn,
                      width: isMobile ? '100%' : 'auto',
                    }}
                    onClick={() => setShowCA(false)}
                    disabled={caBusy}
                  >
                    Cancel
                  </button>

                  <button
                    style={{
                      ...sheetPrimaryBtn,
                      width: isMobile ? '100%' : 'auto',
                    }}
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
    </div >
  );
}

/* ✅ Metric */
function Metric({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark?: boolean;
}) {
  return (
    <div style={isDark ? { ...metricCard, ...panelDark } : metricCard}>
      <div style={isDark ? { ...metricLabel, ...mutedTextDark } : metricLabel}>
        {label}
      </div>
      <div style={isDark ? { ...metricValue, ...textPrimaryDark } : metricValue}>
        {children}
      </div>
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
function formatKey(key: string) {
  const map: Record<string, string> = {
    lp_irr: "LP IRR",
    lp_moic: "LP Equity Multiple (MOIC)",
    lp_cash_on_cash: "Cash-on-Cash Return",
    minimum_investment: "Minimum Investment",

    project_unlevered_irr: "Project Unlevered IRR",
    project_levered_irr: "Project Levered IRR",
    untrended_return_on_cost: "Un-Trended Return on Cost",
    stabilized_return_on_cost: "Stabilized Return on Cost",

    gp_equity: "GP Equity",
    total_equity: "Total Equity",
  };

  return map[key] || key;
}

function formatValue(value?: string, key?: string) {
  if (!value) return "—";

  if (key?.includes('irr') || key?.includes('cost')) {
    return formatPercent(value);
  }

  if (key?.includes('moic') || key?.includes('multiple')) {
    return formatMultiple(value);
  }

  if (value.toLowerCase().includes('$')) {
    return formatCurrency(value);
  }

  return value;
}
function getCollapseStyle(isOpen: boolean, maxHeight: number): React.CSSProperties {
  return {
    maxHeight: isOpen ? maxHeight : 0,
    opacity: isOpen ? 1 : 0,
    overflow: 'hidden',
    transition: 'max-height 0.28s ease, opacity 0.2s ease',
  };
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
  marginBottom: 28,
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  padding: '6px 0 10px 0',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: 12,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 10,
};

const sectionToggleBtn: React.CSSProperties = {
  fontSize: 12,
  color: '#1f3d36',
  background: '#f1f5f9',
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  cursor: 'pointer',
  fontWeight: 600,
  lineHeight: 1,
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
  marginTop: 4,
  marginBottom: 32,
};

const mainImage = {
  width: '100%',
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
  objectFit: 'cover' as const,
  borderRadius: 8,
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
};

const ctaBtn: React.CSSProperties = {
  color: '#fff',
  padding: '10px 18px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'background 0.15s ease', // 🔥 nice polish
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
  minHeight: 300,
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

const sheetBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 10001,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

const sheet = {
  width: "100%",
  maxWidth: 720,
  height: "90vh",
  background: "#fff",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  boxShadow: "0 -20px 60px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column" as const,
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

const locationLinkStyle: React.CSSProperties = {
  color: "#2f6fed",
  textDecoration: "underline",
};
const locationLinkStyleDark: React.CSSProperties = {
  color: "#7da2ff",
  textDecoration: "underline",
};
const websiteLinkContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 24,
  marginBottom: 24,
};

const websiteLinkStyle: React.CSSProperties = {
  color: "#2f6fed",
  textDecoration: "none",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const containerDark: React.CSSProperties = {
  background: "#05070a",
  minHeight: "100vh",
  padding: "40px 20px",
  display: "flex",
  justifyContent: "center",
};
const contentDark: React.CSSProperties = {
  maxWidth: 1000,
  width: "100%",
  background: "#05070a",
  padding: 40,
  borderRadius: 8,
};
const websiteLinkStyleDark: React.CSSProperties = {
  color: "#7da2ff",
  textDecoration: "none",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const textPrimaryDark: React.CSSProperties = {
  color: "#ffffff",
};

const textSecondaryDark: React.CSSProperties = {
  color: "rgba(255,255,255,0.78)",
};

const mutedTextDark: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
};

const panelDark: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
};

const panelDarkAlt: React.CSSProperties = {
  background: "#0c1426",
  border: "1px solid rgba(255,255,255,0.08)",
};

const buttonDark: React.CSSProperties = {
  background: "#0f172a",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.10)",
};

const inputDark: React.CSSProperties = {
  background: "#0b1220",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.12)",
};

