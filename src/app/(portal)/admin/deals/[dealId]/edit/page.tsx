'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminNav from '@/components/navigation/AdminNav';
import DealEditorNav, {
  type DealEditorSection,
} from '@/components/navigation/DealEditorNav';
import type { DealFormValues } from '@/components/deals/DealForm';
import DealDetailsEditor from '@/components/deals/DealDetailsEditor';
import DealNarrativeEditor from '@/components/deals/DealNarrativeEditor';
import ImagesEditor from '@/components/deals/ImagesEditor';
import DocumentsEditor from '@/components/deals/DocumentsEditor';
import MetricsEditor, { type DealMetric } from '@/components/deals/MetricsEditor';
import DealHighlightsEditor from '@/components/deals/DealHighlightsEditor';

type DealApiResponse = {
  id: string;
} & DealFormValues & {
  metrics?: unknown; // explicitly ignored
};

type SaveResponse = {
  ok: boolean;
  error?: string;
};

export default function DealEditPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();
  const [section, setSection] = useState<DealEditorSection>('details');
  const [deal, setDeal] = useState<DealApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<
    'idle' | 'dirty' | 'saved'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DealMetric[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);


  // ✅ Load deal
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!dealId) return; // ✅ prevent bad fetch

      try {
        const res = await fetch(`/api/deals/${dealId}`, {
          cache: 'no-store',
        });

        const text = await res.text();

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          console.error('[NON JSON RESPONSE]', text);
          setLoading(false);
          return;
        }

        if (!mounted) return;

        if (res.ok && json?.ok && json.deal) {
          const { metrics: loadedMetrics = [], ...formDeal } = json.deal;
          setDeal(formDeal);
          setMetrics(loadedMetrics);
        } else {
          console.error('[EDIT LOAD FAILED]', json?.error);
          setError(json?.error || 'Failed to load deal');

        }
      } catch (e) {
        console.error('[EDIT FETCH ERROR]', e);
        setError('Failed to fetch deal');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [dealId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    const saved = localStorage.getItem('theme');

    if (saved === 'dark') {
      setIsDark(true);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!dealId) {
    return <div style={{ padding: 40 }}>Invalid deal</div>;
  }

  // ✅ Loading state
  if (loading) {
    return <div style={{ padding: 40 }}>Loading deal…</div>;
  }

  // ✅ Not found
  if (error) {
    return (
      <>
        <AdminNav />
        <div style={{ padding: 40 }}>
          <h1>{error}</h1>
        </div>
      </>
    );
  }
  async function saveDeal(updatedDeal: DealFormValues) {
    try {
      setSaving(true);

      const res = await fetch(`/api/deals/${dealId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDeal),
      });

      const text = await res.text();

      let json: SaveResponse | null = null;

      try {
        json = JSON.parse(text) as SaveResponse;
      } catch {
        console.error('[NON JSON RESPONSE]', text);
        alert('Unexpected server response');
        return;
      }

      if (!res.ok || !json?.ok) {
        alert(json?.error || 'Failed to save changes');
        return;
      }

      setSaveState('saved');
    } catch (err) {
      console.error('[SAVE ERROR]', err);
      alert('Network error while saving');
    } finally {
      setSaving(false);
    }
  }
  function updateDeal(
    updater: React.SetStateAction<DealApiResponse | null>
  ) {
    setDeal(updater);
    setSaveState('dirty');
  }
  return (
    <>
      <AdminNav />

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          padding: isMobile ? 12 : 24,
          alignItems: 'flex-start',
        }}
      >
        {deal ? (
          <>
            <div
              style={{
                width: isMobile ? '100%' : 180,
                flexShrink: 0,
              }}
            >
              <DealEditorNav
                active={section}
                onChange={setSection}
                isDark={isDark}
              />
            </div>
            <div style={{ flex: 1 }}>

              {section === 'details' && (
                <DealDetailsEditor
                  deal={deal}
                  setDeal={updateDeal}
                  saveState={saveState}
                  saving={saving}
                  isMobile={isMobile}
                  isDark={isDark}
                  onSave={() => saveDeal(deal)}
                />
              )}

              {section === 'narrative' && (
                <DealNarrativeEditor
                  deal={deal}
                  setDeal={updateDeal}
                  saveState={saveState}
                  saving={saving}
                  isMobile={isMobile}
                  isDark={isDark}
                  onSave={() => saveDeal(deal)}
                />
              )}

              {section === 'images' && (
                <ImagesEditor
                  deal={deal}
                  setDeal={updateDeal}
                  saveState={saveState}
                  saving={saving}
                  isMobile={isMobile}
                  isDark={isDark}
                  onSave={() => saveDeal(deal)}
                />
              )}

              {section === 'documents' && (
                <DocumentsEditor
                  deal={deal}
                  setDeal={updateDeal}
                  saveState={saveState}
                  saving={saving}
                  isMobile={isMobile}
                  isDark={isDark}
                  onSave={() => saveDeal(deal)}
                />
              )}

              {section === 'highlights' && (
                <DealHighlightsEditor dealId={dealId}
                  isMobile={isMobile}
                  isDark={isDark}
                />
              )}

              {section === 'metrics' && (
                <MetricsEditor
                  dealId={dealId}
                  initialMetrics={metrics}
                  isMobile={isMobile}
                  isDark={isDark}
                />
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 40 }}>Loading deal…</div>
        )}
      </div>
    </>
  );
} 
