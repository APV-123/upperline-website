'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';

// ---- GTM dataLayer typings + helper ----
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
const pushDL = (evt: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(evt);
  }
};
// ----------------------------------------

const BRAND = { navy: '#003a5d', turq: '#31c8db', warm: '#d8d2c3' };

const TEAM: Record<
  string,
  { name: string; title: string; vcf: string; headshot: string }
> = {
  alex:    { name: 'Alexander Vitenas', title: 'Vice President | Acquisitions & Operations', vcf: '/assets/vcards/alexander-vitenas.vcf', headshot: '/assets/headshots/alexander-vitenas.webp' },
  jeremy:  { name: 'Jeremy Knapp',      title: 'Sr. Associate | Investments & Asset Management', vcf: '/assets/vcards/jeremy-knapp.vcf', headshot: '/assets/headshots/jeremy-knapp.webp' },
  nealy:   { name: 'Nealy Mraz',        title: 'CFO', vcf: '/assets/vcards/nealy-mraz.vcf', headshot: '/assets/headshots/nealy-mraz.webp' },
  spencer: { name: 'Spencer Harkness',  title: 'Founder | CEO', vcf: '/assets/vcards/spencer-harkness.vcf', headshot: '/assets/headshots/spencer-harkness.webp' },
};

export function TapClient({ owner }: { owner: string }) {
  const [showQR, setShowQR] = useState(false);
  const person = TEAM[owner];

  pushDL({ event: 'tap_page_view', tap_owner: owner });

  if (!person) {
    return (
      <div style={{ padding: 32, fontFamily: 'Arial,Helvetica,sans-serif', color: '#fff' }}>
        <h1>Upperline</h1>
        <p>Unknown profile. Try <code>/tap/alex</code>.</p>
      </div>
    );
  }

  const wrap: React.CSSProperties = {
    background: BRAND.navy,
    color: '#fff',
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    paddingTop: 'max(24px, env(safe-area-inset-top))',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  const card: React.CSSProperties = {
    position: 'relative',
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    textAlign: 'center',
    boxShadow: '0 10px 26px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.16)',
  };

  const btn = (bg: string, color: string): React.CSSProperties => ({
    display: 'block',
    textAlign: 'center',
    padding: '16px 18px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 600,
    marginTop: 12,
    background: bg,
    color,
    boxShadow: '0 6px 18px rgba(0,0,0,.15)',
    transition: 'transform .08s ease-out, filter .12s ease-out',
  });

  const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <div style={wrap}>
      <motion.div
        style={{ textAlign: 'center', marginBottom: 18 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <img
          src="/Upperline-logo-inverted.png"
          alt="Upperline"
          style={{ width: 'min(160px, 40vw)', height: 'auto', margin: '0 auto 16px' }}
        />
      </motion.div>

      <motion.div
        style={card}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28 }}
      >
        {/* Toggle button, top-right */}
       <button
            onClick={() => {
                setShowQR((s) => {
                const next = !s;
                pushDL({ event: next ? 'tap_show_qr' : 'tap_show_card', tap_owner: owner });
                return next;
                });
            }}
            aria-pressed={showQR}
            aria-label={showQR ? 'Show business card' : 'Show QR code'}
            style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 10,
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 12,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            >
            {showQR ? (
                <span style={{ fontSize: 12, fontWeight: 600 }}>×</span> // small close icon
            ) : (
                <QrCode size={18} strokeWidth={2} />
            )}
            </button>


        {/* Business card view */}
        {!showQR && (
          <>
            <motion.img
              src={person.headshot}
              alt={person.name}
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: '50%',
                marginBottom: 16,
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 10px 22px rgba(0,0,0,.30)',
                display: 'inline-block',
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            />

            <motion.h1
              style={{ margin: '0 0 4px', fontSize: 22, letterSpacing: 0.3 }}
              {...fadeUp}
              transition={{ duration: 0.35 }}
            >
              {person.name}
            </motion.h1>

            <motion.p
              style={{ margin: '0 0 16px', fontSize: 14, color: BRAND.turq }}
              {...fadeUp}
              transition={{ duration: 0.35 }}
            >
              {person.title}
            </motion.p>

            <motion.a
              href={person.vcf}
              style={btn('#fff', '#000')}
              {...fadeUp}
              transition={{ duration: 0.35 }}
              onClick={() => pushDL({ event: 'tap_vcard_click', tap_owner: owner })}
            >
              Save my contact (vCard)
            </motion.a>

            <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
              <Link
                href={`/intake/contact?owner=${owner}`}
                style={btn('#31c8db', '#002333')}
                onClick={() => pushDL({ event: 'tap_share_click', tap_owner: owner })}
              >
                Share your info with me
              </Link>
            </motion.div>
          </>
        )}

        {/* QR view */}
        {showQR && (
          <motion.img
            src={`/qr/qr-${owner}.png`}
            alt={`QR code for ${person.name}`}
            style={{
              width: '84%',
              maxWidth: 420,
              height: 'auto',
              margin: '8px auto 4px',
              display: 'block',
              background: '#fff',
              borderRadius: 12,
              padding: 12,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </motion.div>
    </div>
  );
}
