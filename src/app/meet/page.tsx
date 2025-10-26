'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

const BRAND = { navy: '#003a5d', turq: '#31c8db', warm: '#d8d2c3' };

const TEAM: Record<string, { name: string; title: string; vcf: string; headshot: string }> = {
  alex:    { name: 'Alexander Vitenas', title: 'Vice President | Acquisitions & Operations', vcf: '/assets/vcards/alexander-vitenas.vcf', headshot: '/assets/headshots/alexander-vitenas.webp' },
  jeremy:  { name: 'Jeremy Knapp',      title: 'Sr. Associate | Investments & Asset Management', vcf: '/assets/vcards/jeremy-knapp.vcf', headshot: '/assets/headshots/jeremy-knapp.webp' },
  nealy:   { name: 'Nealy Mraz',        title: 'CFO', vcf: '/assets/vcards/nealy-mraz.vcf', headshot: '/assets/headshots/nealy-mraz.webp' },
  spencer: { name: 'Spencer Harkness',  title: 'Founder | CEO', vcf: '/assets/vcards/spencer-harkness.vcf', headshot: '/assets/headshots/spencer-harkness.webp' },
};

export default function MeetPage() {
  const qp = useSearchParams();
  const owner = (qp.get('o') || '').toLowerCase();
  const event = qp.get('e') || 'UNKNOWN';
  const src   = qp.get('src') || 'wallet';
  const person = TEAM[owner];

  // GTM events (layout already injects GTM)
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({ event: 'meet_page_view', meet_owner: owner, meet_event: event, meet_src: src });
  }

  if (!person) {
    return (
      <div style={{ padding: 32, fontFamily: 'Arial,Helvetica,sans-serif' }}>
        <h1>Upperline</h1>
        <p>Missing or invalid owner. Try <code>/meet?o=alex</code>.</p>
      </div>
    );
  }

  // Respect user motion preferences
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const trans = (d: number) => (prefersReduced ? { duration: 0 } : { duration: d, ease: 'easeOut' });

  const wrap: React.CSSProperties = {
    background: BRAND.navy,
    color: '#fff',
    minHeight: '100dvh',
    fontFamily: 'Arial, Helvetica, sans-serif',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    // iOS safe areas (notch / home bar)
    paddingTop: 'max(24px, env(safe-area-inset-top))',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
  };

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    textAlign: 'center',
    // OLED-friendly soft depth
    boxShadow: '0 10px 26px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.16)',
  };

  const btn = (bg: string, color: string): React.CSSProperties => ({
    display: 'block',
    textAlign: 'center',
    padding: '16px 18px',        // bigger thumb target
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 600,
    marginTop: 12,
    background: bg,
    color,
    boxShadow: '0 6px 18px rgba(0,0,0,.15)',
    transition: 'transform .08s ease-out, filter .12s ease-out',
    willChange: 'transform',
  });

  // Motion presets
  const fadeUp  = { initial: { opacity: 0, y: 10 },  animate: { opacity: 1, y: 0 } };
  const popIn   = { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1 } };

  return (
    <div style={wrap}>
      <motion.div
        style={{ textAlign: 'center', marginBottom: 18 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={trans(0.35)}
      >
        {/* Inverted logo, responsive width on small screens */}
        <img
          src="/Upperline-logo-inverted.png"
          alt="Upperline"
          style={{ width: 'min(160px, 40vw)', height: 'auto', margin: '0 auto 16px' }}
        />
      </motion.div>

      <motion.div style={card} {...popIn} transition={trans(0.28)}>
        {/* Headshot with shadow + gentle reveal */}
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
          transition={trans(0.35)}
        />

        <motion.h1
          style={{ margin: '0 0 4px', fontSize: 22, letterSpacing: .3 }}
          {...fadeUp}
          transition={trans(0.35)}
        >
          {person.name}
        </motion.h1>

        <motion.p
          style={{ margin: '0 0 16px', fontSize: 14, color: BRAND.turq }}
          {...fadeUp}
          transition={trans(0.35)}
        >
          {person.title}
        </motion.p>

        <motion.a
          href={person.vcf}
          style={btn('#fff', '#000')}
          {...fadeUp}
          transition={trans(0.35)}
          onClick={() => (window as any).dataLayer?.push({ event: 'meet_vcard_click', meet_owner: owner })}
          whileTap={{ scale: prefersReduced ? 1 : 0.98 }}
        >
          Save my contact (vCard)
        </motion.a>

        <motion.div {...fadeUp} transition={trans(0.35)}>
          <Link
            href={`/intake/contact?owner=${owner}&e=${encodeURIComponent(event)}&src=${encodeURIComponent(src)}`}
            style={btn(BRAND.turq, '#002333')}
            onClick={() =>
              (window as any).dataLayer?.push({ event: 'meet_share_click', meet_owner: owner, meet_event: event, meet_src: src })
            }
          >
            Share your info with me
          </Link>
        </motion.div>

        <motion.p
          style={{ marginTop: 14, fontSize: 12, color: BRAND.warm, opacity: .9 }}
          {...fadeUp}
          transition={trans(0.35)}
        >
          Great to meet you. This page is unique to {person.name.split(' ')[0]}. Your details go to our CRM with your consent.
        </motion.p>
      </motion.div>
    </div>
  );
}
