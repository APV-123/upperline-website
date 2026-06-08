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
}: Props) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: 220,
                flexShrink: 0,
                position: 'sticky',
                top: 24,
            }}
        >
            {sections.map((section) => {
                const isActive = active === section.key;

                return (
                    <button
                        key={section.key}
                        onClick={() => onChange(section.key)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: isActive
                                ? '1px solid #1e3a5f'
                                : '1px solid rgba(15,23,42,0.08)',
                            background: isActive ? '#1e3a5f' : '#ffffff',
                            color: isActive ? '#ffffff' : '#0f172a',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}