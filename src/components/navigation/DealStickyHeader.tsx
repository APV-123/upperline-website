'use client';
import Image from 'next/image';

type Props = {
    dealName: string;
};

export default function DealStickyHeader({
    dealName,
}: Props) {
    return (
        <header style={header}>
            <div style={inner}>
                <a
                    href="https://portal.upperlineco.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={brand}
                >
                    <Image
                        src="/upperline-mark.png"
                        alt="Upperline mark"
                        width={180}
                        height={40}
                        priority
                        style={{
                            width: 'auto',
                            height: '34px',
                        }}
                    />
                </a>

                <nav style={nav}>
                    <a href="#overview" style={link}>Overview</a>
                    <a href="#highlights" style={link}>Highlights</a>
                    <a href="#returns" style={link}>Returns</a>
                    <a href="#business-plan" style={link}>Business Plan</a>
                    <a href="#documents" style={link}>Documents</a>
                </nav>

                <a
                    href={`mailto:bh@upperline.com?subject=${encodeURIComponent(
                        `Interest in ${dealName}`
                    )}`}
                    style={cta}
                >
                    Requet Full Memorandum
                </a>
            </div>
        </header>
    );
}

const header: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,

    background: 'rgba(255,255,255,.90)',
    backdropFilter: 'blur(12px)',

    borderBottom: '1px solid #e5e7eb',
};

const inner: React.CSSProperties = {
    maxWidth: 1400,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
    padding: '14px 24px',
};

const logo: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    textDecoration: 'none',
    color: '#003a5d',
};

const nav: React.CSSProperties = {
    display: 'flex',
    gap: 28,
};

const link: React.CSSProperties = {
    textDecoration: 'none',
    color: '#334155',
    fontWeight: 500,
};

const cta: React.CSSProperties = {
    background: '#003a5d',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
};

const brand: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
};