'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type Props = {
    dealName: string;
    isMobile?: boolean;
};

export default function DealStickyHeader({
    dealName,
    isMobile = false,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
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

                {!isMobile && (
                    <nav style={nav}>
                        <a href="#overview" style={link}>Overview</a>
                        <a href="#highlights" style={link}>Why We Like It</a>
                        <a href="#business-plan" style={link}>Investment Strategy</a>
                        <a href="#returns" style={link}>Returns</a>
                        <a href="#documents" style={link}>Documents</a>
                        <a
                            href="https://upperlineco.com/who-we-are"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={link}
                        >
                            About Upperline
                        </a>
                    </nav>
                )}

                {isMobile ? (
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={menuButton}
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
                <div style={mobileMenu}>
                    <a
                        href="#overview"
                        style={mobileLink}
                        onClick={() => setMenuOpen(false)}
                    >
                        Overview
                    </a>

                    <a
                        href="#highlights"
                        style={mobileLink}
                        onClick={() => setMenuOpen(false)}
                    >
                        Why We Like It
                    </a>
                    <a
                        href="#business-plan"
                        style={mobileLink}
                        onClick={() => setMenuOpen(false)}
                    >
                        Investment Strategy
                    </a>
                    <a
                        href="#returns"
                        style={mobileLink}
                        onClick={() => setMenuOpen(false)}
                    >
                        Returns
                    </a>

                    <a
                        href="#documents"
                        style={mobileLink}
                        onClick={() => setMenuOpen(false)}
                    >
                        Documents
                    </a>
                    <a
                        href="https://upperlineco.com/who-we-are"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={mobileLink}
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
    fontWeight: 500,
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
    fontWeight: 600,
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
