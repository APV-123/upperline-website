'use client';

import { useEffect, useState } from 'react';

type DealHighlight = {
    id?: string;
    title: string;
    description: string;
    display_order: number;
    is_visible: boolean;
};

type Props = {
    dealId: string;
    isMobile: boolean;
    isDark: boolean;
};

export default function DealHighlightsEditor({
    dealId,
    isMobile,
    isDark,
}: Props) {
    const [highlights, setHighlights] = useState<DealHighlight[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(
                    `/api/deals/${dealId}/highlights`
                );

                const json = await res.json();

                setHighlights(json.highlights ?? []);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [dealId]);
    function addHighlight() {
        setHighlights((prev) => [
            ...prev,
            {
                title: '',
                description: '',
                display_order: prev.length + 1,
                is_visible: true,
            },
        ]);
    }
    function updateHighlight(
        index: number,
        patch: Partial<DealHighlight>
    ) {
        setHighlights((prev) =>
            prev.map((h, i) =>
                i === index
                    ? { ...h, ...patch }
                    : h
            )
        );
    }
    function removeHighlight(index: number) {
        setHighlights((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }
    async function saveHighlights() {
        try {
            setSaving(true);

            const res = await fetch(
                `/api/deals/${dealId}/highlights/upsert`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        highlights,
                    }),
                }
            );

            const json = await res.json();

            if (!json.ok) {
                alert('Failed to save');
                return;
            }

            alert('Highlights saved');
        } catch (err) {
            console.error(err);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    }


    return (
        <div style={card}>
            <div style={cardHeader}>
                <div>
                    <h2 style={title}>Investment Highlights</h2>

                    <p style={subtitle}>
                        Manage the key reasons investors should care
                        about this opportunity.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={addHighlight}
                        style={secondaryBtn}
                    >
                        + Add Highlight
                    </button>

                    <button
                        onClick={saveHighlights}
                        disabled={saving}
                        style={primaryBtn}
                    >
                        {saving
                            ? 'Saving...'
                            : 'Save Highlights'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div>Loading highlights...</div>
            ) : (
                <div style={table}>
                    {highlights.map((h, index) => (
                        <div
                            key={h.id ?? index}
                            style={row}
                        >
                            <div style={field}>
                                <label style={label}>
                                    Title
                                </label>

                                <input
                                    value={h.title}
                                    onChange={(e) =>
                                        updateHighlight(
                                            index,
                                            {
                                                title:
                                                    e.target
                                                        .value,
                                            }
                                        )
                                    }
                                    style={input}
                                    placeholder="Strong Demographics"
                                />
                            </div>

                            <div style={field}>
                                <label style={label}>
                                    Description
                                </label>

                                <textarea
                                    value={h.description}
                                    onChange={(e) =>
                                        updateHighlight(
                                            index,
                                            {
                                                description:
                                                    e.target
                                                        .value,
                                            }
                                        )
                                    }
                                    style={textarea}
                                    placeholder="Average household income exceeds..."
                                />
                            </div>

                            <div style={actions}>
                                <label
                                    style={checkboxWrap}
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            h.is_visible
                                        }
                                        onChange={(e) =>
                                            updateHighlight(
                                                index,
                                                {
                                                    is_visible:
                                                        e
                                                            .target
                                                            .checked,
                                                }
                                            )
                                        }
                                    />

                                    Visible
                                </label>

                                <button
                                    onClick={() =>
                                        removeHighlight(
                                            index
                                        )
                                    }
                                    style={deleteBtn}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
};

const cardHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
};

const title: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
};

const subtitle: React.CSSProperties = {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
};

const table: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
};

const row: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
};

const field: React.CSSProperties = {
    marginBottom: 12,
};

const label: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: '#475569',
};

const input: React.CSSProperties = {
    width: '100%',
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
};

const textarea: React.CSSProperties = {
    width: '100%',
    minHeight: 80,
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
    resize: 'vertical',
};

const actions: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const checkboxWrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
};

const primaryBtn: React.CSSProperties = {
    background: '#1f3d36',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
    background: '#fff',
    color: '#1f3d36',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
};

const deleteBtn: React.CSSProperties = {
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
};