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
  isMobile: boolean;
  isDark: boolean;
  onSave: () => void;
};

export default function DocumentsEditor({
  deal,
  setDeal,
  saveState,
  saving,
  isMobile,
  isDark,
  onSave,
}: Props) {
  if (!deal) return null;

  return (
    <div
      style={{
        background: isDark ? '#0f172a' : '#f8fafc',
        padding: isMobile ? 12 : 40,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 900,
          margin: '0 auto',
          background: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
          padding: isMobile ? 16 : 24,
          borderRadius: 8,
        }}
      >
        <EditorHeader
          title="Documents"
          saveState={saveState}
          saving={saving}
          isDark={isDark}
          isMobile={isMobile}
          onSave={onSave}
        />

        <DocumentField
          label="Deal Snapshot"
          url={deal.abridged_memo_url}
          isDark={isDark}
          isMobile={isMobile}
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
          isDark={isDark}
          isMobile={isMobile}
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
          isDark={isDark}
          isMobile={isMobile}
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

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
          }}
        >
          <label
            style={{
              fontSize: 12,
              display: 'block',
              marginBottom: 8,
              color: isDark ? '#cbd5e1' : '#475569',
            }}
          >
            Full Memo Requires CA
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
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
