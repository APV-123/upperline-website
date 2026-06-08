'use client';

import React from 'react';

type Props = {
  title: string;
  isDirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
};

export default function EditorHeader({
  title,
  isDirty = false,
  saving = false,
  onSave,
}: Props) {
  return (
    <div style={container}>
      <div>
        <h1 style={titleStyle}>{title}</h1>

        <div style={statusStyle}>
          {isDirty ? (
            <span style={{ color: '#b45309' }}>
              ● Unsaved Changes
            </span>
          ) : (
            <span style={{ color: '#15803d' }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={!isDirty || saving}
        style={{
          ...buttonStyle,
          opacity: !isDirty || saving ? 0.6 : 1,
          cursor:
            !isDirty || saving
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {saving ? 'Saving...' : 'Save Deal'}
      </button>
    </div>
  );
}

const container: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: '#0f172a',
};

const statusStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  background: '#163a63',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 20px',
  fontWeight: 600,
  fontSize: 14,
};