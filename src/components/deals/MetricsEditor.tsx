// src/components/deals/MetricsEditor.tsx
'use client';

import { useMemo, useState } from 'react';

export type DealMetric = {
    key: string;
    value?: string;
    section: string;
    display_order: number;
    is_visible?: boolean;
};

type MetricTemplate = {
    key: string;
    label: string;
    section: string;
    display_order: number;
};

type MetricsResponse = {
    ok: boolean;
    error?: string;
};

const METRIC_TEMPLATES: MetricTemplate[] = [
    // LP Return Summary
    { key: 'lp_irr', label: 'LP IRR', section: 'lp_summary', display_order: 1 },
    { key: 'lp_moic', label: 'LP Equity Multiple (MOIC)', section: 'lp_summary', display_order: 2 },
    { key: 'minimum_investment', label: 'Minimum Investment', section: 'lp_summary', display_order: 3 },
    { key: 'lp_cash_on_cash', label: 'Cash-on-Cash Return', section: 'lp_summary', display_order: 4 },

    // Project Returns
    { key: 'project_unlevered_irr', label: 'Project Unlevered IRR', section: 'project_returns', display_order: 1 },
    { key: 'project_levered_irr', label: 'Project Levered IRR', section: 'project_returns', display_order: 2 },
    { key: 'untrended_return_on_cost', label: 'Un-Trended Return on Cost', section: 'project_returns', display_order: 3 },
    { key: 'stabilized_return_on_cost', label: 'Stabilized Return on Cost', section: 'project_returns', display_order: 4 },

    // Equity Capital Stack
    { key: 'gp_equity', label: 'GP Equity', section: 'capital_stack', display_order: 2 },
    { key: 'total_equity', label: 'Total Equity', section: 'capital_stack', display_order: 3 },
];

type Row = MetricTemplate & {
    value: string;
    is_visible: boolean;
};

type Props = {
    dealId: string;
    initialMetrics: DealMetric[];
};

function buildInitialRows(initialMetrics: DealMetric[]): Row[] {
    const metricMap = new Map(initialMetrics.map((m) => [m.key, m]));

    return METRIC_TEMPLATES.map((tpl) => {
        const existing = metricMap.get(tpl.key);

        return {
            ...tpl,
            value: existing?.value ?? '',
            is_visible: existing?.is_visible !== false,
        };
    });
}

export default function MetricsEditor({ dealId, initialMetrics }: Props) {
    const [rows, setRows] = useState<Row[]>(() => buildInitialRows(initialMetrics));
    const [saving, setSaving] = useState(false);

    const grouped = useMemo(() => {
        return {
            lp_summary: rows.filter((r) => r.section === 'lp_summary'),
            project_returns: rows.filter((r) => r.section === 'project_returns'),
            capital_stack: rows.filter((r) => r.section === 'capital_stack'),
        };
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
                value: row.value.trim() || null,
                section: row.section,
                display_order: row.display_order,
                is_visible: row.is_visible,
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

            <MetricSection
                heading="LP Return Summary"
                rows={grouped.lp_summary}
                onChange={updateRow}
            />

            <MetricSection
                heading="Project Returns"
                rows={grouped.project_returns}
                onChange={updateRow}
            />

            <MetricSection
                heading="Equity Capital Stack"
                rows={grouped.capital_stack}
                onChange={updateRow}
            />
        </div>
    );
}

function MetricSection({
    heading,
    rows,
    onChange,
}: {
    heading: string;
    rows: Row[];
    onChange: (key: string, patch: Partial<Row>) => void;
}) {
    return (
        <div style={section}>
            <h3 style={sectionTitle}>{heading}</h3>

            <div style={table}>
                {rows.map((row) => (
                    <div key={row.key} style={rowWrap}>
                        <div style={labelCell}>{row.label}</div>

                        <input
                            value={row.value}
                            onChange={(e) => onChange(row.key, { value: e.target.value })}
                            placeholder="Enter value"
                            style={input}
                        />

                        <label style={checkboxWrap}>
                            <input
                                type="checkbox"
                                checked={row.is_visible}
                                onChange={(e) => onChange(row.key, { is_visible: e.target.checked })}
                            />
                            Visible
                        </label>
                    </div>
                ))}
            </div>
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
    gridTemplateColumns: '240px 1fr 100px',
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