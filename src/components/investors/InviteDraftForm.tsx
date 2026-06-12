'use client';

import {
    useState,
    useEffect,
} from 'react';

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

export default function InviteDraftForm({
    dealId,
    prospect,
    onClose,
    onSaved,
}: {
    dealId: string;
    prospect: ProspectRow;
    onClose: () => void;
    onSaved: () => Promise<void> | void;
}) {


    const [loadingTemplate, setLoadingTemplate] =
        useState(true);

    const [subject, setSubject] =
        useState(
            prospect.invite_subject ?? ''
        );

    const [body, setBody] =
        useState(
            prospect.invite_body ?? ''
        );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const firstName =
        (prospect.contact_name ?? '')
            .split(' ')[0]
            .trim() || 'there';

    useEffect(() => {
        async function loadTemplate() {
            if (
                prospect.invite_subject ||
                prospect.invite_body
            ) {
                setLoadingTemplate(false);
                return;
            }

            try {
                const res = await fetch(
                    `/api/deals/${dealId}/communications`,
                    {
                        cache: 'no-store',
                    }
                );

                const json =
                    await res.json();

                if (
                    res.ok &&
                    json.ok &&
                    json.templates?.length
                ) {
                    const initialInvite =
                        json.templates.find(
                            (t: {
                                step_order: number;
                            }) =>
                                t.step_order ===
                                1
                        );

                    if (
                        initialInvite
                    ) {
                        setSubject(
                            initialInvite.subject ??
                            ''
                        );

                        setBody(
                            initialInvite.body ??
                            ''
                        );
                    }
                }
            } catch (err) {
                console.error(
                    '[LOAD TEMPLATE]',
                    err
                );
            } finally {
                setLoadingTemplate(false);
            }
        }

        loadTemplate();
    }, [
        dealId,
        prospect.invite_subject,
        prospect.invite_body,
    ]);

    function renderPreview(text: string) {
        // safer than replaceAll
        return text.split('{{ first_name }}').join(firstName);
    }


    async function saveDraft() {
        try {
            setSaving(true);
            setError(null);

            const res = await fetch(
                `/api/deals/${dealId}/prospects/${prospect.contact_id}/draft`,
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

            // ✅ SAFE JSON PARSING (fixes your demo error)
            const json = await res.json().catch(() => null);

            if (!res.ok || json?.ok === false) {
                console.error('[DRAFT SAVE FAILED]', json);
                setError(json?.error ?? 'Failed to save draft');
                return;
            }

            await onSaved();

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to save draft';
            setError(message);
        } finally {
            setSaving(false);
        }
    }

    if (!prospect) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
                Recipient:{' '}
                <strong>{prospect.contact_name || 'Unnamed Contact'}</strong>
                {' '}· {prospect.contact_email || '—'}
            </div>
            {loadingTemplate && (
                <div
                    style={{
                        fontSize: 12,
                        opacity: 0.7,
                    }}
                >
                    Loading template...
                </div>
            )}
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