'use client';

import React from 'react';
import type { DealFormValues } from './DealForm';
import { ADMIN_THEME } from '@/lib/adminTheme';
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
  const colors = isDark
    ? ADMIN_THEME.dark
    : ADMIN_THEME.light;
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
          padding: isMobile ? 16 : 24,
          borderRadius: 8,
        }}
      >
        <EditorHeader
          title="Images"
          saveState={saveState}
          saving={saving}
          isDark={isDark}
          isMobile={isMobile}
          onSave={onSave}
        />

        <ImageField
          label="Hero Image"
          url={deal.image_1_url}
          colors={colors}
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
          colors={colors}
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
          colors={colors}
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
