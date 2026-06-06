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
            background: isDark
                ? 'rgba(10,15,25,0.92)'
                : 'rgba(255,255,255,0.75)',
            borderBottom: isDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(255,255,255,0.15)',
            boxShadow: isDark
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
                    <div
                        style={backdrop}
                        onClick={() => setMenuOpen(false)}
                    />
                    <div style={{
                        ...mobileMenu,
                        background: isDark
                            ? 'rgba(15,23,42,.98)'
                            : 'rgba(255,255,255,.98)',
                        borderTop: isDark
                            ? '1px solid rgba(255,255,255,.08)'
                            : '1px solid #e5e7eb',
                    }}>
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
                                :'#e5e7eb'
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
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,

    zIndex: 1,

    background: 'rgba(255,255,255,.98)',
    backdropFilter: 'blur(16px)',

    borderTop: '1px solid #e5e7eb',
    boxShadow: '0 10px 30px rgba(0,0,0,.08)',

    display: 'flex',
    flexDirection: 'column',

    padding: 20,
    gap: 16,
};
const mobileLink: React.CSSProperties = {
    textDecoration: 'none',
    color: '#334155',
    fontWeight: 500,
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
    margin: '8px 0',
};
const backdrop: React.CSSProperties = {
    position: 'fixed',
    inset: 0,

    background: 'rgba(0,0,0,.45)',

    zIndex: -1,
};