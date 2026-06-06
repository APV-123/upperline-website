'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type Props = {
    dealName: string;
    isMobile?: boolean;
    isDark?: boolean;
};

export default function DealStickyHeader({
    dealName,
    isMobile = false,
    isDark = false,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header style={{
            ...header,

            background:
                menuOpen && isMobile
                    ? 'transparent'
                    : isDark
                        ? 'rgba(10,15,25,0.92)'
                        : 'rgba(255,255,255,0.75)',

            borderBottom:
                menuOpen && isMobile
                    ? 'none'
                    : isDark
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(255,255,255,0.15)',

            boxShadow:
                menuOpen && isMobile
                    ? 'none'
                    : isDark
                        ? '0 4px 24px rgba(0,0,0,0.35)'
                        : 'none',
        }}>
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

                {!isMobile && (
                    <nav style={nav}>
                        <a href="#overview" style={{
                            ...link,
                            color: isDark ? '#cbd5e1' : '#334155',
                        }}>Overview</a>
                        <a href="#highlights" style={{
                            ...link,
                            color: isDark ? '#cbd5e1' : '#334155',
                        }}>Why We Like It</a>
                        <a href="#business-plan" style={{
                            ...link,
                            color: isDark ? '#cbd5e1' : '#334155',
                        }}>Investment Strategy</a>
                        <a href="#returns" style={{
                            ...link,
                            color: isDark ? '#cbd5e1' : '#334155',
                        }}>Returns</a>
                        <a href="#documents" style={{
                            ...link,
                            color: isDark ? '#cbd5e1' : '#334155',
                        }}>Documents</a>
                        <a
                            href="https://upperlineco.com/who-we-are"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                ...link,
                                color: isDark ? '#cbd5e1' : '#334155',
                            }}
                        >
                            About Upperline
                        </a>
                    </nav>
                )}

                {isMobile ? (
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            ...menuButton,
                            color: isDark ? '#f8fafc' : '#003a5d',
                        }}
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                ) : (
                    <a
                        href={`mailto:bh@upperline.com?subject=${encodeURIComponent(
                            `Interest in ${dealName}`
                        )}`}
                        style={cta}
                    >
                        Request Full Memorandum
                    </a>
                )}
            </div>
            {isMobile && menuOpen && (
                <>

                    <div style={{
                        ...mobileMenu,
                        background: isDark
                            ? '#0f172a'
                            : 'rgba(255,255,255,.98)',
                        borderTop: isDark
                            ? '1px solid rgba(255,255,255,.08)'
                            : '1px solid #e5e7eb',
                    }}>
                        <div style={mobileMenuHeader}>
                            <Image
                                src="/upperline-mark.png"
                                alt="Upperline mark"
                                width={180}
                                height={40}
                                priority
                                style={{
                                    width: 'auto',
                                    height: '34px',
                                    filter: 'drop-shadow(0 0 10px rgba(49,200,219,.25))',
                                }}
                            />

                            <button
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    ...menuButton,
                                    color: '#f8fafc',
                                }}
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div style={mobileNavLinks}>
                            <a
                                href="#overview"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Overview
                            </a>

                            <a
                                href="#highlights"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Why We Like It
                            </a>
                            <a
                                href="#business-plan"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Investment Strategy
                            </a>
                            <a
                                href="#returns"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Returns
                            </a>

                            <a
                                href="#documents"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Documents
                            </a>
                            <div style={{
                                ...mobileDivider,
                                background: isDark
                                    ? 'rgba(255,255,255,.08)'
                                    : '#e5e7eb'
                            }} />
                            <a
                                href="https://upperlineco.com/who-we-are"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    ...mobileLink,
                                    color: isDark ? '#cbd5e1' : '#334155',
                                }}
                                onClick={() => setMenuOpen(false)}
                            >
                                About Upperline
                            </a>
                        </div>
                        <div style={{ flex: 1 }} />
                        <a
                            href={`mailto:bh@upperline.com?subject=${encodeURIComponent(
                                `Interest in ${dealName}`
                            )}`}
                            style={mobileCTA}
                        >
                            Request Full Memorandum
                        </a>
                    </div>
                </>
            )}
        </header>
    );
}

const header: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,

    background: 'rgba(255,255,255,.75)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,.15)',
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
    fontWeight: 400,
};

const cta: React.CSSProperties = {
    background: '#31c8db',
    color: '#003a5d',
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

const menuButton: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#003a5d',
    padding: 4,
};
const mobileMenu: React.CSSProperties = {
    position: 'fixed',
    inset: 0,

    minHeight: '100vh',

    zIndex: 9999999,

    display: 'flex',
    flexDirection: 'column',

    padding: '24px',

    background: '#0f172a',

    overflowY: 'auto',
};
const mobileLink: React.CSSProperties = {
    textDecoration: 'none',
    color: '#334155',

    fontWeight: 400,
    fontSize: 18,
    letterSpacing: '-0.01em',
};
const mobileCTA: React.CSSProperties = {
    background: '#31c8db',
    color: '#003a5d',

    padding: '12px 16px',
    borderRadius: 10,

    textDecoration: 'none',
    textAlign: 'center',

    fontWeight: 700,
};
const mobileDivider: React.CSSProperties = {
    height: 1,
    margin: '12px 0',
};

const mobileNavLinks: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,

    flex: '0 0 auto',
};
const mobileMenuHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingTop: 8,

    marginBottom: 64,
};