'use client';

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
}: Props) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: 180,
                flexShrink: 0,
                position: 'sticky',
                top: 24,
                background: '#071426',
                padding: 4,
                borderRadius: 12,
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
                                ? '1px solid rgba(49,200,219,.18)'
                                : '1px solid rgba(255,255,255,.08)',

                            background: isActive
                                ? 'rgba(49,200,219,.15)'
                                : '#10213d',

                            color: isActive
                                ? '#31c8db'
                                : '#9fb3c8',

                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all .15s ease',
                        }}
                    >
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}