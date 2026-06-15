'use client';

import { useEffect, useState } from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';

export type CommunicationTemplate = {
    id: string;
    name: string;
    step_order: number;
    delay_days: number;
    subject: string;
    body: string;
    is_active: boolean;
};

type Props = {
    dealId: string;
    isMobile: boolean;
    isDark: boolean;
};

export default function CommunicationsEditor({
    dealId,
    isMobile,
    isDark,
}: Props) {
    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;

    const [templates, setTemplates] = useState<
        CommunicationTemplate[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] =
        useState<
            'idle' |
            'saving' |
            'saved'
        >('idle');

    const [tokens, setTokens] = useState<string[]>([]);

    useEffect(() => {
        async function loadTemplates() {
            try {
                const res = await fetch(
                    `/api/deals/${dealId}/communications`,
                    { cache: 'no-store' }
                );

                const json = await res.json();

                if (
                    res.ok &&
                    json.ok
                ) {
                    setTokens(
                        json.tokens ?? []
                    );
                    if (
                        json.templates?.length
                    ) {
                        setTemplates(
                            json.templates
                        );
                    } else {
                        setTemplates([
                            {
                                id: crypto.randomUUID(),
                                name: 'Initial Invite',
                                step_order: 1,
                                delay_days: 0,
                                subject: '',
                                body: '',
                                is_active: true,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: 'Follow Up #1',
                                step_order: 2,
                                delay_days: 7,
                                subject: '',
                                body: '',
                                is_active: true,
                            },
                        ]);
                    }
                }
            } catch (err) {
                console.error(
                    '[COMM LOAD]',
                    err
                );
            } finally {
                setLoading(false);
            }
        }

        loadTemplates();
    }, [dealId]);

    function prettifyToken(
        token: string
    ) {
        return token
            .split('_')
            .map(
                (w) =>
                    w.charAt(0).toUpperCase() +
                    w.slice(1)
            )
            .join(' ');
    }

    function updateTemplate(
        index: number,
        field: keyof CommunicationTemplate,
        value: string | number | boolean
    ) {
        setTemplates((prev) =>
            prev.map((t, i) =>
                i === index
                    ? {
                        ...t,
                        [field]: value,
                    }
                    : t
            )
        );
    }

    function addTemplate() {
        const defaultNames = [
            'Initial Invite',
            'Follow Up #1',
            'Follow Up #2',
            'Last Call',
        ];

        const defaultDelays = [
            0,
            7,
            14,
            30,
        ];

        setTemplates((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name:
                    defaultNames[prev.length] ??
                    `Step ${prev.length + 1}`,
                step_order: prev.length + 1,
                delay_days:
                    defaultDelays[prev.length] ?? 7,
                subject: '',
                body: '',
                is_active: true,
            },
        ]);
    }

    function removeTemplate(
        index: number
    ) {
        setTemplates((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        );
    }

    async function saveTemplates() {
        try {
            setSaving(true);

            const res = await fetch(
                `/api/deals/${dealId}/communications`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        templates,
                    }),
                }
            );

            const json =
                await res.json();

            if (
                !res.ok ||
                !json.ok
            ) {
                alert(
                    json.error ??
                    'Failed to save communications'
                );
            }
        } catch (err) {
            console.error(
                '[COMM SAVE]',
                err
            );

            alert(
                'Failed to save communications'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div
                style={{
                    color: colors.text,
                }}
            >
                Loading...
            </div>
        );
    }

    return (
        <div
            style={{
                background:
                    colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: isMobile
                    ? 16
                    : 24,
            }}
        >
            {/* Header */}

            <div
                style={{
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems:
                        isMobile
                            ? 'flex-start'
                            : 'center',
                    flexDirection:
                        isMobile
                            ? 'column'
                            : 'row',
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: 0,
                            color:
                                colors.text,
                            fontSize:
                                isMobile
                                    ? 40
                                    : 52,
                            fontWeight: 700,
                        }}
                    >
                        Communications
                    </h1>

                    <p
                        style={{
                            color:
                                colors.subtext,
                            marginTop: 8,
                        }}
                    >
                        Configure
                        communication
                        sequences and
                        follow-up
                        ladders for
                        this deal.
                    </p>
                </div>

                <button
                    onClick={
                        saveTemplates
                    }
                    disabled={saving}
                    style={{
                        background:
                            `${colors.accent}20`,
                        color:
                            colors.accent,
                        border: `1px solid ${colors.accent}`,
                        borderRadius: 12,
                        padding:
                            '12px 20px',
                        cursor:
                            'pointer',
                        fontWeight: 600,
                    }}
                >
                    {saving
                        ? 'Saving...'
                        : 'Save Communications'}
                </button>
            </div>

            {templates.map(
                (template, index) => (
                    <div
                        key={
                            template.id
                        }
                        style={{
                            border: `1px solid ${colors.border}`,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 20,
                            background:
                                colors.background,
                        }}
                    >
                        <div
                            style={{
                                display:
                                    'flex',
                                justifyContent:
                                    'space-between',
                                alignItems:
                                    'center',
                                marginBottom: 16,
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    color: colors.text,
                                    fontSize: 18,
                                    fontWeight: 700,
                                }}
                            >
                                {template.name ||
                                    `Step ${template.step_order}`}
                            </h3>

                            <button
                                onClick={() =>
                                    removeTemplate(
                                        index
                                    )
                                }
                                style={{
                                    border: `1px solid ${colors.border}`,
                                    background:
                                        'transparent',
                                    color:
                                        '#ef4444',
                                    borderRadius: 8,
                                    padding:
                                        '8px 12px',
                                    cursor:
                                        'pointer',
                                }}
                            >
                                Remove
                            </button>
                        </div>

                        <div
                            style={{
                                display:
                                    'grid',
                                gap: 12,
                            }}
                        >
                            <input
                                value={
                                    template.name
                                }
                                onChange={(
                                    e
                                ) =>
                                    updateTemplate(
                                        index,
                                        'name',
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Initial Invite"
                                style={inputStyle(
                                    colors
                                )}
                            />
                            <div
                                style={{
                                    color: colors.subtext,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                Wait After Previous Step (Days)
                            </div>
                            <input
                                type="number"
                                value={
                                    template.delay_days
                                }
                                onChange={(
                                    e
                                ) =>
                                    updateTemplate(
                                        index,
                                        'delay_days',
                                        Number(
                                            e
                                                .target
                                                .value
                                        )
                                    )
                                }
                                placeholder="Delay Days"
                                style={inputStyle(
                                    colors
                                )}
                            />
                            <div
                                style={{
                                    color: colors.subtext,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                Subject
                            </div>
                            <input
                                value={
                                    template.subject
                                }
                                onChange={(
                                    e
                                ) =>
                                    updateTemplate(
                                        index,
                                        'subject',
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Subject"
                                style={inputStyle(
                                    colors
                                )}
                            />
                            <div
                                style={{
                                    color: colors.subtext,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                Email Body
                            </div>
                            <textarea
                                rows={
                                    isMobile
                                        ? 8
                                        : 10
                                }
                                value={
                                    template.body
                                }
                                onChange={(
                                    e
                                ) =>
                                    updateTemplate(
                                        index,
                                        'body',
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Email body..."
                                style={{
                                    ...inputStyle(
                                        colors
                                    ),
                                    resize:
                                        'vertical',
                                }}
                            />
                            <div
                                style={{
                                    marginTop: 12,
                                    padding: 12,
                                    borderRadius: 8,
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        color: colors.subtext,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 8,
                                    }}
                                >
                                    Available Variables
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {[
                                        'first_name',
                                        'full_name',
                                        'opportunity_link',
                                        'bullet',
                                        ...tokens,
                                    ].map((v) => (
                                        <div
                                            key={v}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                background: `${colors.accent}20`,
                                                color: colors.accent,
                                                fontSize: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    opacity: 0.7,
                                                    marginBottom: 2,
                                                }}
                                            >
                                                {prettifyToken(v)}
                                            </div>

                                            <div>
                                                {`{{ ${v} }}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            <button
                onClick={addTemplate}
                style={{
                    background:
                        `${colors.accent}20`,
                    color:
                        colors.accent,
                    border: `1px solid ${colors.accent}`,
                    borderRadius: 12,
                    padding:
                        '12px 20px',
                    cursor:
                        'pointer',
                    fontWeight: 600,
                }}
            >
                + Add Step
            </button>
        </div>
    );
}

function inputStyle(
    colors: {
        surface: string;
        border: string;
        text: string;
    }
): React.CSSProperties {
    return {
        width: '100%',
        padding: '12px 14px',
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.text,
        boxSizing: 'border-box',
    };
}