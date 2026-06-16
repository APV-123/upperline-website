'use client';

import React from 'react';
import { ADMIN_THEME } from '@/lib/adminTheme';
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

  const colors = isDark
    ? ADMIN_THEME.dark
    : ADMIN_THEME.light;

  const documentsRequireCA =
    deal.full_memo_requires_ca;

  function StatusBadge({
    uploaded,
  }: {
    uploaded: boolean;
  }) {
    return (
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: uploaded
            ? '#22c55e'
            : '#f59e0b',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}
      >
        {uploaded
          ? 'Uploaded'
          : 'Missing'}
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.background,
        padding: isMobile ? 12 : 40,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 900,
          margin: '0 auto',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          padding: isMobile ? 16 : 32,
          borderRadius: 12,
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

        <div
          style={{
            marginBottom: 24,
            color: colors.subtext,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Manage the confidential documents
          investors receive after executing
          the confidentiality agreement.
        </div>

        {/* Investment Memorandum */}
        <div
          style={{
            background:
              'rgba(255,255,255,0.03)',
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                Investment Memorandum
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: colors.subtext,
                }}
              >
                Confidential offering
                memorandum presented to
                prospective investors.
              </div>
            </div>

            <StatusBadge
              uploaded={
                !!deal.full_memo_url
              }
            />
          </div>

          <DocumentField
            label="Investment Memorandum"
            url={deal.full_memo_url}
            colors={colors}
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
        </div>

        {/* Financial Model */}
        <div
          style={{
            background:
              'rgba(255,255,255,0.03)',
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                Financial Model
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: colors.subtext,
                }}
              >
                Underwriting model,
                assumptions, cash flows,
                and return projections.
              </div>
            </div>

            <StatusBadge
              uploaded={
                !!deal.proforma_url
              }
            />
          </div>

          <DocumentField
            label="Financial Model"
            url={
              deal.proforma_url ?? ''
            }
            colors={colors}
            isMobile={isMobile}
            bucket="deal-documents-private"
            onChange={(v) =>
              setDeal((p) =>
                p
                  ? {
                      ...p,
                      proforma_url: v,
                    }
                  : p
              )
            }
          />
        </div>

        {/* CA Settings */}
        <div
          style={{
            borderRadius: 12,
            padding: 20,
            background:
              'rgba(49,200,219,.06)',
            border:
              '1px solid rgba(49,200,219,.20)',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: colors.text,
              marginBottom: 6,
            }}
          >
            Confidential Document Access
          </div>

          <div
            style={{
              color: colors.subtext,
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Controls whether investors
            must execute a confidentiality
            agreement before accessing
            the investment memorandum and
            financial model.
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={
                documentsRequireCA
              }
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

            Require Confidentiality
            Agreement Before Accessing
            Documents
          </label>
        </div>
      </div>
    </div>
  );
}