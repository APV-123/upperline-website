'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    HUBSPOT_DEAL_STAGES,
    STAGE_LABEL_TO_ID,
} from '@/lib/hubspotStages';
import { ADMIN_THEME } from '@/lib/adminTheme';
import AdminNav from '@/components/navigation/AdminNav';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import InvestorCard from '@/components/investors/InvestorCard';
import AddProspectsModal from '@/components/investors/AddProspectsModal';
import InviteDraftForm from '@/components/investors/InviteDraftForm';
import {
    FileText,
    MessageSquare,
    RefreshCw,
    DollarSign,
    CheckCircle2,
} from 'lucide-react';

type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

type ApiInvestorRow = {
    dealId: string;
    contactId: string | null;
    raiseSubscriptionId: string | null;
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
    raiseSubscriptionId?: string | null;
    contactId?: string | null;
};

type ProspectRow = {
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
type ContactActivityResponse = {
    ok?: boolean;
    error?: string;
    activities?: HubSpotActivity[];
};
type SubscriptionActivity = {
    id: string;

    activity_type: string;

    activity_at: string;

    activity_source: string | null;

    created_by: string | null;

    metadata: Record<string, unknown> | null;
};
type SendInviteResponse = {
    ok?: boolean;
    error?: string;
};
type HubspotCreateDealResponse = {
    ok?: boolean;
    error?: string;
    dealId?: string;
};



const BUCKETS: { key: Bucket; label: string }[] = [
    { key: 'circling', label: 'Circling' },
    { key: 'needs_touch', label: 'Needs Touch' },
    { key: 'committed', label: 'Committed' },
];




function formatDateMaybe(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
}
// ✅ Stage-aware action rules (BUSINESS LOGIC, not UI)

export default function DealInvestorsPage() {
    //===========================================
    //Primary data (read-only)
    //===========================================
    const router = useRouter();
    const [deal, setDeal] = useState<{
        name: string;
        raise_id: string;
        target_amount: number;
    } | null>(null);
    const params = useParams<{ dealId: string }>();
    const dealId = params.dealId;
    const [rows, setRows] = useState<ApiInvestorRow[]>([]);
    //Prospective investors (Supabase)
    const [prospects, setProspects] = useState<ProspectRow[]>([]);
    const [loadingProspects] = useState(false);

    // HubSpot activity timeline (read)
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);

    
    
    //============================================
    // UI State / interaction state
    //============================================
    const [showInviteDraft, setShowInviteDraft] = useState(false);
    const [activeProspect, setActiveProspect] = useState<ProspectRow | null>(null);
    const [showPassed, setShowPassed] = useState(false);
    const [isDark, setIsDark] = useState(true);

    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;



    // =======================
    // HubSpot writes (mutations)
    // =======================
    // Internal notes


    function openInviteDraft(p: ProspectRow) {
        setActiveProspect(p);
        setShowInviteDraft(true);
    }
    const loadDashboard = useCallback(async () => {
        if (!dealId) return;

        const res = await fetch(`/api/deals/${dealId}/dashboard`, {
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok || json?.ok === false) {
            console.error('Failed to load dashboard');
            return;
        }

        setDeal(json.deal);
        setRows(json.investors);
        setProspects(json.prospects);

    }, [dealId]);



    useEffect(() => {
        const saved = localStorage.getItem('theme');

        if (saved === 'dark') {
            setIsDark(true);
        } else {
            setIsDark(false);
        }
    }, []);

    useEffect(() => {
        if (!dealId) return;
        loadDashboard();
    }, [dealId, loadDashboard]);


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
                raiseSubscriptionId: r.raiseSubscriptionId,
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

    const passedInvestors = investors.filter(
        (i) => i.bucket === 'passed'
    );
    useEffect(() => {
        if (
            showPassed &&
            passedInvestors.length === 0
        ) {
            setShowPassed(false);
        }
    }, [
        showPassed,
        passedInvestors.length,
    ]);
    const committedTotal = useMemo(() => {
        return investors
            .filter((i) => i.bucket === 'committed')
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }, [investors]);
    const target = deal?.target_amount ?? 0;
    const committed = committedTotal;

    const pct = target > 0 ? committed / target : 0;
    const remaining = Math.max(target - committed, 0);

    const committedCount = investors.filter(i => i.bucket === 'committed').length;
    const avgCommittedCheck = committedCount > 0
        ? Math.round(committed / committedCount)
        : 0;

    const invitedProspectsCount = prospects.filter(p => p.invited_at).length;
    const draftReadyCount = prospects.filter(p => p.invite_status === 'draft_ready').length;

    const activeInvestorsCount = investors.filter(i => i.bucket !== 'passed').length;
    const shownCount = investors.length + invitedProspectsCount;
    // --- Dashboard design tokens + helpers ---
    const NAVY = '#003a5d'; // Upperline brand navy 【1-a56f89】
    const SLATE_TEXT = '#64748b';
    const DARK_TEXT = '#0f172a';
    const BORDER = 'rgba(15,23,42,0.08)';

    const pctClamped = Math.max(0, Math.min(pct, 1));
    const pctLabel = `${Math.round(pctClamped * 100)}%`;

    const fmt0 = (n: number) => `$${Math.round(n).toLocaleString()}`;
    const [showAddInvestor, setShowAddInvestor] = useState(false);


    return (

        <>
            <AdminNav />

            <div
                style={{
                    background: colors.background, // ✅ brand navy
                    minHeight: 'calc(100vh - 64px)',
                    paddingTop: 16,
                    paddingBottom: 32,
                }}
            >
                <div
                    style={{
                        maxWidth: 1400,
                        margin: '0 auto',
                        padding: 16,
                        background: 'transparent',
                        minHeight: 'calc(100vh - 120px)',
                    }}
                >

                    {/* Header */}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 6,
                            marginBottom: 14,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 600,
                                color: colors.text,
                            }}
                        >
                            {deal?.name || 'Loading deal...'}
                        </div>

                        <button
                            onClick={() => setShowAddInvestor(true)}
                            style={{
                                background: colors.accent,
                                color: '#071426',
                                border: `1px solid ${colors.border}`,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                fontWeight: 600,
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            Add Investor
                        </button>
                    </div>
                    {/* ===== Raise Dashboard ===== */}
                    <div style={{ marginBottom: 16 }}>
                        {/* Row 1: Progress */}
                        <div
                            style={{
                                background: colors.surface,
                                border: `1px solid ${BORDER}`,
                                borderRadius: 6,
                                padding: 12,
                                marginBottom: 10,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div
                                    style={{
                                        fontSize: 11,
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase',
                                        color: colors.subtext,
                                        opacity: 0.8,
                                    }}
                                >
                                    Raise Progress
                                </div>

                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: colors.text,
                                    }}
                                >
                                    {pctLabel}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'baseline' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>
                                    {fmt0(committed)}
                                </div>

                                <div style={{ fontSize: 13, color: colors.subtext }}>
                                    of {fmt0(target)} target
                                </div>

                                {/* Remaining (right aligned) */}
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: colors.subtext, opacity: 0.9 }}>Remaining</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                                        {fmt0(remaining)}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar INSIDE the card (this was your nesting bug) */}
                            <div
                                style={{
                                    height: 8,
                                    background: '#eef1f4',
                                    borderRadius: 999,
                                    marginTop: 10,
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${pctClamped * 100}%`,
                                        height: '100%',
                                        background: NAVY,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Row 2: KPI tiles */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                            {[
                                { label: 'Shown', value: shownCount.toLocaleString(), sub: 'investors + invited' },
                                { label: 'Avg Check (Committed)', value: fmt0(avgCommittedCheck), sub: `${committedCount} committed` },
                                { label: 'Active Investors', value: activeInvestorsCount.toLocaleString(), sub: 'not passed' },
                                { label: 'Prospects', value: prospects.length.toLocaleString(), sub: `${draftReadyCount} draft-ready` },
                            ].map((kpi) => (
                                <div
                                    key={kpi.label}
                                    style={{
                                        background: colors.surface,
                                        border: kpi.label === 'Shown'
                                            ? '1px solid rgba(15,23,42,0.12)'
                                            : `1px solid ${BORDER}`,
                                        borderRadius: 6,
                                        padding: 12,
                                        boxShadow: kpi.label === 'Shown' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                                    }}
                                >
                                    <div style={{ fontSize: 11, color: colors.subtext }}>{kpi.label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginTop: 4 }}>
                                        {kpi.value}
                                    </div>
                                    <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
                                        {kpi.sub}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Row 3: Funnel strip (micro) */}
                        <div
                            style={{
                                marginTop: 10,
                                background: colors.surface,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 6,
                                padding: 10,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ fontSize: 11, color: colors.subtext }}>Funnel</div>
                                <div style={{ fontSize: 11, color: colors.subtext }}>
                                    Draft → Invited → Active → Committed
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    marginBottom: 6,
                                    color: colors.text,
                                    fontWeight: 600,
                                }}
                            >
                                <div>{draftReadyCount}</div>
                                <div>{invitedProspectsCount}</div>
                                <div>{activeInvestorsCount}</div>
                                <div>{committedCount}</div>
                            </div>

                            {(() => {
                                const a = draftReadyCount;
                                const b = invitedProspectsCount;
                                const c = activeInvestorsCount;
                                const d = committedCount;
                                const total = Math.max(a + b + c + d, 1);
                                const seg = (n: number) => `${(n / total) * 100}%`;

                                return (
                                    <div
                                        style={{
                                            display: 'flex',
                                            height: 8,
                                            borderRadius: 999,
                                            overflow: 'hidden',
                                            background: '#eef1f4',
                                        }}
                                    >
                                        <div style={{ width: seg(a), background: '#cbd5e1' }} />
                                        <div style={{ width: seg(b), background: '#93c5fd' }} />
                                        <div style={{ width: seg(c), background: NAVY }} />
                                        <div style={{ width: seg(d), background: '#22c55e' }} />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    {/* PROSPECTS */}
                    <div
                        style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 24,
                        }}
                    >
                        <div>
                            <h3
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: colors.text,
                                    marginBottom: 18,
                                }}
                            >
                                Prospective Investors
                            </h3>

                            {loadingProspects && (
                                <div style={{ fontSize: 12, opacity: 0.6 }}>Loading…</div>
                            )}

                            {!loadingProspects && prospects.length === 0 && (
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: colors.subtext,
                                        padding: '8px 0',
                                        fontWeight: 500,
                                    }}
                                >
                                    No prospective investors yet. Click &quot;Add Investor&quot; to begin building your pipeline.
                                </div>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                {prospects.map((p) => {
                                    const isDraftReady = (p.invite_status ?? '').trim() === 'draft_ready';

                                    return (
                                        <div
                                            key={p.contact_id}
                                            style={{
                                                background: '#12284a',
                                                borderRadius: 14,
                                                padding: 16,
                                                marginBottom: 0,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`,
                                                minWidth: 360,
                                            }}
                                        >
                                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                                                {p.contact_name || 'Unnamed Contact'}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: colors.subtext,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                {p.contact_email || '—'}
                                            </div>

                                            {/* Draft status line */}
                                            {isDraftReady && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: colors.accent,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '.5px',
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    Draft Ready
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button
                                                    style={{
                                                        background: 'transparent',
                                                        color: colors.accent,
                                                        border: `1px solid ${colors.accent}`,
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                        padding: '6px 10px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => openInviteDraft(p)}
                                                >
                                                    {isDraftReady ? 'Edit Draft' : 'Draft Invite'}
                                                </button>

                                                <button
                                                    disabled={!isDraftReady}
                                                    style={{
                                                        background: colors.accent,
                                                        color: '#071426',
                                                        border: 'none',
                                                        fontWeight: 600,
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                        padding: '6px 10px',
                                                        cursor: isDraftReady ? 'pointer' : 'not-allowed',
                                                        opacity: isDraftReady ? 1 : 0.45,
                                                    }}
                                                    onClick={async () => {
                                                        if (!confirm('Mark invite as sent and move investor into pipeline?')) return;

                                                        const sendRes = await fetch(
                                                            `/api/deals/${dealId}/prospects/${p.contact_id}/send`,
                                                            { method: 'POST' }
                                                        );

                                                        const sendJson = (await sendRes.json().catch(() => null)) as SendInviteResponse | null;

                                                        if (!sendRes.ok || sendJson?.ok === false) {
                                                            alert(sendJson?.error ?? 'Failed to mark invite as sent');
                                                            return;
                                                        }

                                                        const hubspotRes = await fetch(`/api/deals/${dealId}/add-investor`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                contactId: p.contact_id,
                                                                amount: 250000,
                                                                investorName: p.contact_name,
                                                            }),
                                                        });

                                                        const hubspotJson = (await hubspotRes.json().catch(() => null)) as HubspotCreateDealResponse | null;

                                                        if (!hubspotRes.ok || hubspotJson?.ok === false) {
                                                            alert(hubspotJson?.error ?? 'Failed to create HubSpot deal');
                                                            return;
                                                        }

                                                        await loadDashboard();
                                                        setTimeout(() => loadDashboard(), 1500);
                                                        setTimeout(() => loadDashboard(), 4000);
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
                                                        await fetch(`/api/deals/${dealId}/prospects/${p.contact_id}`, { method: 'DELETE' });
                                                        await loadDashboard();
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    {/* Buckets */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 18,
                        }}
                    >
                        <h3
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: colors.text,
                                margin: 0,
                            }}
                        >
                            Active Pipeline
                        </h3>

                        {passedInvestors.length > 0 && (
                            <button
                                onClick={() => setShowPassed(v => !v)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.subtext,
                                }}
                            >
                                {showPassed
                                    ? 'Show Active Pipeline'
                                    : `Show Passed (${passedInvestors.length})`}
                            </button>
                        )}
                    </div>

                    <div
                        style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 24,
                        }}
                    >
                        {showPassed &&
                            passedInvestors.length > 0 ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 16,
                                }}
                            >
                                {passedInvestors.map((investor) => (
                                    <InvestorCard
                                        key={investor.id}
                                        investor={investor}
                                        onOpen={() =>
                                            router.push(
                                                `/admin/deals/${dealId}/investors/${investor.contactId}`
                                            )
                                        }
                                        colors={colors}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 24,
                                }}
                            >

                                {BUCKETS.map((bucket) => (
                                    <div key={bucket.key}>
                                        <h3
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                letterSpacing: '1px',
                                                textTransform: 'uppercase',
                                                marginBottom: 18,
                                                color:
                                                    bucket.key === 'circling'
                                                        ? '#60a5fa'
                                                        : bucket.key === 'needs_touch'
                                                            ? '#fbbf24'
                                                            : '#4ade80',
                                            }}
                                        >
                                            {bucket.label} (
                                            {
                                                investors.filter(
                                                    i => i.bucket === bucket.key
                                                ).length
                                            }
                                            )
                                        </h3>

                                        {investors
                                            .filter((i) => i.bucket === bucket.key)
                                            .map((investor) => (
                                                <InvestorCard
                                                    key={investor.id}
                                                    investor={investor}
                                                    onOpen={() =>
                                                        router.push(
                                                            `/admin/deals/${dealId}/investors/${investor.contactId}`
                                                        )
                                                    }
                                                    colors={colors}
                                                />
                                            ))}
                                    </div>
                                ))}
                            </div>
                        )}
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
                                        dealId={dealId}
                                        onClose={() => setShowAddInvestor(false)}
                                        onAdded={async () => {
                                            await loadDashboard(); //refresh the queue from Supabase
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
                                            dealId={dealId}
                                            prospect={activeProspect}
                                            onClose={() => {
                                                setShowInviteDraft(false);
                                                setActiveProspect(null);
                                            }}
                                            onSaved={async () => {
                                                await loadDashboard();
                                                setShowInviteDraft(false);
                                                setActiveProspect(null);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </>
    )
}