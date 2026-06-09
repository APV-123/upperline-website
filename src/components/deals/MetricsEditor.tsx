// src/components/deals/MetricsEditor.tsx
'use client';

import { useMemo, useState } from 'react';

export type DealMetric = {
    key: string;
    label: string;
    value?: string;
    section: string;
    icon?: string;
    display_order: number;
    is_visible?: boolean;
};

type MetricsResponse = {
    ok: boolean;
    error?: string;
};

type Props = {
    dealId: string;
    initialMetrics: DealMetric[];
};

type Row = DealMetric;

function buildInitialRows(
    initialMetrics: DealMetric[]
): Row[] {
    return [...initialMetrics].sort(
        (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
    );
}

export default function MetricsEditor({ dealId, initialMetrics }: Props) {
    const [rows, setRows] = useState<Row[]>(() => buildInitialRows(initialMetrics));
    const [saving, setSaving] = useState(false);

    const grouped = useMemo(() => {
        const groups: Record<string, Row[]> = {};

        rows.forEach((row) => {
            if (!groups[row.section]) {
                groups[row.section] = [];
            }

            groups[row.section].push(row);
        });

        return groups;
    }, [rows]);

    function updateRow(key: string, patch: Partial<Row>) {
        setRows((prev) =>
            prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
        );
    }

    async function saveMetrics() {
        try {
            setSaving(true);

            const payload = rows.map((row) => ({
                key: row.key,
                label: row.label,
                icon: row.icon,
                value: row.value?.trim() || null,
                section: row.section,
                display_order: row.display_order,
                is_visible: row.is_visible ?? true,
            }));

            const res = await fetch(`/api/deals/${dealId}/metrics/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metrics: payload }),
            });

            const text = await res.text();


            let json: MetricsResponse | null = null;

            try {
                json = JSON.parse(text) as MetricsResponse;
            }
            catch {
                console.error('[METRICS NON JSON RESPONSE]', text);
                alert('Unexpected server response while saving metrics');
                setSaving(false);
                return;
            }

            if (!res.ok || !json || !json.ok) {
                console.error('[METRICS SAVE FAILED]', json);
                alert(json?.error || 'Failed to save metrics');
                setSaving(false);
                return;
            }

            alert('Metrics saved');

        } catch (err) {
            console.error('[METRICS SAVE ERROR]', err);
            alert('Network error while saving metrics');
        } finally {
            setSaving(false);
        }
    }
    function moveRowUp(key: string) {
        setRows((prev) => {
            const idx = prev.findIndex((r) => r.key === key);

            if (idx <= 0) return prev;

            const copy = [...prev];

            [copy[idx - 1], copy[idx]] =
                [copy[idx], copy[idx - 1]];

            return copy.map((r, i) => ({
                ...r,
                display_order: i + 1,
            }));
        });
    }

    function moveRowDown(key: string) {
        setRows((prev) => {
            const idx = prev.findIndex((r) => r.key === key);

            if (idx === prev.length - 1) return prev;

            const copy = [...prev];

            [copy[idx], copy[idx + 1]] =
                [copy[idx + 1], copy[idx]];

            return copy.map((r, i) => ({
                ...r,
                display_order: i + 1,
            }));
        });
    }
    function deleteRow(key: string) {
        setRows((prev) =>
            prev.filter((r) => r.key !== key)
        );
    }
    function addMetric(section: string) {
        const id = crypto.randomUUID();

        setRows((prev) => [
            ...prev,
            {
                key: id,
                label: 'New Metric',
                value: '',
                section,
                display_order: prev.length + 1,
                is_visible: true,
            },
        ]);
    }
    const sectionOrder = [
        'hero',
        'property_facts',
        'lp_summary',
        'project_returns',
        'capital_stack',
    ];
    function getSectionTitle(
        section: string
    ) {
        switch (section) {
            case 'hero':
                return 'Hero Metrics';

            case 'property_facts':
                return 'Property Facts';

            case 'lp_summary':
                return 'LP Return Summary';

            case 'project_returns':
                return 'Project Returns';

            case 'capital_stack':
                return 'Capital Stack';

            default:
                return section;
        }
    }
    return (
        <div style={card}>
            <div style={cardHeader}>
                <div>
                    <h2 style={title}>Investment Metrics</h2>
                    <p style={subtitle}>
                        Control values and visibility for LP Summary, Project Returns, and Capital Stack.
                    </p>
                </div>

                <button
                    onClick={saveMetrics}
                    disabled={saving}
                    style={{
                        ...primaryBtn,
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? 'default' : 'pointer',
                    }}
                >
                    {saving ? 'Saving…' : 'Save Metrics'}
                </button>
            </div>

            {sectionOrder.map((section) => (
                <MetricSection
                    key={section}
                    heading={getSectionTitle(section)}
                    rows={grouped[section] ?? []}
                    onChange={updateRow}
                    onMoveUp={moveRowUp}
                    onMoveDown={moveRowDown}
                    onDelete={deleteRow}
                    onAdd={addMetric}
                />
            ))}
        </div>
    );
}
const ICON_OPTIONS = [
    '',
    'building',
    'percent',
    'vacancy',
    'car',
    'map',
    'users',
    'dollar',
    'warehouse',
];

function MetricSection({
    heading,
    rows,
    onChange,
    onMoveUp,
    onMoveDown,
    onDelete,
    onAdd,
}: {
    heading: string;
    rows: Row[];
    onChange: (
        key: string,
        patch: Partial<Row>
    ) => void;

    onMoveUp: (key: string) => void;
    onMoveDown: (key: string) => void;
    onDelete: (key: string) => void;
    onAdd: (section: string) => void;
}) {
    return (
        <div style={section}>
            <h3 style={sectionTitle}>{heading}</h3>

            <div style={table}>
                {rows.map((row) => (
                    <div key={row.key} style={rowWrap}>
                        <select
                            value={row.icon || ''}
                            onChange={(e) =>
                                onChange(row.key, {
                                    icon: e.target.value,
                                })
                            }
                            style={input}
                        >
                            {ICON_OPTIONS.map((icon) => (
                                <option
                                    key={icon}
                                    value={icon}
                                >
                                    {icon || 'No Icon'}
                                </option>
                            ))}
                        </select>
                        <input
                            value={row.label}
                            onChange={(e) =>
                                onChange(row.key, {
                                    label: e.target.value,
                                })
                            }
                            placeholder="Metric Label"
                            style={input}
                        />

                        <input
                            value={row.value}
                            onChange={(e) => onChange(row.key, { value: e.target.value })}
                            placeholder="Enter value"
                            style={input}
                        />
                        <select
                            value={row.section}
                            onChange={(e) =>
                                onChange(row.key, {
                                    section: e.target.value,
                                })
                            }
                            style={input}
                        >
                            <option value="hero">
                                Hero Metrics
                            </option>

                            <option value="property_facts">
                                Property Facts
                            </option>

                            <option value="lp_summary">
                                LP Return Summary
                            </option>

                            <option value="project_returns">
                                Project Returns
                            </option>

                            <option value="capital_stack">
                                Capital Stack
                            </option>
                        </select>
                        <label style={checkboxWrap}>
                            <input
                                type="checkbox"
                                checked={row.is_visible}
                                onChange={(e) => onChange(row.key, { is_visible: e.target.checked })}
                            />
                            Visible
                        </label>

                        <div style={actionWrap}>
                            <button
                                onClick={() =>
                                    onMoveUp(row.key)
                                }
                                style={miniBtn}
                            >
                                ↑
                            </button>

                            <button
                                onClick={() =>
                                    onMoveDown(row.key)
                                }
                                style={miniBtn}
                            >
                                ↓
                            </button>

                            <button
                                onClick={() =>
                                    onDelete(row.key)
                                }
                                style={deleteBtn}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={() =>
                    onAdd(
                        rows[0]?.section ?? 'hero'
                    )
                }
                style={secondaryBtn}
            >
                + Add Metric
            </button>
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
    gap: 16,
    marginBottom: 20,
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
    marginBottom: 0,
    maxWidth: 700,
};

const section: React.CSSProperties = {
    marginTop: 20,
};

const sectionTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
};

const table: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
};

const rowWrap: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '240px 1fr 180px 110px 180px',
    gap: 12,
    alignItems: 'center',
};

const labelCell: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
};

const input: React.CSSProperties = {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 13,
};

const checkboxWrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#334155',
};

const primaryBtn: React.CSSProperties = {
    background: '#1f3d36',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
};
const actionWrap: React.CSSProperties = {
    display: 'flex',
    gap: 6,
};

const miniBtn: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
};

const deleteBtn: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
    marginTop: 12,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
};