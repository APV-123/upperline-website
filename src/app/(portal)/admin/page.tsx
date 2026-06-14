'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/navigation/AdminNav';
import { useRouter } from 'next/navigation';

type Deal = {
  id: string;
  name: string;
  raise_id: string;
  target_amount: number;
  is_public: boolean;
  is_archived: boolean;

  metrics?: {
    committed: number;
    investorCount: number;
    invitedCount: number;
    draftReadyCount: number;
  };
};

export default function AdminPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const COLORS = isDark
    ? {
      background: '#071426',
      surface: '#10213d',
      text: '#ffffff',
      subtext: '#9fb3c8',
      border: 'rgba(255,255,255,.08)',
      accent: '#31c8db',
    }
    : {
      background: '#f3f4f6',
      surface: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: 'rgba(15,23,42,.08)',
      accent: '#003a5d',
    };

  const archivedCount = deals.filter(
    (d: Deal) => d.is_archived
  ).length;
  const btnStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: '#173056',
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  };

  useEffect(() => {
    async function loadDeals() {
      try {
        const res = await fetch('/api/deals', { cache: 'no-store' });
        const json = await res.json();

        if (json?.ok) {
          setDeals(json.deals ?? []);
        } else {
          console.error('[DEALS LOAD ERROR]', json?.error);
        }
      } catch (e) {
        console.error('[DEALS LOAD FAILED]', e);
      } finally {
        setLoading(false);
      }
    }

    loadDeals();
  }, []);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };

    check();

    window.addEventListener('resize', check);

    return () =>
      window.removeEventListener('resize', check);
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem('theme');

    if (saved === 'dark') {
      setIsDark(true);
    }
  }, []);

  return (
    <>
      <AdminNav />

      <div
        style={{
          background: COLORS.background,
          minHeight: '100vh',
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: isMobile ? 12 : 24,
            background: 'transparent',
            minHeight: 'calc(100vh - 120px)',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              onClick={async () => {
                const res = await fetch('/api/deals/create', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: 'Untitled Deal',
                    target_amount: 1,
                  }),
                });

                const json = await res.json();

                if (!json?.ok || !json?.deal?.id) {
                  alert('Failed to create deal');
                  return;
                }

                router.push(`/admin/deals/${json.deal.id}/edit`);
              }}
              style={{
                marginTop: 6,
                background: 'rgba(49,200,219,.10)',
                color: COLORS.accent,
                border: `1px solid rgba(49,200,219,.18)`,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              + New Deal
            </button>
            <div
              onClick={() =>
                setShowArchived(!showArchived)
              }
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: COLORS.subtext,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {showArchived
                ? 'Hide Archived'
                : `Show Archived (${archivedCount})`}
            </div>
          </div>

          {loading && (
            <div style={{ fontSize: 13, color: COLORS.subtext }}>
              Loading deals…
            </div>
          )}

          {!loading && deals.length === 0 && (
            <div style={{ fontSize: 13, color: COLORS.subtext }}>
              No deals found.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {deals
              .filter(
                (d) =>
                  showArchived
                    ? d.is_archived
                    : !d.is_archived
              )
              .map((d) => {
                const committed = d.metrics?.committed ?? 0;
                const investorCount = d.metrics?.investorCount ?? 0;
                const invitedCount = d.metrics?.invitedCount ?? 0;
                const draftReadyCount = d.metrics?.draftReadyCount ?? 0;

                const pct =
                  d.target_amount > 0
                    ? Math.round((committed / d.target_amount) * 100)
                    : 0;

                return (
                  <div
                    key={d.id}
                    onClick={() =>
                      router.push(`/admin/deals/${d.id}/public`)
                    }
                    style={{
                      padding: 20,
                      background: d.is_public
                        ? COLORS.surface
                        : '#0c1b33',

                      border: d.is_public
                        ? `1px solid ${COLORS.border}`
                        : '1px solid rgba(255,255,255,.04)',
                      borderRadius: 12,
                      cursor: 'pointer',

                      transition: 'all .15s ease',

                      transform:
                        hovered === d.id
                          ? 'translateY(-2px)'
                          : 'translateY(0)',

                      boxShadow:
                        hovered === d.id
                          ? '0 16px 32px rgba(0,0,0,.28)'
                          : '0 8px 24px rgba(0,0,0,.18)',
                    }}
                    onMouseEnter={() => setHovered(d.id)}
                    onMouseLeave={() => setHovered(null)}

                  >
                    {/* LEFT */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 20,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: d.is_public
                              ? COLORS.text
                              : 'rgba(255,255,255,.72)',
                          }}
                        >
                          {d.name}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 32,
                            marginTop: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 500,
                                color: COLORS.subtext,
                                textTransform: 'uppercase',
                              }}
                            >
                              Invited
                            </div>

                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: d.is_public
                                  ? COLORS.text
                                  : 'rgba(255,255,255,.72)',
                              }}
                            >
                              {invitedCount}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 500,
                                color: COLORS.subtext,
                                textTransform: 'uppercase',
                              }}
                            >
                              Drafts
                            </div>

                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color:
                                  draftReadyCount > 0
                                    ? '#f59e0b'
                                    : COLORS.text,
                              }}
                            >
                              {draftReadyCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setOpenMenuId(
                              openMenuId === d.id
                                ? null
                                : d.id
                            );
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,

                            background: 'rgba(255,255,255,.03)',
                            border: `1px solid ${COLORS.border}`,

                            color: COLORS.subtext,
                            cursor: 'pointer',

                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',

                            fontSize: 18,
                            fontWeight: 700,
                          }}
                        >
                          ⋯
                        </button>

                        {openMenuId === d.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 28,
                              width: 160,
                              background: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 8,
                              overflow: 'hidden',
                              zIndex: 100,
                            }}
                          >
                            <button
                              style={{
                                width: '100%',
                                padding: 12,
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: COLORS.text,
                              }}
                            >
                              Duplicate
                            </button>

                            <button
                              style={{
                                width: '100%',
                                padding: 12,
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: COLORS.text,
                              }}
                            >
                              {d.is_archived
                                ? 'Restore'
                                : 'Archive'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile
                          ? 'repeat(2,1fr)'
                          : 'repeat(4,1fr)',
                        gap: 16,
                        marginBottom: 20,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.subtext }}>
                          RAISED
                        </div>

                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: d.is_public
                              ? COLORS.text
                              : 'rgba(255,255,255,.72)',
                          }}
                        >
                          ${committed.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: COLORS.subtext }}>
                          TARGET
                        </div>

                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: d.is_public
                              ? COLORS.text
                              : 'rgba(255,255,255,.72)',
                          }}
                        >
                          ${d.target_amount.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: COLORS.subtext }}>
                          INVESTORS
                        </div>

                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: d.is_public
                              ? COLORS.text
                              : 'rgba(255,255,255,.72)',
                          }}
                        >
                          {investorCount}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: COLORS.subtext }}>
                          FUNDED
                        </div>

                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: COLORS.accent,
                          }}
                        >
                          {pct}%
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,.06)',
                        overflow: 'hidden',
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: d.is_archived
                            ? '#0b1628'
                            : d.is_public
                              ? COLORS.surface
                              : '#0c1b33',
                          opacity: d.is_archived ? 0.75 : 1,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <Link href={`/admin/deals/${d.id}/investors`}>
                        <button
                          style={btnStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Investors
                        </button>
                      </Link>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/deals/${d.id}/edit`);
                        }}
                        style={{
                          ...btnStyle,
                          background: 'rgba(49,200,219,.15)',
                          color: COLORS.accent,
                          border: '1px solid rgba(49,200,219,.18)',
                        }}
                      >
                        Edit
                      </button>

                      <Link href={`/admin/deals/${d.id}/public`}>
                        <button
                          style={btnStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Preview
                        </button>
                      </Link>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          setDeals((prev) =>
                            prev.map((x) =>
                              x.id === d.id
                                ? { ...x, is_public: !x.is_public }
                                : x
                            )
                          );

                          const res = await fetch(
                            `/api/deals/${d.id}/toggle-public`,
                            { method: 'POST' }
                          );

                          const json = await res.json();

                          if (!json?.ok) {
                            setDeals((prev) =>
                              prev.map((x) =>
                                x.id === d.id
                                  ? { ...x, is_public: d.is_public }
                                  : x
                              )
                            );
                          }
                        }}
                        style={{
                          ...btnStyle,
                          background: d.is_public
                            ? 'rgba(49,200,219,.15)'
                            : 'rgba(255,255,255,.03)',
                          color: d.is_public
                            ? COLORS.accent
                            : 'rgba(255,255,255,.65)',
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {d.is_public ? 'Published' : 'Draft'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div >
    </>
  );
}


