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
  onSave: () => void;
};

export default function ImagesEditor({
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
          title="Images"
          saveState={saveState}
          saving={saving}
          onSave={onSave}
        />

        <ImageField
          label="Primary Image"
          url={deal.image_1_url}
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
          label="Secondary Image"
          url={deal.image_2_url}
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
          label="Tertiary Image"
          url={deal.image_3_url}
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