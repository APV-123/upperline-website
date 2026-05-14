'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    HUBSPOT_DEAL_STAGES,
    STAGE_LABEL_TO_ID,
} from '@/lib/hubspotStages';
import { FileX } from 'lucide-react';

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
    stageId?: string | null;
    dealId?: string;
    contactId?: string | null;
};
type ContactRow = {
    id: string;        // HubSpot contactId
    name: string;
    email: string;
};
type ProspectRow = {
    id: string;
    raise_id: string;
    contact_id: string;
    contact_name: string | null;
    contact_email: string | null;
    status: string | null;

    invite_status: string | null;
    invite_subject: string | null;
    invite_body: string | null;
    invite_method: string | null;

    created_at: string | null;
    invited_at: string | null;
    declined_at: string | null;
};

type HubSpotActivity = {
    id: string;
    type: 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE' | 'TASK';
    subject?: string | null;
    preview?: string | null;
    timestamp: string; // ISO string
    ownerName?: string | null;
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
// ✅ Stage-aware action rules (BUSINESS LOGIC, not UI)
function getAllowedActions(stageId?: string | null) {
    if (!stageId) return [];

    switch (stageId) {
        case STAGE_LABEL_TO_ID['Introduced']:
            return ['engaged', 'pass'] as const;

        case STAGE_LABEL_TO_ID['Engaged']:
        case STAGE_LABEL_TO_ID['Soft Interest']:
        case STAGE_LABEL_TO_ID['Docs / IC Review']:
            return ['commit', 'revert', 'pass'] as const;

        case STAGE_LABEL_TO_ID['Committed']:
            return ['fund', 'pass'] as const;

        default:
            return [];
    }
}
function getStageAccent(bucket: Bucket) {
    switch (bucket) {
        case 'committed':
            return '#22c55e'; // green
        case 'passed':
            return '#ef4444'; // red
        default:
            return '#3b82f6'; // blue
    }
}
function InvestorCard({
    investor,
    onOpen,
    onQuickStage,
}: {
    investor: Investor;
    onOpen: () => void;
    onQuickStage: (stageId: string) => void;
}) {
    const isNeedsTouch = investor.bucket === 'needs_touch';
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div
            onClick={onOpen}
            style={{
                background: '#1a1f24',
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
                color: '#f1f3f4',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `4px solid ${getStageAccent(investor.bucket)}`,
                boxShadow: isNeedsTouch ? '0 0 0 2px rgba(225,29,72,0.35)' : 'none',
                cursor: 'pointer',
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                {investor.name}
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                {investor.email || '—'}
                {investor.stageLabel ? ` · ${investor.stageLabel}` : ''}
            </div>

            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 10 }}>
                ${investor.amount.toLocaleString()}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((v) => !v);
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: '#e5e7eb',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            padding: '6px 12px',
                            cursor: 'pointer',
                        }}
                    >
                        Actions ▾
                    </button>

                    {menuOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: '110%',
                                background: '#0f1317',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 10,
                                padding: 6,
                                minWidth: 170,
                                zIndex: 20,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                        >
                            {(() => {
                                const actions = getAllowedActions(investor.stageId);

                                return (
                                    <>
                                        {/* Workflow (stubbed for now) */}
                                        <MenuItem label="Send Terms" disabled />
                                        <MenuItem label="Nudge" disabled />
                                        <MenuItem label="Approve" disabled />

                                        <Divider />

                                        {/* Pipeline transitions */}
                                        {actions.includes('engaged') && (
                                            <MenuItem
                                                label="Mark Engaged"
                                                onClick={() => {
                                                    onQuickStage(STAGE_LABEL_TO_ID['Engaged']);
                                                    setMenuOpen(false);
                                                }}

                                            />
                                        )}

                                        {actions.includes('commit') && (
                                            <MenuItem
                                                label="Mark Committed"
                                                onClick={() => {
                                                    onQuickStage(STAGE_LABEL_TO_ID['Committed']);
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('fund') && (
                                            <MenuItem
                                                label="Mark Funded"
                                                onClick={() => {
                                                    onQuickStage(STAGE_LABEL_TO_ID['Funded']);
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('revert') && (
                                            <MenuItem
                                                label="↩ Revert to Introduced"
                                                tone="warning"
                                                onClick={() => {
                                                    onQuickStage(STAGE_LABEL_TO_ID['Introduced']);
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {actions.includes('pass') && (
                                            <MenuItem
                                                label="Pass Investor"
                                                tone="danger"
                                                onClick={() => {
                                                    onQuickStage(STAGE_LABEL_TO_ID['Passed']);
                                                    setMenuOpen(false);
                                                }}
                                            />
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
function Divider() {
    return (
        <div
            style={{
                height: 1,
                background: 'rgba(255,255,255,0.08)',
                margin: '6px 0',
            }}
        />
    );
}

function MenuItem({
    label,
    onClick,
    disabled,
    tone = 'default',
}: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    tone?: 'default' | 'warning' | 'danger';
}) {
    const color =
        tone === 'danger'
            ? '#fb7185'
            : tone === 'warning'
                ? '#fbbf24'
                : '#e5e7eb';

    return (
        <button
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();   // ✅ THIS is the key line
                onClick?.();
            }}
            style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                color,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                borderRadius: 6,
            }}
        >
            {label}
        </button>
    );
}

export default function DealInvestorsPage() {
    //===========================================
    //Primary data (read-only)
    //===========================================
    const [rows, setRows] = useState<ApiInvestorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    //Prospective investors (Supabase)
    const [prospects, setProspects] = useState<ProspectRow[]>([]);
    const [loadingProspects, setLoadingProspects] = useState(false);

    //Active context
    const [activeInvestor, setActiveInvestor] = useState<Investor | null>(null);

    // HubSpot activity timeline (read)
    const [activity, setActivity] = useState<HubSpotActivity[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);

    //============================================
    // UI State / interaction state
    //============================================
    const [commitAmount, setCommitAmount] = useState<number | null>(null);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);

    const [isSliderExpanded, setIsSliderExpanded] = useState(false);
    const [openActivityId, setOpenActivityId] = useState<string | null>(null);

    const [showInviteDraft, setShowInviteDraft] = useState(false);
    const [activeProspect, setActiveProspect] = useState<ProspectRow | null>(null);

    // =======================
    // HubSpot writes (mutations)
    // =======================
    // Internal notes
    const [noteDraft, setNoteDraft] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    async function handleSaveNote() {
        if (!activeInvestor?.contactId) return;

        const body = noteDraft.trim();
        if (!body) return;

        setSavingNote(true);
        setNoteDraft('');

        // Optimistic insert into Activity feed
        const optimisticNote: HubSpotActivity = {
            id: `note-${Date.now()}`,
            type: 'NOTE',
            subject: 'Internal note',
            preview: body,
            timestamp: new Date().toISOString(),
            ownerName: 'You',
        };

        setActivity((prev) => [optimisticNote, ...prev]);

        try {
            await fetch(`/api/hubspot/contacts/${activeInvestor.contactId}/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body }),
            });
        } catch (e) {
            // Optional: rollback or surface error later
            console.error('Failed to save note', e);
        } finally {
            setSavingNote(false);
        }
    }
    function openInviteDraft(p: ProspectRow) {
        setActiveProspect(p);
        setShowInviteDraft(true);
    }
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
    async function loadProspects() {
        setLoadingProspects(true);
        try {
            const res = await fetch(`/api/raises/${raiseId}/prospective`, {
                cache: 'no-store',
            });
            const json = await res.json();
            if (res.ok && json?.ok) {
                setProspects(json.prospects ?? []);
            }
        } finally {
            setLoadingProspects(false);
        }
    }
    async function loadContactActivity(contactId: string) {
        setLoadingActivity(true);
        setActivityError(null);

        try {
            const res = await fetch(
                `/api/hubspot/contacts/${contactId}/activity`,
                { cache: 'no-store' }
            );

            const json = await res.json().catch(() => ({} as any));

            if (!res.ok || json?.ok === false) {
                setActivity([]);
                setActivityError(json?.error ?? 'Failed to load activity');
                return;
            }

            setActivity(json.activities ?? []);
        } catch (e: any) {
            setActivity([]);
            setActivityError(e?.message ?? 'Failed to load activity');
        } finally {
            setLoadingActivity(false);
        }
    }
    useEffect(() => {
        let alive = true;

        async function loadAll() {
            if (!alive) return;

            await Promise.all([
                reloadInvestors(),
                loadProspects(),
            ]);
        }

        loadAll();

        return () => {
            alive = false;
        };
    }, [raiseId]);

    useEffect(() => {
        if (!activeInvestor) return;
        setOpenActivityId(null);
        setCommitAmount(activeInvestor.amount);
        setSelectedStageId(activeInvestor.stageId ?? null);

        // ✅ Load HubSpot activity timeline for this deal
        if (activeInvestor.contactId) {
            loadContactActivity(activeInvestor.contactId);
        } else {
            setActivity([]);
            setActivityError(null);
        }
    }, [activeInvestor]);
    const investors: Investor[] = useMemo(() => {
        return rows.map((r) => {
            const lastActivity =
                r.hs_lastactivitydate
                    ? formatDateMaybe(r.hs_lastactivitydate)
                    : formatDateMaybe(r.hs_lastmodifieddate);

            return {
                id: r.dealId,
                dealId: r.dealId,
                contactId: r.contactId,
                name: r.investorName,
                email: r.investorEmail,
                amount: Number(r.amount ?? 0),
                bucket: r.bucket,
                lastActivity,
                stageLabel: r.dealstageLabel,
                stageId: r.dealstageLabel
                    ? STAGE_LABEL_TO_ID[r.dealstageLabel]
                    : null,
            };
        });
    }, [rows]);

    const committedTotal = useMemo(() => {
        return investors
            .filter((i) => i.bucket === 'committed')
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }, [investors]);


    const [showAddInvestor, setShowAddInvestor] = useState(false);

    function optimisticAddInvestorDeal(p: ProspectRow, dealId: string) {
        const optimistic: ApiInvestorRow = {
            dealId: dealId,
            contactId: p.contact_id,
            investorName: p.contact_name ?? 'Unnamed Contact',
            investorEmail: p.contact_email ?? null,
            amount: 250000, // your default invite amount
            dealstage: 'Introduced',       // not critical; just display
            dealstageLabel: 'Introduced',  // what your card shows
            bucket: 'needs_touch',         // force it to appear immediately
            pipeline: null,
            raise_id: raiseId,
            hs_lastactivitydate: null,
            hs_lastmodifieddate: new Date().toISOString(),
        };

        setRows((prev) => {
            // avoid duplicates if we already inserted this deal
            const filtered = prev.filter((r) => r.dealId !== dealId);
            return [optimistic, ...filtered];
        });
    }
    // ✅ Shortcut for stage transitions from Action menu
    function quickStageChange(investor: Investor, stageId: string) {
        if (isUpdatingStage) return;

        setIsUpdatingStage(true);

        setTimeout(async () => {
            await handleUpdateStageForInvestor(investor, stageId);
            setIsUpdatingStage(false);
        }, 0);
    }

    async function handleUpdateStageForInvestor(
        investor: Investor,
        stageId: string
    ) {
        if (!investor.dealId) return;

        // optimistic update
        setRows(prev =>
            prev.map(r =>
                r.dealId === investor.dealId
                    ? {
                        ...r,
                        dealstageLabel:
                            HUBSPOT_DEAL_STAGES.find(s => s.id === stageId)?.label ??
                            r.dealstageLabel,
                        bucket: bucketFromStage(stageId),
                    }
                    : r
            )
        );

        await fetch(`/api/hubspot/deals/${investor.dealId}/update-stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stageId,
                amount: investor.amount,
            }),
        });

        setTimeout(() => reloadInvestors(), 1500);
    }

    async function handleUpdateStage() {
        if (!activeInvestor || !selectedStageId) return;

        const dealId = activeInvestor.dealId;
        if (!dealId || isUpdatingStage) return;

        // 🚨 Guardrails for destructive / terminal stages
        const terminalStages = [
            '3604434679', // Passed
            '3604426446', // Deferred / Recycle
            '3604434678', // Funded
        ];

        const nextStageLabel =
            HUBSPOT_DEAL_STAGES.find((s) => s.id === selectedStageId)?.label ??
            'this stage';

        if (
            terminalStages.includes(selectedStageId) &&
            !confirm(
                `Are you sure you want to move ${activeInvestor.name} to "${nextStageLabel}"?`
            )
        ) {
            return;
        }

        setIsUpdatingStage(true);

        // ✅ Optimistic UI update
        setRows((prev) =>
            prev.map((r) =>
                r.dealId === dealId
                    ? {
                        ...r,
                        amount: commitAmount ?? r.amount,
                        bucket: bucketFromStage(selectedStageId),
                        dealstageLabel:
                            HUBSPOT_DEAL_STAGES.find((s) => s.id === selectedStageId)?.label ??
                            r.dealstageLabel,
                    }
                    : r
            )
        );

        // Close detail panel immediately (fast feel)
        setActiveInvestor(null);

        try {
            await fetch(`/api/hubspot/deals/${dealId}/update-stage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stageId: selectedStageId,
                    amount: commitAmount,
                }),
            });
        } finally {
            setIsUpdatingStage(false);
        }

        // ✅ Reconcile with source of truth
        setTimeout(() => reloadInvestors(), 1500);
    }
    function bucketFromStage(stageId: string): Bucket {
        if (['3604434677', '3604434678'].includes(stageId)) return 'committed';
        if (['3604434679', '3604426446'].includes(stageId)) return 'passed';
        return 'circling';
    }
    const hasStageChange =
        !!selectedStageId && selectedStageId !== activeInvestor?.stageId;

    const hasAmountChange =
        commitAmount != null && commitAmount !== activeInvestor?.amount;

    const canUpdate = Boolean(hasStageChange || hasAmountChange);

    const CLAMP_3: React.CSSProperties = {
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    };



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
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 24,
                }}
            >
                <div>
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
                        Prospective
                    </h3>

                    {loadingProspects && (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Loading…</div>
                    )}

                    {!loadingProspects && prospects.length === 0 && (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>
                            No prospective investors yet.
                        </div>
                    )}

                    {prospects.map((p) => (
                        <div
                            key={p.id}
                            style={{
                                background: '#1a1f24',
                                borderRadius: 14,
                                padding: 16,
                                marginBottom: 16,
                                color: '#f1f3f4',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                                {p.contact_name || 'Unnamed Contact'}
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 12 }}>
                                {p.contact_email || '—'}
                            </div>

                            {/* Draft status line */}
                            {p.invite_status === 'draft_ready' && (
                                <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
                                    Draft ready
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    style={{
                                        background: 'transparent',
                                        color: '#cfd4d8',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => openInviteDraft(p)}
                                >
                                    {p.invite_status === 'draft_ready' ? 'Edit Draft' : 'Draft Invite'}
                                </button>

                                {/* Send invite: marks prospect as invited and creates HubSpot deal (optimistic UI) */}
                                <button
                                    disabled={p.invite_status !== 'draft_ready'}
                                    style={{
                                        background: 'transparent',
                                        color: '#cfd4d8',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        padding: '6px 10px',
                                        cursor: p.invite_status === 'draft_ready' ? 'pointer' : 'not-allowed',
                                        opacity: p.invite_status === 'draft_ready' ? 1 : 0.45,
                                    }}
                                    onClick={async () => {
                                        if (!confirm('Mark invite as sent and move investor into pipeline?')) return;

                                        // 1) Mark invited in Supabase
                                        const sendRes = await fetch(
                                            `/api/raises/${raiseId}/prospective/${p.id}/send`,
                                            { method: 'POST' }
                                        );

                                        const sendJson = await sendRes.json().catch(() => ({} as any));
                                        if (!sendRes.ok || (sendJson as any)?.ok === false) {
                                            alert((sendJson as any)?.error ?? 'Failed to mark invite as sent');
                                            return;
                                        }

                                        // 2) Create HubSpot deal
                                        const hubspotRes = await fetch(`/api/hubspot/raises/${raiseId}/add-investor`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                contactId: p.contact_id,
                                                amount: 250000,
                                                investorName: p.contact_name,
                                            }),
                                        });

                                        const hubspotJson = await hubspotRes.json().catch(() => ({} as any));
                                        if (!hubspotRes.ok || (hubspotJson as any)?.ok === false) {
                                            alert((hubspotJson as any)?.error ?? 'Failed to create HubSpot deal');
                                            return;
                                        }

                                        const dealId = (hubspotJson as any)?.dealId;
                                        if (dealId) {
                                            // ✅ 3) Optimistically render immediately in Needs Touch
                                            optimisticAddInvestorDeal(p, dealId);
                                        }

                                        // 4) Refresh Prospective (removes invited from that list)
                                        await loadProspects();

                                        // 5) Background reconcile — HubSpot read may lag, so retry once or twice
                                        setTimeout(() => reloadInvestors(), 1500);
                                        setTimeout(() => reloadInvestors(), 4000);
                                    }}
                                >
                                    Send
                                </button>


                                <button
                                    style={{
                                        background: 'transparent',
                                        color: '#fb7185',
                                        border: '1px solid rgba(251,113,133,0.35)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                    }}
                                    onClick={async () => {
                                        await fetch(`/api/raises/${raiseId}/prospective/${p.id}`, { method: 'DELETE' });
                                        await loadProspects();
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
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
                                <InvestorCard
                                    key={investor.id}
                                    investor={investor}
                                    onOpen={() => setActiveInvestor(investor)}
                                    onQuickStage={(stageId) => quickStageChange(investor, stageId)}
                                />
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
                                    await loadProspects(); //refresh the queue from Supabase
                                    setShowAddInvestor(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {
                showInviteDraft && activeProspect && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 60,
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
                                Draft Invite Email
                            </h3>

                            <div style={{ flex: 1, minHeight: 0 }}>
                                <InviteDraftForm
                                    raiseId={raiseId}
                                    prospect={activeProspect}
                                    onClose={() => {
                                        setShowInviteDraft(false);
                                        setActiveProspect(null);
                                    }}
                                    onSaved={async () => {
                                        await loadProspects();
                                        setShowInviteDraft(false);
                                        setActiveProspect(null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
            {activeInvestor && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: isSliderExpanded ? 720 : 420,
                        height: '100vh',
                        background: '#0f1317',
                        borderLeft: '1px solid rgba(255,255,255,0.12)',
                        zIndex: 50,
                        boxShadow: '-12px 0 32px rgba(0,0,0,0.5)',
                        color: '#f1f3f4',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'width 180ms ease',
                    }}
                >
                    <div
                        style={{
                            padding: 20,
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                            }}
                        >
                            <h3 style={{ margin: 0 }}>{activeInvestor.name}</h3>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setIsSliderExpanded(v => !v)}
                                    title={isSliderExpanded ? 'Collapse panel' : 'Expand panel'}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        borderRadius: 6,
                                        color: '#f1f3f4',
                                        cursor: 'pointer',
                                        padding: '2px 6px',
                                        fontSize: 12,
                                    }}
                                >
                                    {isSliderExpanded ? '⤡' : '⤢'}
                                </button>

                                <button
                                    onClick={() => {
                                        setIsSliderExpanded(false);
                                        setActiveInvestor(null);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f1f3f4',
                                        fontSize: 16,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div>{activeInvestor.email}</div>
                        <div>Stage: {activeInvestor.stageLabel}</div>
                        <div>Amount: ${activeInvestor.amount.toLocaleString()}</div>
                        {/* Snapshot: last interaction */}
                        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.8 }}>
                            <div>
                                <strong>Last interaction:</strong> {activeInvestor.lastActivity || '—'}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: 20,
                        }}
                    >
                        {/* Activity timeline */}
                        <div style={{ marginTop: 18 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                Activity
                            </div>
                            {/*============================
                                Log internal note (Hubspot write)
                            ===============================*/}

                            <div
                                style={{
                                    marginBottom: 16,
                                    padding: 12,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.02)',
                                }}
                            >
                                <textarea
                                    placeholder="Log internal note…"
                                    value={noteDraft}
                                    onChange={(e) => setNoteDraft(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        resize: 'none',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f1f3f4',
                                        fontSize: 13,
                                        outline: 'none',
                                        lineHeight: 1.4,
                                    }}
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        marginTop: 8,
                                    }}
                                >
                                    <button
                                        disabled={!noteDraft.trim() || savingNote}
                                        onClick={handleSaveNote}
                                        style={{
                                            fontSize: 12,
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            background: savingNote ? '#374151' : '#2563eb',
                                            color: '#fff',
                                            cursor: savingNote ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {savingNote ? 'Saving…' : 'Save note'}
                                    </button>
                                </div>
                            </div>

                            {loadingActivity && (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>Loading activity…</div>
                            )}

                            {!loadingActivity && activityError && (
                                <div style={{ fontSize: 12, color: '#fb7185' }}>{activityError}</div>
                            )}

                            {!loadingActivity && !activityError && activity.length === 0 && (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>No activity found.</div>
                            )}
                            {/*===========================
                                Activity feed (read-only)
                            ==============================*/}
                            {!loadingActivity && activity.map((a) => {
                                const isEmail = a.type === 'EMAIL';
                                const isOpen = openActivityId === a.id;

                                return (
                                    <div
                                        key={a.id}
                                        onClick={() => {
                                            if (!isEmail) return;

                                            // Toggle this email open/closed
                                            setOpenActivityId(prev => (prev === a.id ? null : a.id));

                                            // If panel is compact, expand it for reading
                                            if (!isSliderExpanded) setIsSliderExpanded(true);
                                        }}
                                        style={{
                                            borderLeft: '2px solid rgba(255,255,255,0.12)',
                                            paddingLeft: 10,
                                            marginBottom: 12,
                                            cursor: isEmail ? 'pointer' : 'default',
                                            opacity: isEmail ? 1 : 0.65,
                                            background: isEmail && !isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
                                            transition: 'background 120ms ease',
                                        }}
                                    >
                                        {/* Header row */}
                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span>
                                                {a.type}
                                                {a.ownerName ? ` · ${a.ownerName}` : ''}
                                            </span>

                                            {isEmail && (
                                                <span style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.3px' }}>
                                                    {isOpen ? 'Hide' : 'Open'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                                            {new Date(a.timestamp).toLocaleString()}
                                        </div>

                                        {/* Subject */}
                                        {a.subject && (
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    marginTop: 4,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {a.subject}
                                            </div>
                                        )}

                                        {/* Body preview */}
                                        {a.preview && (
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    opacity: 0.8,
                                                    marginTop: 6,
                                                    whiteSpace: isOpen ? 'pre-wrap' : 'normal',
                                                    ...(isOpen ? {} : CLAMP_3),
                                                }}
                                            >
                                                {a.preview}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div
                        style={{
                            padding: 20,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{ marginTop: 16 }}>
                            {/* Commit / Amount */}
                            <label style={{ fontSize: 12, opacity: 0.7 }}>
                                Amount
                            </label>

                            <input
                                type="number"
                                value={commitAmount ?? ''}

                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCommitAmount(v === '' ? null : Number(v));
                                }}

                                style={{
                                    marginTop: 6,
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'transparent',
                                    color: '#f1f3f4',
                                    fontSize: 14,
                                }}
                            />

                            {/* Stage selector */}
                            <label
                                style={{
                                    fontSize: 12,
                                    opacity: 0.7,
                                    marginTop: 14,
                                    display: 'block',
                                }}
                            >
                                Stage
                            </label>

                            <select
                                value={selectedStageId ?? ''}
                                onChange={(e) => setSelectedStageId(e.target.value)}
                                style={{
                                    marginTop: 6,
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: '#0f1317',
                                    color: '#f1f3f4',
                                    fontSize: 14,
                                }}
                            >
                                {HUBSPOT_DEAL_STAGES.map((stage) => (
                                    <option key={stage.id} value={stage.id}>
                                        {stage.label}
                                    </option>
                                ))}
                            </select>

                            {/* Update action */}
                            <button
                                onClick={handleUpdateStage}
                                disabled={!canUpdate || isUpdatingStage}
                                style={{
                                    marginTop: 14,
                                    width: '100%',
                                    background:
                                        !canUpdate || isUpdatingStage
                                            ? '#374151'     // disabled
                                            : '#2563eb',    // active
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '10px',
                                    fontWeight: 600,
                                    cursor:
                                        !canUpdate || isUpdatingStage
                                            ? 'not-allowed'
                                            : 'pointer',
                                    opacity:
                                        isUpdatingStage ? 0.85 : 1,
                                }}
                            >
                                Update Stage
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

        </div >
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
                `/api/raises/${raiseId}/subscribe-batch`,
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

function InviteDraftForm({
    raiseId,
    prospect,
    onClose,
    onSaved,
}: {
    raiseId: string;
    prospect: ProspectRow;
    onClose: () => void;
    onSaved: () => Promise<void> | void;
}) {
    if (!prospect) return null;

    const defaultSubject = 'Inwood – Rosehill | Investor Preview';

    const firstName =
        (prospect.contact_name ?? '').split(' ')[0].trim() || 'there';

    const defaultBody = `Hi {{first_name}},

I wanted to share an early look at our Inwood – Rosehill opportunity.

If you’re open to it, I’d be happy to walk you through the deal and answer any questions.

Best,
`;

    const [subject, setSubject] = useState(
        prospect.invite_subject ?? defaultSubject
    );
    const [body, setBody] = useState(
        prospect.invite_body ?? defaultBody
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function renderPreview(text: string) {
        // safer than replaceAll
        return text.split('{{first_name}}').join(firstName);
    }

    async function saveDraft() {
        try {
            setSaving(true);
            setError(null);

            const res = await fetch(
                `/api/raises/${raiseId}/prospective/${prospect.id}/draft`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject,
                        body,
                        invite_method: 'hubspot_outlook',
                    }),
                }
            );

            const json = await res.json();
            if (!res.ok || json?.ok === false) {
                setError(json?.error ?? 'Failed to save draft');
                return;
            }

            await onSaved();
        } catch (e: any) {
            setError(e?.message ?? 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
                Recipient:{' '}
                <strong>{prospect.contact_name || 'Unnamed Contact'}</strong>
                {' '}· {prospect.contact_email || '—'}
            </div>

            <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'transparent',
                    color: '#f1f3f4',
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'transparent',
                        color: '#f1f3f4',
                        resize: 'none',
                        fontSize: 13,
                        lineHeight: 1.4,
                    }}
                />

                <div
                    style={{
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 10,
                        padding: 12,
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: 13,
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
                        Preview
                    </div>
                    {renderPreview(body)}
                </div>
            </div>

            {error && (
                <div style={{ fontSize: 12, color: '#fb7185' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#cfd4d8' }}
                >
                    Cancel
                </button>
                <button
                    onClick={saveDraft}
                    disabled={saving}
                    style={{
                        background: '#ffffff',
                        color: '#000',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {saving ? 'Saving…' : 'Save Draft'}
                </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.6 }}>
                This saves the draft only. Sending happens separately via Outlook + HubSpot.
            </div>
        </div>
    );
}