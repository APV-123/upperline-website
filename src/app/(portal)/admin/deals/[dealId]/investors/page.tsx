'use client';

import { useEffect, useMemo, useState } from 'react';

type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

type ApiInvestorRow = {
    dealId: string;
    contactId: string | null;
    investorName: string;
    investorEmail: string | null;
    amount: number;
    dealstage: string | null;
    dealstageLabel: string | null;
    bucket: Bucket;
    pipeline: string | null;
    raise_id: string | null;
    hs_lastactivitydate: string | null;
    hs_lastmodifieddate: string | null;
};

type Investor = {
    id: string;
    name: string;
    email?: string | null;
    amount: number;
    bucket: Bucket;
    lastActivity: string;
    stageLabel?: string | null;
    dealId?: string;
};
type ContactRow = {
    id: string;        // HubSpot contactId
    name: string;
    email: string;
};
const BUCKETS: { key: Bucket; label: string }[] = [
    { key: 'committed', label: 'Committed' },
    { key: 'circling', label: 'Circling' },
    { key: 'needs_touch', label: 'Needs Touch' },
    { key: 'passed', label: 'Passed' },
];

// For now we hardcode the raise target at the UI layer.
// Later: move target into HubSpot property or a Portal config table keyed by raise_id.
const RAISE_TARGET = 1_500_000;

function formatDateMaybe(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
}

