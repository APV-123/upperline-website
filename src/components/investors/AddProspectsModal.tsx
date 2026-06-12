'use client';

import {
    useState,
    useEffect,
    useCallback,
} from 'react';

type ContactRow = {
    id: string;        // HubSpot contactId
    name: string;
    email: string;
};

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

type ExistingProspect = {
    contact_id: string | number;
};

export default function AddProspectsModal({
    dealId,
    onClose,
    onAdded,
}: {
    dealId: string;
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


    const fetchContacts = useCallback(
        async (opts: { reset: boolean }) => {
            const { reset } = opts;

            try {
                setLoading(true);
                setError(null);

                const after = reset ? null : nextAfter;

                // ✅ FIX: remove &amp; → must be real &
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

            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to load contacts';
                setError(message);
            } finally {
                setLoading(false);
            }
        },
        [query, nextAfter] // ✅ dependencies
    );

    const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function loadExisting() {
            if (!dealId) return;

            const res = await fetch(`/api/deals/${dealId}/prospects`, {
                cache: 'no-store',
            });
            if (!res.ok) return;

            const json = await res.json();

            const ids = new Set<string>(
                (json?.prospects ?? []).map((p: ExistingProspect) => String(p.contact_id))
            );

            setExistingIds(ids);
        }

        loadExisting();
    }, [dealId]);

    // Debounced search (also triggers initial load with empty query)
    useEffect(() => {
        if (!query.trim()) return;

        const timeout = setTimeout(() => {
            fetchContacts({ reset: true });
        }, 250);

        return () => clearTimeout(timeout);
    }, [query, fetchContacts]);



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


            const res = await fetch(`/api/deals/${dealId}/subscribe-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts }),
            });


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
        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Failed to add prospects. Please try again.';
            setError(message);
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