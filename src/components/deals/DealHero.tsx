'use client';

import {
    Building2,
    Percent,
    Car,
    Warehouse,
    MapPinned,
    Users,
    DollarSign,
    SquareDashed,
} from 'lucide-react';

const ICONS = {
    building: Building2,
    percent: Percent,
    vacancy: SquareDashed,
    car: Car,
    warehouse: Warehouse,
    map: MapPinned,
    users: Users,
    dollar: DollarSign,
};

type Metric = {
    key: string;
    label: string;
    icon?: string;
    value?: string | null;
    section: string;
    is_visible?: boolean;
    display_order?: number;
};

type Deal = {
    name: string;
    location?: string;
    image_1_url?: string;
    estimated_closing_date?: string;
    thesis?: string;
    why_we_like_it?: string;
    metrics?: Metric[];
};

type Props = {
    deal: Deal;
    isMobile?: boolean;
};

function MetricCard({
    value,
    label,
    icon,
    isMobile,
}: {
    value?: string | null;
    label: string;
    icon?: string;
    isMobile?: boolean;
}) {
    const Icon =
        icon &&
        ICONS[
        icon as keyof typeof ICONS
        ];

    return (
        <div style={{
            ...metricCard,
            padding: isMobile ? '10px' : '16px 20px',
        }}>
            <div style={metricRow}>
                {Icon && (
                    <Icon
                        size={isMobile ? 18 : 28}
                        color="#31c8db"
                    />
                )}

                <div>
                    <div style={{
                        ...metricValue,
                        fontSize: isMobile ? 16 : 24,
                    }}>
                        {value || '—'}
                    </div>

                    <div style={{
                        ...metricLabel,
                        fontSize: isMobile ? 10 : 12,
                    }}>
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DealHero({
    deal,
    isMobile = false,
}: Props) {
    console.log('DealHero isMobile:', isMobile);
    const heroMetrics =
        deal.metrics
            ?.filter(
                (m) =>
                    m.section === 'hero' &&
                    m.is_visible !== false
            )
            .sort(
                (a, b) =>
                    (a.display_order ?? 0) -
                    (b.display_order ?? 0)
            )
            .slice(0, 4) ?? [];

    return (
        <div style={container}>
            <div style={{
                ...heroSection,
                height: isMobile ? 450 : 620,
            }}>
                {deal.image_1_url && (
                    <img
                        src={deal.image_1_url}
                        alt={deal.name}
                        style={heroImage}
                    />
                )}

                <div style={{
                    ...heroOverlay,
                    padding: isMobile ? '24px' : '64px',
                    justifyContent: isMobile
                        ? 'flex-end'
                        : 'flex-end'
                }}>
                    <div style={{
                        ...heroContent,
                    }}>
                        <h1 style={{
                            ...heroTitle,
                            fontSize: isMobile ? 32 : 64,
                            lineHeight: 1.05,
                        }}>
                            {deal.name}
                        </h1>

                        <div style={{
                            ...heroMeta,
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: isMobile ? 8 : 16,
                        }}>
                            {deal.location && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        deal.location
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        ...heroLocation,
                                        fontSize: isMobile ? 15 : 18,
                                        maxWidth: isMobile ? '100%' : undefined,
                                    }}
                                >
                                    📍 {
                                        isMobile
                                            ? deal.location
                                                ?.split(',')
                                                .slice(1, 3)
                                                .join(',')
                                                .trim()
                                            : deal.location}
                                </a>
                            )}

                            {deal.estimated_closing_date && (
                                <div style={{
                                    ...heroClosing,
                                    padding: isMobile ? '8px 14px' : '10px 16px',
                                    fontSize: isMobile ? 14 : 16,
                                }}>
                                    Closing{' '}
                                    {new Date(
                                        deal.estimated_closing_date
                                    ).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        <div style={{
                            ...heroMetricGrid,
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: isMobile ? 10 : 16
                        }}>
                            {heroMetrics.map((metric) => (
                                <MetricCard
                                    key={metric.key}
                                    value={metric.value}
                                    label={metric.label}
                                    icon={metric.icon}
                                    isMobile={isMobile}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {deal.thesis && (
                <div style={thesisWrapper}>
                    <p style={thesis}>
                        {deal.thesis}
                    </p>
                </div>
            )}
        </div>
    );
}

const container: React.CSSProperties = {
    marginBottom: 48,
};

const heroSection: React.CSSProperties = {
    position: 'relative',

    width: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',

    height: 620,

    overflow: 'hidden',
    marginBottom: 16,
};
const heroContent: React.CSSProperties = {
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
};
const heroImage: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
};

const heroOverlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,

    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',

    padding: '64px',

    background:
        'linear-gradient(180deg, rgba(5,7,10,.15) 0%, rgba(5,7,10,.35) 45%, rgba(5,7,10,.82) 100%)',
};

const heroTitle: React.CSSProperties = {
    color: '#fff',
    fontSize: 64,
    fontWeight: 800,
    textShadow: '0 0 24px rgba(49,200,219,.12)',

    lineHeight: 1.05,
    margin: 0,
    marginBottom: 16,
};

const heroMeta: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
};

const heroLocation: React.CSSProperties = {
    color: '#fff',
    textDecoration: 'none',
    fontSize: 18,
    fontWeight: 500,
};

const heroClosing: React.CSSProperties = {
    background: 'rgba(255,255,255,.15)',
    backdropFilter: 'blur(10px)',

    color: '#fff',
    padding: '10px 16px',
    borderRadius: 999,
    fontWeight: 600,
};

const heroMetricGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginTop: 24,
    maxWidth: 1200,
};

const metricCard: React.CSSProperties = {
    background: 'rgba(255,255,255,.12)',
    backdropFilter: 'blur(12px)',

    border:
        '1px solid rgba(255,255,255,.18)',
    borderRadius: 12,

    padding: '16px 20px',
};

const metricRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
};

const metricValue: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 4,
};

const metricLabel: React.CSSProperties = {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    color: 'rgba(255,255,255,.75)',
};

const thesisWrapper: React.CSSProperties = {
    maxWidth: 1100,
    margin: '24px auto 16px auto',
};

const thesis: React.CSSProperties = {
    fontSize: 22,
    lineHeight: 1.7,
    color: '#334155',
};