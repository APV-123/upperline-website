// src/components/deals/MetricsEditor.tsx
'use client';

import { useMemo, useState } from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';

export type DealMetric = {
    id?: string;
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
    isMobile: boolean;
    isDark: boolean;
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

export default function MetricsEditor({
    dealId,
    initialMetrics,
    isMobile,
    isDark,
}: Props) {
    const [rows, setRows] = useState<Row[]>(() => buildInitialRows(initialMetrics));
    const [saving, setSaving] = useState(false);
    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;

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

    function updateRow(id: string, patch: Partial<Row>) {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
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
    function moveRowUp(id: string) {
        setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === id);

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

    function moveRowDown(id: string) {
        setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === id);

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
    function deleteRow(id: string) {
        setRows((prev) =>
            prev.filter((r) => r.id !== id)
        );
    }
    function addMetric(section: string) {
        const id = crypto.randomUUID();

        setRows((prev) => [
            ...prev,
            {
                id,
                key: '',
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
        <div
            style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: isMobile ? 16 : 24,
            }}
        >
            <div style={cardHeader}>
                <div>
                    <h2
                        style={{
                            fontSize: 40,
                            fontWeight: 700,
                            margin: 0,
                            color: colors.text,
                        }}
                    >Investment Metrics</h2>
                    <p
                        style={{
                            fontSize: 13,
                            color: colors.subtext,
                            marginTop: 6,
                            marginBottom: 0,
                            maxWidth: 900,
                        }}
                    >
                        Control values and visibility for LP Summary, Project Returns, and Capital Stack.
                    </p>
                </div>

                <button
                    onClick={saveMetrics}
                    disabled={saving}
                    style={{
                        ...buttonStyle(colors),

                        background: `${colors.accent}20`,
                        color: colors.accent,
                        border: `1px solid ${colors.accent}`,

                        fontWeight: 600,

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
                    sectionKey={section}
                    heading={getSectionTitle(section)}
                    rows={grouped[section] ?? []}
                    isMobile={isMobile}
                    colors={colors}
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
    sectionKey,
    rows,
    isMobile,
    colors,
    onChange,
    onMoveUp,
    onMoveDown,
    onDelete,
    onAdd,
}: {
    heading: string;
    sectionKey: string;
    rows: Row[];
    isMobile: boolean;
    colors: typeof ADMIN_THEME.dark;
    onChange: (
        id: string,
        patch: Partial<Row>
    ) => void;

    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onDelete: (id: string) => void;
    onAdd: (section: string) => void;
}) {
    return (
        <div style={section}>
            <h3 style={sectionTitle}>{heading}</h3>

            <div style={table}>
                {rows.map((row) => (
                    <div key={row.id} style={rowWrap(isMobile)}>
                        <select
                            value={row.icon || ''}
                            onChange={(e) =>
                                onChange(row.id!, {
                                    icon: e.target.value,
                                })
                            }
                            style={inputStyle(colors)}
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
                                onChange(row.id!, {
                                    label: e.target.value,
                                })
                            }
                            placeholder="Metric Label"
                            style={inputStyle(colors)}
                        />

                        <input
                            value={row.value}
                            onChange={(e) => onChange(row.id!, { value: e.target.value })}
                            placeholder="Enter value"
                            style={inputStyle(colors)}
                        />
                        <select
                            value={row.section}
                            onChange={(e) =>
                                onChange(row.id!, {
                                    section: e.target.value,
                                })
                            }
                            style={inputStyle(colors)}
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
                        <label style={checkboxWrap(colors)}>
                            <input
                                type="checkbox"
                                checked={row.is_visible}
                                onChange={(e) => onChange(row.id!, { is_visible: e.target.checked })}
                            />
                            Visible
                        </label>

                        <div style={actionWrap}>
                            <button
                                onClick={() =>
                                    onMoveUp(row.id!)
                                }
                                style={buttonStyle(colors)}
                            >
                                ↑
                            </button>

                            <button
                                onClick={() =>
                                    onMoveDown(row.id!)
                                }
                                style={buttonStyle(colors)}
                            >
                                ↓
                            </button>

                            <button
                                onClick={() =>
                                    onDelete(row.id!)
                                }
                                style={{
                                    ...buttonStyle(colors),
                                    color: colors.subtext,
                                    width: 36,
                                    padding: 0,
                                }}
                            >
                                X
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={() =>
                    onAdd(sectionKey)
                }
                style={{
                    ...buttonStyle(colors),

                    color: colors.accent,
                    border: `1px solid ${colors.accent}`,

                    fontWeight: 600,

                    marginTop: 12,
                }}
            >
                + Add Metric
            </button>
        </div>
    );
}


const cardHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
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

const rowWrap = (
    isMobile: boolean
): React.CSSProperties => ({
    display: 'grid',

    gridTemplateColumns: isMobile
        ? '1fr'
        : '220px 1fr 180px 140px auto auto',

    gap: 12,
    alignItems: 'center',
});

const labelCell: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
};

const inputStyle = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    width: '100%',
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.input,
    color: colors.text,
    fontSize: 13,
});

const checkboxWrap = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: colors.subtext,
});


const actionWrap: React.CSSProperties = {
    display: 'flex',
    gap: 6,
};


const buttonStyle = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    cursor: 'pointer',
});