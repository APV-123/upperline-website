import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import DealHero from "./DealHero";
import DealStickyHeader from "../navigation/DealStickyHeader";
import { 
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

type DealHighlight = {
  id: string;
  title: string;
  description: string;
  display_order: number;
  is_visible: boolean;
};

type DealMetric = {
  key: string;
  label: string;
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

  why_we_like_it?: string;
  overview_text?: string;
  business_plan_text?: string;

  deal_highlights?: DealHighlight[];
  metrics?: DealMetric[];

  image_1_url?: string;
  image_2_url?: string;
  image_3_url?: string;

  pitch_book_url?: string;
  abridged_memo_url?: string;
  full_memo_url?: string;
  full_memo_requires_ca?: boolean;
  proforma_url?: string;
};

type Document = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  url: string;
  gated: boolean;
  alwaysShow?: boolean;
};

export default function DealExecutiveSummaryView({ deal, isDark }: { deal: Deal; isDark?: boolean }) {
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
  const [isAccredited, setIsAccredited] =
    useState(false);
  const [caError, setCaError] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  console.log(
    'window width',
    typeof window !== 'undefined'
      ? window.innerWidth
      : 'server',
    'isMobile',
    isMobile
  );
  const [openLP, setOpenLP] = useState(true);
  const [openProject, setOpenProject] = useState(true);
  const [openCapital, setOpenCapital] = useState(true);

  const buildDocuments = useCallback(
    (deal: Deal): Document[] => {
      return [
        {
          id: 'full_memo',
          label: 'Investment Memorandum',
          description:
            'Offering details, market analysis, business plan, and projected returns.',
          url: '',
          gated:
            !hasAccess &&
            (deal.full_memo_requires_ca ?? true),
          icon: <FileText size={28} />,
        },
        {
          id: 'proforma',
          label: 'Financial Model',
          description:
            'Cash flow projections, underwriting assumptions, and return sensitivity.',
          url: deal.proforma_url || '',
          gated:
            !hasAccess &&
            (deal.full_memo_requires_ca ?? true),
          icon: <FileSpreadsheet size={28} />,
        },
      ];
    },
    [hasAccess]
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpenProject(false);
      setOpenCapital(false);
    } else {
      setOpenProject(true);
      setOpenCapital(true);
    }
  }, [isMobile]);


  useEffect(() => {
    const savedEmail = localStorage.getItem(`ca:${deal.id}`);
    if (savedEmail) {
      setHasAccess(true);
    }
  }, [deal.id]);


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
  const lpEquity = deal.target_amount;

  const gpMetric = getSection('capital_stack')
    .find(m => m.key === 'gp_equity');

  const gpEquity = Number(
    String(gpMetric?.value || '0')
      .replace(/[$,]/g, '')
  );

  const totalEquity = lpEquity + gpEquity;

  const lpPct = totalEquity
    ? (lpEquity / totalEquity) * 100
    : 0;

  const gpPct = totalEquity
    ? (gpEquity / totalEquity) * 100
    : 0;

  return (
    <>
      <DealStickyHeader
        dealName={deal.name}
        hasSignedCA={hasAccess}
        onOpenCA={() =>
          setShowCA(true)
        }
        isMobile={isMobile}
        isDark={isDark}
      />

      <div style={isDark ? containerDark : container}>

        <div
          style={{
            ...(isDark ? contentDark : content),
            padding: isMobile ? 20 : 40,
          }}
        >
          <DealHero
            deal={deal}
            isMobile={isMobile}
            isDark={isDark}
          />

          <div style={{
            ...memoBody,
            padding: isMobile
              ? '16px'
              : '16px 48px 56px'
          }}>
            {/* INVESTMENT HIGHLIGHTS */}

            {deal.deal_highlights?.length ? (
              <section
                id="highlights"
                style={{
                  ...section,
                  scrollMarginTop: 90,
                }}>
                <div
                  style={{
                    height: 1,
                    background: 'rgba(255,255,255,.08)',
                    marginBottom: 32,
                  }}
                />
                <h2
                  style={
                    isDark
                      ? {
                        ...sectionTitle,
                        ...textPrimaryDark,
                        fontSize: isMobile ? 22 : 24,
                        fontWeight: 700,
                        marginBottom: 20,
                      }
                      : {
                        ...sectionTitle,
                        fontSize: isMobile ? 22 : 24,
                        fontWeight: 700,
                        marginBottom: 20,
                      }
                  }
                >
                  Why We Like It
                </h2>
                <div
                  style={{
                    maxWidth: 900,
                    margin: '0 auto',
                  }}
                >
                  <div style={{
                    ...highlightsGrid,
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(auto-fit, minmax(320px, 1fr))'

                  }}>
                    {deal.deal_highlights
                      .filter((h) => h.is_visible)
                      .sort(
                        (a, b) =>
                          (a.display_order ?? 0) -
                          (b.display_order ?? 0)
                      )
                      .map((h) => (
                        <div
                          key={h.id}
                          style={
                            isDark
                              ? { ...highlightCard, ...panelDark }
                              : highlightCard
                          }
                        >
                          <div
                            style={{
                              width: 42,
                              height: 4,
                              borderRadius: 999,
                              background: '#31c8db',
                              marginBottom: 12,
                            }}
                          />
                          <div
                            style={
                              isDark
                                ? {
                                  ...highlightTitle,
                                  color: '#ffffff',
                                }
                                : highlightTitle
                            }
                          >
                            {h.title}
                          </div>

                          <div
                            style={
                              isDark
                                ? {
                                  ...highlightDescription,
                                  ...textSecondaryDark,
                                }
                                : highlightDescription
                            }
                          >
                            {h.description}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            ) : null}

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
                      width: isMobile ? 'calc(50% - 6px)' : '100%',
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
            <section
              id="overview"
              style={{
                ...section,
                scrollMarginTop: 90,
              }}>
              <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Overview</h2>
              <p style={isDark ? { ...paragraph, ...textSecondaryDark } : paragraph}>
                {deal.overview_text || "No overview provided."}
              </p>

            </section>

            <section
              id="returns"
              style={{
                ...section,
                scrollMarginTop: 90,
              }}>
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
                <div style={{
                  ...metricsGrid,
                  gridTemplateColumns: isMobile
                    ? '1fr'
                    : 'repeat(2, 1fr)'
                }}>
                  <Metric label="LP Equity Total" isDark={isDark}>
                    {formatCurrency(String(deal.target_amount))}
                  </Metric>

                  {getSection('lp_summary').map((m) => (
                    <Metric key={m.key} label={m.label} isDark={isDark}>
                      {formatValue(m.value, m.key)}
                    </Metric>
                  ))}
                </div>
              </div>
            </section>
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
                    <Metric key={m.key} label={m.label} isDark={isDark}>
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
                <div
                  style={{
                    ...metricsGrid,
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(2, 1fr)',
                  }}
                >
                  <Metric label="LP Equity" isDark={isDark}>
                    {formatCurrency(String(deal.target_amount))}
                  </Metric>

                  {getSection('capital_stack').map((m) => (
                    <Metric
                      key={m.key}
                      label={m.label}
                      isDark={isDark}
                    >
                      {formatValue(m.value, m.key)}
                    </Metric>
                  ))}

                  {/* LP / GP CAPITAL MIX */}
                  <div
                    style={{
                      ...(isDark
                        ? { ...metricCard, ...panelDark }
                        : metricCard),
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          color: isDark
                            ? 'rgba(255,255,255,.85)'
                            : '#0f172a',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        LP {Math.round(lpPct)}%
                      </span>

                      <span
                        style={{
                          color: isDark
                            ? 'rgba(255,255,255,.65)'
                            : '#64748b',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        GP {Math.round(gpPct)}%
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {Array.from({ length: 50 }).map((_, i) => {
                        const pct = ((i + 1) / 50) * 100;

                        return (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 1,
                              background:
                                pct <= lpPct
                                  ? '#31c8db'
                                  : isDark
                                    ? 'rgba(255,255,255,.25)'
                                    : 'rgba(15,23,42,.12)',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* BUSINESS PLAN */}

            <section
              id="business-plan"
              style={{
                ...section,
                scrollMarginTop: 90,
              }}>
              <h2 style={isDark ? { ...sectionTitle, ...textPrimaryDark } : sectionTitle}>Business Plan</h2>
              <p style={isDark ? { ...paragraph, ...textSecondaryDark } : paragraph}>
                {deal.business_plan_text || "No business plan provided."}
              </p>
            </section>

            {/* DOCUMENTS */}
            <section
              id="documents"
              style={{
                ...section,
                scrollMarginTop: 90,
              }}
            >
              <h2
                style={
                  isDark
                    ? { ...sectionTitle, ...textPrimaryDark }
                    : sectionTitle
                }
              >
                Documents
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    isMobile
                      ? '1fr'
                      : 'repeat(2, 1fr)',
                  gap: 20,
                }}
              >
                {buildDocuments(deal).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      background: '#10213d',
                      border:
                        doc.gated
                          ? '1px solid rgba(255,255,255,.08)'
                          : '1px solid rgba(49,200,219,.25)',
                      borderRadius: 12,
                      padding: 28,
                      minHeight: 220,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: 34, marginBottom: 16, }}>
                      {doc.gated ? '🔒' : doc.icon}
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: '#fff',
                        marginBottom: 10,

                      }}
                    >
                      {doc.label}
                    </div>

                    <div
                      style={{
                        color: 'rgba(255,255,255,.65)',
                        marginTop: 6,
                        fontSize: 15,
                        lineHeight: 1.6,
                      }}
                    >
                      {doc.description}
                      <div
                        style={{
                          marginTop: 14,
                          fontSize: 12,
                          color: 'rgba(255,255,255,.55)',
                          textTransform: 'uppercase',
                          letterSpacing: '.08em',
                          fontWeight: 600,
                        }}
                      >
                        {doc.id === 'full_memo'
                          ? 'PDF DOCUMENT'
                          : 'EXCEL MODEL'}
                      </div>
                    </div>

                    <button
                      style={{
                        marginTop: 16,
                        background: '#31c8db',
                        color: '#081628',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 18px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                      onClick={() => {
                        if (doc.gated) {
                          setShowCA(true);
                          return;
                        }

                        if (doc.url) {
                          window.open(doc.url, '_blank');
                        }
                      }}
                    >
                      {doc.gated
                        ? 'Sign CA to Access'
                        : 'Open Document'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <h2
              style={
                isDark
                  ? { ...sectionTitle, ...textPrimaryDark }
                  : sectionTitle
              }
            >
              About the Sponsor
            </h2>
            <section
              id="about-upperline"
              style={{
                ...section,
                scrollMarginTop: 90,
                position: 'relative',
                overflow: 'hidden',
                padding: isMobile ? '20px 16px' : '48px',
                borderRadius: 20,
                background: isDark ? '#111827' : '#f8fafc',
                border: isDark
                  ? '1px solid #1f2937'
                  : '1px solid #e2e8f0',
                maxWidth: isMobile ? '100%' : 1000,
                margin: '0 auto',
              }}
            >
              {/* Top Accent */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: '#31c8db',
                }}
              />

              {/* Pattern Background */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.02,
                  backgroundImage:
                    'url("/Upperline_IconPattern3Outline_Navy_RGB.png")',
                  backgroundRepeat: 'repeat',
                  backgroundSize: '420px',
                  pointerEvents: 'none',
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  maxWidth: isMobile ? '100%' : 800,
                  textAlign: 'left',
                }}
              >
                <img
                  src={isDark
                    ? "/Upperline-logo-inverted.png"
                    : "/upperline-logo.png"
                  }
                  alt="Upperline"
                  style={{
                    height: isMobile ? 32 : 56,
                    width: 'auto',
                    marginBottom: isMobile ? 20 : 32,
                  }}
                />

                <p
                  style={{
                    ...(isDark
                      ? { ...paragraph, ...textSecondaryDark }
                      : paragraph),
                    marginBottom: 24,
                    fontSize: isMobile ? 16 : 18,
                    lineHeight: isMobile ? 1.65 : 1.7,
                    maxWidth: isMobile ? '100%' : 700,
                  }}
                >
                  Upperline is a vertically integrated real estate investment,
                  development, and asset management firm focused on acquiring,
                  developing, and operating assets throughout high-growth Texas
                  markets. By combining investment expertise, development execution,
                  and active asset management, we seek to create long-term value for
                  our investors through disciplined capital allocation and operational
                  excellence.
                </p>

                <a
                  href="https://www.upperlineco.com/who-we-are"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#31c8db',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  View Company Profile →
                </a>
              </div>
            </section>


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
                  {isMobile && (
                    <div style={sheetHandle} />
                  )}

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

                  <div
                    style={{
                      overflowY: "auto",
                    }}
                  >
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
                    <label
                      style={{
                        ...sheetCheckboxRow,
                        marginBottom: 16,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAccredited}
                        onChange={(e) =>
                          setIsAccredited(
                            e.target.checked
                          )
                        }
                      />

                      I certify that I am an accredited investor.
                    </label>
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
                          if (!isAccredited) {
                            setCaError(
                              "You must certify accredited investor status."
                            );
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
                            setShowCA(false);

                          } finally {
                            setCaBusy(false);
                          }
                        }}
                      >
                        {caBusy
                          ? "Granting access…"
                          : "Accept & Access Full Memorandum"}
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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
  display: "flex",
  justifyContent: "center",
};

const content: React.CSSProperties = {
  maxWidth: 1200,
  width: "100%",
  padding: 0,
  background: 'transparent',
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
  alignItems: "center",
};

const sheet = {
  width: "100%",
  maxWidth: 860,
  maxHeight: "85vh",
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
  background: "#31c8db",
  color: "#081628",
  padding: "12px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};

const sheetSecondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "rgba(255,255,255,.65)",
  padding: "12px 20px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.12)",
  cursor: "pointer",
};
const agreementScroll: React.CSSProperties = {
  maxHeight: 260,
  overflowY: "auto",
  padding: "20px",
  margin: "10px 16px",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.04)",
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

const containerDark: React.CSSProperties = {
  background: '#081628',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
};

const contentDark: React.CSSProperties = {
  maxWidth: 1000,
  width: '100%',
  background: '#081628',
  padding: 40,
  borderRadius: 8,
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
  background: "#10213d",
  border: "1px solid rgba(49,200,219,.15)",
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
const highlightsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
};

const highlightCard: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '20px 18px',
  background: '#ffffff',
  minHeight: 140,
};

const highlightTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 8,
};

const highlightDescription: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: '#64748b',
};

const memoBody: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '16px 48px 56px',
};
