'use client';

import { useEffect, useState } from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';

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

    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;

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
        <div
            style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: isMobile ? 16 : 20,
                marginTop: 24,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                    marginBottom: 20,
                    gap: 16,
                }}
            >
                <div>
                    <h2
                        style={{
                            fontSize: isMobile ? 24 : 40,
                            fontWeight: 700,
                            margin: 0,
                            color: colors.text,
                        }}
                    >Highlights</h2>

                    <p
                        style={{
                            fontSize: 13,
                            color: colors.subtext,
                            marginTop: 6,
                        }}
                    >
                        Manage the key reasons investors should care
                        about this opportunity.
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 12,
                    }}
                >
                    <button
                        onClick={addHighlight}
                        style={{
                            background: colors.surface,
                            color: colors.accent,
                            border: `1px solid ${colors.accent}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        + Add Highlight
                    </button>

                    <button
                        onClick={saveHighlights}
                        disabled={saving}
                        style={{
                            background: `${colors.accent}20`,
                            color: colors.accent,
                            border: `1px solid ${colors.accent}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
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
                            style={{
                                border: `1px solid ${colors.border}`,
                                background: colors.input,
                                borderRadius: 10,
                                padding: 20,
                            }}
                        >
                            <div
                                style={{
                                    marginBottom: 16,
                                }}
                            >
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 6,
                                        color: colors.subtext,
                                    }}
                                >
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
                                    style={{
                                        width: '100%',
                                        padding: 10,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        fontSize: 14,
                                        background: colors.input,
                                        color: colors.text,
                                    }}
                                    placeholder="Strong Demographics"
                                />
                            </div>

                            <div
                                style={{
                                    marginBottom: 16,
                                }}
                            >
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 6,
                                        color: colors.subtext,
                                    }}
                                >
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
                                    style={{
                                        width: '100%',
                                        minHeight: 80,
                                        padding: 10,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        fontSize: 14,
                                        resize: 'vertical',
                                        background: colors.input,
                                        color: colors.text,
                                    }}
                                    placeholder="Average household income exceeds..."
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 13,
                                        color: colors.text,
                                    }}
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
                                    style={{
                                        background: colors.surface,
                                        color: colors.subtext,
                                        fontSize: 13,
                                        fontWeight: 500,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const table: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
};