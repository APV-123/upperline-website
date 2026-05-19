'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/navigation/AdminNav';
import { useRouter } from 'next/navigation';

const COLORS = {
  background: '#f3f4f6',
  surface: '#ffffff',
  primary: '#1e3a5f',
  text: '#0f172a',
  subtext: '#64748b',
  border: 'rgba(15,23,42,0.08)',
};

type Deal = {
  id: string;
  name: string;
  raise_id: string;
  target_amount: number;
  is_public: boolean;

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

  return (
    <>
      <AdminNav />

      <div
        style={{
          background: COLORS.primary,
          minHeight: '100vh',
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            marginLeft: 32,
            marginRight: 32,
            padding: 16,
            background: COLORS.background,
            minHeight: 'calc(100vh - 120px)',
          }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              Deals
            </div>

            <button
              onClick={() => router.push('/admin/deals/create')}
              style={{
                marginTop: 6,
                background: COLORS.primary,
                color: '#fff',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create
            </button>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deals.map((d) => {
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
                    padding: 12,
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {/* LEFT */}
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {d.name}
                    </div>

                    <div style={{ fontSize: 11, color: COLORS.subtext }}>
                      ${committed.toLocaleString()} / $
                      {d.target_amount.toLocaleString()} ({pct}%)
                    </div>

                    <div style={{ fontSize: 11, color: COLORS.subtext }}>
                      {investorCount} investors · {invitedCount} invited ·{' '}
                      {draftReadyCount} drafts
                    </div>

                    {/* Warning */}
                    {draftReadyCount > 0 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: '#b91c1c',
                          marginTop: 2,
                          fontWeight: 600,
                        }}
                      >
                        ⚠ {draftReadyCount} draft
                        {draftReadyCount > 1 ? 's' : ''} not sent
                      </div>
                    )}

                    {/* Status */}
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      {d.is_public ? '● Published' : '● Draft'}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div style={{ display: 'flex', gap: 8 }}>
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
                      style={btnStyle}
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
                          ? '#e8eef4'
                          : '#f1f2f4',
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
      </div>
    </>
  );
}

const btnStyle = {
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  fontSize: 12,
  color: '#0f172a',
  cursor: 'pointer',
};
