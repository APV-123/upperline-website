'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import EditorHeader from './EditorHeader';
import ImageField from './ImageField';

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

export default function ImagesEditor({
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
          maxWidth: isMobile ? '100%' : 820,
          margin: '0 auto',
          background: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
          padding: isMobile ? 16 : 24,
          borderRadius: 8,
        }}
      >
        <EditorHeader
          title="Images"
          saveState={saveState}
          saving={saving}
          onSave={onSave}
        />

        <ImageField
          label="Hero Image"
          url={deal.image_1_url}
          isDark={isDark}
          isMobile={isMobile}
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                  ...p,
                  image_1_url: v,
                }
                : p
            )
          }
        />

        <ImageField
          label="Gallery Image 1"
          url={deal.image_2_url}
          isDark={isDark}
          isMobile={isMobile}
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                  ...p,
                  image_2_url: v,
                }
                : p
            )
          }
        />

        <ImageField
          label="Gallery Image 2"
          url={deal.image_3_url}
          isDark={isDark}
          isMobile={isMobile}
          onChange={(v) =>
            setDeal((p) =>
              p
                ? {
                  ...p,
                  image_3_url: v,
                }
                : p
            )
          }
        />
      </div>
    </div>
  );
}
