'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';
import DocumentField from './DocumentField';

type EditableDeal = DealFormValues & {
  id: string;
};

type Props = {
  deal: EditableDeal | null;
  setDeal: React.Dispatch<
    React.SetStateAction<EditableDeal | null>
  >;
  saveState: 'idle' | 'dirty' | 'saved';
  saving: boolean;
  onSave: () => void;
};

export default function DocumentsEditor({
  deal,
  setDeal,
  saveState,
  saving,
  onSave,
}: Props) {
  if (!deal) return null;

  return (
    <div style={container}>
      <div style={content}>
        <EditorHeader
          title="Documents"
          saveState={saveState}
          saving={saving}
          onSave={onSave}
        />

        <DocumentField
          label="Deal Snapshot"
          url={deal.abridged_memo_url}
          bucket="deal-documents-public"
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                    ...p,
                    abridged_memo_url: v,
                  }
                : p
            )
          }
        />

        <DocumentField
          label="Full Investment Memorandum"
          url={deal.full_memo_url}
          bucket="deal-documents-private"
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                    ...p,
                    full_memo_url: v,
                  }
                : p
            )
          }
        />

        <DocumentField
          label="About Upperline"
          url={deal.pitch_book_url}
          bucket="deal-documents-public"
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                    ...p,
                    pitch_book_url: v,
                  }
                : p
            )
          }
        />

        <div style={{ marginTop: 24 }}>
          <label style={labelStyle}>
            Full Memo Requires CA
          </label>

          <label style={checkboxRow}>
            <input
              type="checkbox"
              checked={deal.full_memo_requires_ca}
              onChange={(e) =>
                setDeal((p) =>
                  p
                    ? {
                        ...p,
                        full_memo_requires_ca:
                          e.target.checked,
                      }
                    : p
                )
              }
            />

            Require Confidentiality Agreement
          </label>
        </div>
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  background: '#f8fafc',
  padding: 40,
};

const content: React.CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  background: '#fff',
  padding: 24,
  borderRadius: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  display: 'block',
  marginBottom: 8,
};

const checkboxRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
};