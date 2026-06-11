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
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuMode, setMenuMode] =
        useState<'main' | 'icon' | 'section'>(
            'main'
        );
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
                    menuMode={menuMode}
                    setMenuMode={setMenuMode}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
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
const SECTION_OPTIONS = [
    {
        key: 'hero',
        label: 'Hero Metrics',
    },
    {
        key: 'property_facts',
        label: 'Property Facts',
    },
    {
        key: 'lp_summary',
        label: 'LP Return Summary',
    },
    {
        key: 'project_returns',
        label: 'Project Returns',
    },
    {
        key: 'capital_stack',
        label: 'Capital Stack',
    },
];
function getIcon(icon?: string) {
    switch (icon) {
        case 'building':
            return '🏢';

        case 'percent':
            return '%';

        case 'vacancy':
            return '◫';

        case 'car':
            return '🚗';

        case 'map':
            return '📍';

        case 'users':
            return '👥';

        case 'dollar':
            return '$';

        case 'warehouse':
            return '▣';

        default:
            return '';
    }
}

function MetricSection({
    heading,
    sectionKey,
    rows,
    isMobile,
    colors,
    onChange,
    openMenuId,
    setOpenMenuId,
    menuMode,
    setMenuMode,
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
    openMenuId: string | null;
    setOpenMenuId: React.Dispatch<
        React.SetStateAction<string | null>
    >;
    menuMode: 'main' | 'icon' | 'section';

    setMenuMode: React.Dispatch<
        React.SetStateAction<
            'main' | 'icon' | 'section'
        >
    >;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onDelete: (id: string) => void;
    onAdd: (section: string) => void;
}) {
    return (
        <div style={section(colors)}>
            <div
                style={{
                    marginBottom: 20,
                }}
            >
                <h3 style={sectionTitle(colors)}>
                    {heading}
                </h3>


            </div>

            <div style={table}>
                {rows.map((row) => (
                    <div
                        key={row.id}
                        style={{
                            ...rowWrap(isMobile),
                            position: 'relative',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: colors.accent,
                                fontSize: 18,
                            }}
                        >
                            {getIcon(row.icon)}
                        </div>
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

                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => {
                                    setMenuMode('main');

                                    setOpenMenuId(
                                        openMenuId === row.id
                                            ? null
                                            : row.id!
                                    );
                                }}
                                style={{
                                    ...buttonStyle(colors),

                                    width: 36,
                                    height: 36,

                                    padding: 0,

                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                    fontSize: 18,
                                    fontWeight: 700,

                                    color: colors.subtext,
                                }}
                            >
                                ⋯
                            </button>

                            {openMenuId === row.id && (
                                <>
                                    {menuMode === 'main' && (

                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '110%',
                                                right: 0,
                                                minWidth: 220,
                                                background: colors.surface,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 8,
                                                padding: 8,
                                                zIndex: 100,
                                                boxShadow:
                                                    '0 10px 30px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <button
                                                onClick={() =>
                                                    onChange(row.id!, {
                                                        is_visible: !row.is_visible,
                                                    })
                                                }
                                                style={menuItem(colors)}
                                            >
                                                {row.is_visible
                                                    ? 'Hide Metric'
                                                    : 'Show Metric'}
                                            </button>
                                            <div
                                                style={{
                                                    height: 1,
                                                    background: colors.border,
                                                    margin: '6px 0',
                                                }}
                                            />
                                            <button
                                                onClick={() => onMoveUp(row.id!)}
                                                style={menuItem(colors)}
                                            >
                                                Move Up
                                            </button>

                                            <button
                                                onClick={() => onMoveDown(row.id!)}
                                                style={menuItem(colors)}
                                            >
                                                Move Down
                                            </button>
                                            <div
                                                style={{
                                                    height: 1,
                                                    background: colors.border,
                                                    margin: '6px 0',
                                                }}
                                            />
                                            <div
                                                style={{
                                                    padding: '8px 10px',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: '.04em',
                                                    color: colors.subtext,
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                Appearance
                                            </div>

                                            <button
                                                onClick={() =>
                                                    setMenuMode('icon')
                                                }
                                                style={menuItem(colors)}
                                            >
                                                Change Icon →
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setMenuMode('section')
                                                }
                                                style={menuItem(colors)}
                                            >
                                                Move To →
                                            </button>

                                            <div
                                                style={{
                                                    height: 1,
                                                    background: colors.border,
                                                    margin: '6px 0',
                                                }}
                                            />
                                            <button
                                                onClick={() =>
                                                    onDelete(row.id!)
                                                }
                                                style={{
                                                    ...menuItem(colors),
                                                    color: '#ef4444',
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                    {menuMode === 'icon' && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '110%',
                                                right: 0,
                                                minWidth: 220,
                                                background: colors.surface,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 8,
                                                padding: 8,
                                                zIndex: 100,
                                                boxShadow:
                                                    '0 10px 30px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <button
                                                onClick={() =>
                                                    setMenuMode('main')
                                                }
                                                style={menuItem(colors)}
                                            >
                                                ← Back
                                            </button>
                                            <div
                                                style={{
                                                    height: 1,
                                                    background: colors.border,
                                                    margin: '6px 0',
                                                }}
                                            />
                                            {ICON_OPTIONS.map((icon) => (
                                                <button
                                                    key={icon}
                                                    onClick={() => {
                                                        onChange(row.id!, {
                                                            icon,
                                                        });

                                                        setMenuMode('main');
                                                        setOpenMenuId(null);
                                                    }}
                                                    style={menuItem(colors)}
                                                >
                                                    {getIcon(icon)} {icon || 'No Icon'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {menuMode === 'section' && (

                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '110%',
                                                right: 0,
                                                minWidth: 220,
                                                background: colors.surface,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 8,
                                                padding: 8,
                                                zIndex: 100,
                                                boxShadow:
                                                    '0 10px 30px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <button
                                                onClick={() =>
                                                    setMenuMode('main')
                                                }
                                                style={menuItem(colors)}
                                            >
                                                ← Back
                                            </button>
                                            {SECTION_OPTIONS.map((section) => (
                                                <button
                                                    key={section.key}
                                                    onClick={() => {
                                                        onChange(row.id!, {
                                                            section: section.key,
                                                        });

                                                        setMenuMode('main');
                                                        setOpenMenuId(null);
                                                    }}
                                                    style={menuItem(colors)}
                                                >
                                                    {section.label}
                                                </button>
                                            ))}
                                            <div
                                                style={{
                                                    height: 1,
                                                    background: colors.border,
                                                    margin: '6px 0',
                                                }}
                                            />

                                        </div>
                                    )}                                    </>
                            )}

                        </div>
                    </div>
                ))}
            </div>
            <div
                style={{
                    marginTop: 24,
                }}
            >
                <button
                    onClick={() => onAdd(sectionKey)}
                    style={{
                        ...buttonStyle(colors),
                        color: colors.accent,
                        border: `1px solid ${colors.accent}`,
                        fontWeight: 600,
                    }}
                >
                    + Add Metric
                </button>

            </div>
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


const section = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    marginTop: 40,
    paddingTop: 32,
    borderTop: `1px solid ${colors.border}`,
});

const sectionTitle = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: colors.text,
});

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
        : '40px minmax(350px,1.8fr) 190px 36px',

    gap: 12,
    alignItems: 'center',
});

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

const menuItem = (
    colors: typeof ADMIN_THEME.dark
): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    color: colors.text,
    cursor: 'pointer',
    borderRadius: 6,
});