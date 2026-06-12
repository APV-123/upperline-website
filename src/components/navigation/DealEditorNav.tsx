'use client';

import { ADMIN_THEME } from '@/lib/adminTheme';

export type DealEditorSection =
    | 'details'
    | 'narrative'
    | 'images'
    | 'documents'
    | 'highlights'
    | 'metrics';

type Props = {
    active: DealEditorSection;
    onChange: (section: DealEditorSection) => void;
    isDark: boolean;
    isMobile: boolean;
};

const sections: {
    key: DealEditorSection;
    label: string;
}[] = [
        { key: 'details', label: 'Details' },
        { key: 'narrative', label: 'Narrative' },
        { key: 'images', label: 'Images' },
        { key: 'documents', label: 'Documents' },
        { key: 'highlights', label: 'Highlights' },
        { key: 'metrics', label: 'Metrics' },
    ];

export default function DealEditorNav({
    active,
    onChange,
    isDark,
    isMobile,
}: Props) {
    const colors = isDark
        ? ADMIN_THEME.dark
        : ADMIN_THEME.light;

    return (
        <div
            style={{
                display: 'flex',

                flexDirection: isMobile
                    ? 'row'
                    : 'column',

                overflowX: isMobile
                    ? 'auto'
                    : 'visible',

                width: isMobile
                    ? '100%'
                    : 180,

                flexShrink: 0,

                zIndex: 50,
                boxShadow: isMobile
                    ? '0 4px 12px rgba(0,0,0,.15)'
                    : undefined,

                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 4,
                paddingBottom: isMobile ? 8 : 4,
                gap: 8,
            }}
        >
            {sections.map((section) => {
                const isActive = active === section.key;

                return (
                    <button
                        key={section.key}
                        onClick={() => onChange(section.key)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,

                            border: isActive
                                ? `1px solid ${colors.accent}`
                                : `1px solid ${colors.border}`,

                            background: isActive
                                ? `${colors.accent}20`
                                : colors.surface,

                            color: isActive
                                ? colors.accent
                                : colors.subtext,

                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all .15s ease',

                            whiteSpace: 'nowrap',

                            minWidth: isMobile
                                ? 'fit-content'
                                : 'auto',

                            textAlign: isMobile
                                ? 'center'
                                : 'left',
                        }}
                    >
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}