function InvestorCard({ investor }: { investor: Investor }) {
    const isNeedsTouch = investor.bucket === 'needs_touch';

    return (
        <div
            style={{
                background: '#1a1f24', // Iron-toned dark
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
                color: '#f1f3f4',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: isNeedsTouch ? '0 0 0 2px rgba(225,29,72,0.35)' : 'none', // calm urgency
            }}
        >
            {/* Investor Name */}
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: '0.2px',
                    marginBottom: 6,
                }}
            >
                {investor.name}
            </div>

            {/* Secondary line: email + stage label */}
            <div
                style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginBottom: 10,
                }}
            >
                {investor.email ? investor.email : '—'}
                {investor.stageLabel ? ` · ${investor.stageLabel}` : ''}
            </div>

            {/* Amount */}
            <div
                style={{
                    fontSize: 14,
                    opacity: 0.85,
                    marginBottom: 10,
                }}
            >
                ${investor.amount.toLocaleString()}
            </div>

            {/* Activity */}
            <div
                style={{
                    fontSize: 12,
                    opacity: 0.6,
                    marginBottom: 18,
                }}
            >
                Last activity · {investor.lastActivity}
            </div>

            {/* Actions (placeholders for now) */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                }}
            >
                {['Send Terms', 'Nudge', 'Approve', 'Mark Committed', 'Pass'].map((label) => (
                    <button
                        key={label}
                        onClick={() => console.log(label, investor.name, investor.dealId)}
                        style={{
                            background: 'transparent',
                            color: '#cfd4d8',
                            border: '1px solid rgba(255,255,255,0.18)',
                            borderRadius: 8,
                            fontSize: 12,
                            padding: '6px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function DealInvestorsPage() {
    const [rows, setRows] = useState<ApiInvestorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Hardcode raiseId for v1; later you can derive from dealId route param or a deal->raise mapping.
    const raiseId = 'INW-ROSE-001';
    async function reloadInvestors() {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/hubspot/raises/${raiseId}`, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
            setError(data?.error ?? 'Failed to load investors');
            setRows([]);
        } else {
            setRows((data?.investors ?? []) as ApiInvestorRow[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`/api/hubspot/raises/${raiseId}`, { cache: 'no-store' });
                const data = await res.json();

                if (!alive) return;

                if (!res.ok || data?.ok === false) {
                    setError(data?.error ?? 'Failed to load investors');
                    setRows([]);
                    return;
                }

                setRows((data?.investors ?? []) as ApiInvestorRow[]);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? 'Failed to load investors');
                setRows([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        reloadInvestors();

        return () => {
            alive = false;
        };
    }, [raiseId]);

    const investors: Investor[] = useMemo(() => {
        return rows.map((r) => {
            const lastActivity =
                r.hs_lastactivitydate
                    ? formatDateMaybe(r.hs_lastactivitydate)
                    : formatDateMaybe(r.hs_lastmodifieddate);

            return {
                id: r.dealId,
                dealId: r.dealId,
                name: r.investorName,
                email: r.investorEmail,
                amount: Number(r.amount ?? 0),
                bucket: r.bucket,
                lastActivity,
                stageLabel: r.dealstageLabel,
            };
        });
    }, [rows]);

    const committedTotal = useMemo(() => {
        return investors
            .filter((i) => i.bucket === 'committed')
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }, [investors]);


    const [showAddInvestor, setShowAddInvestor] = useState(false);
    const [adding, setAdding] = useState(false);

    return (
        <div
            style={{
                backgroundColor: '#f5f6f7', // soft neutral canvas
                minHeight: '100vh',
                padding: '36px 44px',
            }}
        >
            {/* Header */}

            <div
                style={{
                    marginBottom: 32,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >

                <h1
                    style={{
                        fontSize: 28,
                        fontWeight: 500,
                        marginBottom: 6,
                    }}
                >
                    Inwood – Rosehill LP
                </h1>
                <div
                    style={{
                        fontSize: 14,
                        opacity: 0.65,
                    }}
                >
                    Admin · Investor Command Center
                </div>
            </div>

            <button
                onClick={() => setShowAddInvestor(true)}
                style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                }}
            >
                + Add Investor
            </button>

            {/* Totals */}
            <div
                style={{
                    display: 'flex',
                    gap: 48,
                    marginBottom: 18,
                }}
            >
                <div>
                    <div style={{ fontSize: 22, fontWeight: 600 }}>${committedTotal.toLocaleString()}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>Committed</div>
                </div>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 600 }}>${RAISE_TARGET.toLocaleString()}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>Target</div>
                </div>
            </div>

            {/* Status line */}
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 40 }}>
                Raise ID · <span style={{ fontWeight: 600 }}>{raiseId}</span>
                {loading ? ' · Loading…' : ''}
                {error ? ` · ${error}` : ''}
            </div>

            {/* Buckets */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 24,
                }}
            >
                {BUCKETS.map((bucket) => (
                    <div key={bucket.key}>
                        <h3
                            style={{
                                fontSize: 13,
                                fontWeight: 500,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                opacity: 0.7,
                                marginBottom: 18,
                            }}
                        >
                            {bucket.label}
                        </h3>

                        {investors
                            .filter((i) => i.bucket === bucket.key)
                            .map((investor) => (
                                <InvestorCard key={investor.id} investor={investor} />
                            ))}
                    </div>
                ))}
            </div>
            {showAddInvestor && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 50,
                    }}
                >
                    <div
                        style={{
                            background: '#1a1f24',
                            color: '#f1f3f4',
                            borderRadius: 14,
                            width: 720,
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: 24,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                        }}
                    >
                        <h3 style={{ fontSize: 18, marginBottom: 16 }}>
                            Add Prospective Investor
                        </h3>

                        <div style={{ flex: 1, minHeight: 0 }}>
                            <AddProspectsModal
                                raiseId={raiseId}
                                onClose={() => setShowAddInvestor(false)}
                                onAdded={async () => {
                                    setShowAddInvestor(false);
                                    await reloadInvestors();
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddProspectsModal({
    raiseId,
    onClose,
    onAdded,
}: {
    raiseId: string;
    onClose: () => void;
    onAdded: () => Promise<void> | void;
}) {
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<ContactRow[]>([]);
    const [selected, setSelected] = useState<Record<string, ContactRow>>({});
    const [nextAfter, setNextAfter] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedCount = Object.keys(selected).length;

    type ContactSearchResponse = {
        ok: boolean;
        results: Array<{
            id: string;
            name?: string;
            email?: string;
            firstname?: string;
            lastname?: string;
        }>;
        nextAfter: string | null;
        error?: string;
        details?: string;
    };

    async function fetchContacts(opts: { reset: boolean }) {
        const { reset } = opts;
        try {
            setLoading(true);
            setError(null);

            const after = reset ? null : nextAfter;

            const url =
                `/api/hubspot/contacts/search?q=${encodeURIComponent(query)}&limit=25` +
                (after ? `&after=${encodeURIComponent(after)}` : '');

            const res = await fetch(url, { cache: 'no-store' });
            const json = (await res.json()) as ContactSearchResponse;

            if (!res.ok || json?.ok === false) {
                setError(json?.error ?? 'Failed to load contacts');
                return;
            }

            const mapped: ContactRow[] = (json.results ?? []).map((c) => ({
                id: String(c.id),
                name:
                    (c.name && c.name.trim()) ||
                    `${c.firstname ?? ''} ${c.lastname ?? ''}`.trim() ||
                    '—',
                email: (c.email ?? '').trim(),
            }));

            if (reset) {
                setRows(mapped);
            } else {
                setRows((prev) => [...prev, ...mapped]);
            }

            setNextAfter(json.nextAfter ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }
    const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function loadExisting() {
            const res = await fetch(`/api/raises/${raiseId}/prospective`, {
                cache: 'no-store',
            });
            if (!res.ok) return;

            const json = await res.json();
            const ids = new Set(
                (json?.prospects ?? []).map((p: any) => String(p.contact_id))
            );
            setExistingIds(ids);
        }

        loadExisting();
    }, [raiseId]);

    // Debounced search (also triggers initial load with empty query)
    useEffect(() => {
        if (!query.trim()) {
            setRows([]);
            setNextAfter(null);
            return;
        }

        const t = setTimeout(() => {
            fetchContacts({ reset: true });
        }, 250);

        return () => clearTimeout(t);
    }, [query]);


    function toggleRow(r: ContactRow) {
        setSelected((prev) => {
            const copy = { ...prev };
            if (copy[r.id]) delete copy[r.id];
            else copy[r.id] = r;
            return copy;
        });
    }

    function toggleAllVisible() {
        setSelected((prev) => {
            const copy = { ...prev };
            const allSelected = rows.length > 0 && rows.every((r) => !!copy[r.id]);

            if (allSelected) {
                rows.forEach((r) => delete copy[r.id]);
            } else {
                rows.forEach((r) => {
                    copy[r.id] = r;
                });
            }
            return copy;
        });
    }

    async function bulkSubscribe() {
        try {
            setSaving(true);
            setError(null);

            const contacts = Object.values(selected).map((c) => ({
                contactId: c.id,
                contactName: c.name,
                contactEmail: c.email,
            }));

            if (contacts.length === 0) return;

            const res = await fetch(
                `/api/hubspot/raises/${raiseId}/subscribe-batch`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contacts }),
                }
            );

            const contentType = res.headers.get('content-type') || '';

            if (!contentType.includes('application/json')) {
                // Server returned HTML (auth page, error page, etc.)
                const text = await res.text();
                console.error('Non-JSON response from subscribe-batch:', text);
                setError('Failed to add prospects. Please try again.');
                return;
            }

            const json = await res.json();

            if (!res.ok || json?.ok === false) {
                setError(json?.error ?? 'Failed to add prospects');
                return;
            }

            await onAdded();
            onClose();
        } catch (e: any) {
            console.error(e);
            setError('Failed to add prospects. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            {/* Search */}
            <input
                placeholder="Search HubSpot contacts by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'transparent',
                    color: '#f1f3f4',
                }}
            />
            {Object.keys(selected).length > 0 && (
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                    {Object.keys(selected).length} prospect
                    {Object.keys(selected).length > 1 ? 's' : ''} staged
                </div>
            )}
            {/* Error */}
            {error && (
                <div style={{ color: '#fb7185', fontSize: 12 }}>
                    {error}
                </div>
            )}

            {/* Top actions */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {rows.length > 0
                        ? `${selectedCount} selected on page`
                        : ''}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={toggleAllVisible}
                        style={{
                            background: 'transparent',
                            color: '#cfd4d8',
                            border: '1px solid rgba(255,255,255,0.18)',
                            borderRadius: 8,
                            fontSize: 12,
                            padding: '6px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        Select all on page
                    </button>

                    <button
                        onClick={bulkSubscribe}
                        disabled={selectedCount === 0 || saving}
                        style={{
                            background: '#ffffff',
                            color: '#000',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedCount === 0 ? 0.55 : 1,
                        }}
                    >
                        {saving ? 'Adding…' : 'Add selected as prospects'}
                    </button>
                </div>
            </div>

            {/* SCROLLABLE TABLE CONTAINER */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0, // 🔑 REQUIRED so flex children can scroll
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header row (fixed) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '44px 1.3fr 1.7fr',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: 12,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                        opacity: 0.8,
                        flexShrink: 0,
                    }}
                >
                    <div />
                    <div>Name</div>
                    <div>Email</div>
                </div>

                {/* Body (scrolls) */}
                <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 60 }}>
                    {rows.map((r) => {
                        const checked = !!selected[r.id];
                        const alreadyAdded = existingIds.has(r.id);

                        return (
                            <div
                                key={r.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '44px 1.3fr 1.7fr',
                                    padding: '10px 12px',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    alignItems: 'center',
                                    opacity: alreadyAdded ? 0.45 : 1,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    disabled={alreadyAdded}
                                    checked={checked}
                                    onChange={() => toggleRow(r)}
                                    style={{ width: 16, height: 16 }}
                                />

                                <div style={{ fontSize: 13 }}>
                                    {r.name || '—'}
                                    {alreadyAdded && (
                                        <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>
                                            Already added
                                        </span>
                                    )}
                                </div>

                                <div style={{ fontSize: 13, opacity: 0.85 }}>
                                    {r.email || '—'}
                                </div>
                            </div>
                        );
                    })}

                    {!loading && rows.length === 0 && (
                        <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>
                            No contacts found.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom actions */}
            <div
                style={{
                    position: 'sticky',
                    bottom: 0,
                    background: '#1a1f24',
                    paddingTop: 12,
                    marginTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 2,
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#cfd4d8',
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>

                <button
                    disabled={!nextAfter || loading}
                    onClick={() => fetchContacts({ reset: false })}
                    style={{
                        background: 'transparent',
                        color: '#cfd4d8',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 8,
                        fontSize: 12,
                        padding: '6px 10px',
                        cursor: !nextAfter ? 'not-allowed' : 'pointer',
                        opacity: !nextAfter ? 0.55 : 1,
                    }}
                >
                    {loading ? 'Loading…' : nextAfter ? 'Load more' : 'No more results'}
                </button>
            </div>

        </div>
    );
}