'use client';

import Link from "next/link";
import Image from "next/image";
import styles from "./deal-index.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


type Deal = {
  id: string;
  name: string;
  target_amount: number;

  location?: string;
  asset_class?: string;
  strategy?: string;
  estimated_closing_date?: string;
};

function getCityState(location?: string) {
  if (!location) return "";

  const parts = location.split(",");
  if (parts.length < 3) return location;

  const city = parts[1]?.trim();
  const state = parts[2]?.trim();

  return `${city}, ${state}`;
}

function formatClosingDate(value?: string) {
  if (!value) return "";

  const d = new Date(value);

  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function DealIndexPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ Fetch PUBLIC deals (this is the key change)
  useEffect(() => {
    async function loadDeals() {
      try {
        const res = await fetch('/api/public/deals', {
          cache: 'no-store',
        });

        const json = await res.json();

        if (json?.ok) {
          setDeals(json.deals ?? []);
        } else {
          console.error('[PUBLIC DEALS ERROR]', json?.error);
        }
      } catch (e) {
        console.error('[PUBLIC DEALS FETCH FAILED]', e);
      } finally {
        setLoading(false);
      }
    }

    loadDeals();
  }, []);

  // ✅ Keep your keyboard shortcut EXACTLY as-is
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/login");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ""}`}>
      <div className={styles.navWrap}>
        <div className={styles.navInner}>

          {/* LEFT: Brand */}
          <a
            href="https://upperlineco.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.brand}
          >
            <div className={styles.logoWrap}>
            <Image
              src="/upperline-mark.png"
              alt="Upperline mark"
              className={styles.logo}
            /></div>
          </a>

          {/* RIGHT: Actions */}
          <div className={styles.navActions}>

            {/* Dark mode toggle */}
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setIsDark((prev) => !prev)}
            >
              {isDark ? "LIGHT" : "DARK"}
            </button>

            {/* Hamburger */}
            <button
              type="button"
              className={styles.hamburger}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className={styles.hamburgerIcon} />
            </button>
          </div>

        </div>
        {menuOpen && (
          <div className={styles.menuPanel}>

            <a
              href="https://upperlineco.com/who-we-are"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Who We Are
            </a>

            <a
              href="https://upperlineco.com/strategy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Strategy
            </a>

            <a
              href="https://upperlineco.com/approach"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Approach
            </a>

          </div>
        )}


      </div>
      {/* Hero */}
      <section className={styles.hero}>
        <Image
          src="/assets/media/hero/optimized/wood-slat-facade.webp"
          alt="Upperline facade"
          fill
          priority
          className={styles.heroImage}
        />
      </section>
      <section className={styles.navySection}>
        <div className={styles.navyInner}>
          <h1 className={styles.navyTitle}>
            Investment Opportunities
          </h1>

          <p className={styles.navySub}>
            Select an active opportunity below to review details and indicate interest.
          </p>
        </div>
      </section>

      {/* Body */}
      <main className={styles.main}>
        <div className={styles.grid}>

          {/* ✅ Loading state */}
          {loading && (
            <div style={{ padding: 12 }}>Loading opportunities…</div>
          )}

          {/* ✅ Empty state */}
          {!loading && deals.length === 0 && (
            <div style={{ padding: 12 }}>No opportunities available.</div>
          )}

          {/* ✅ Dynamic deals */}
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>{deal.name}</div>

                <div className={styles.cardMeta}>
                  {getCityState(deal.location)}
                </div>
                {(deal.asset_class || deal.strategy) && (
                  <div className={styles.cardAttributes}>
                    {deal.asset_class || ''}
                    {deal.asset_class && deal.strategy ? (
                      <span className={styles.dot}>·</span>
                    ) : null}
                    {deal.strategy || ''}
                  </div>
                )}

              </div>

              <div className={styles.cardFinancials}>
                <div className={styles.cardRaise}>
                  ${deal.target_amount.toLocaleString()}
                </div>

                <div className={styles.cardClosing}>
                  Closing: {formatClosingDate(deal.estimated_closing_date)}
                </div>
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.cardCta}>
                  View Investment →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.footerNote}>
          <span className={styles.footerDot} />
          For <a
            href="https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/accredited-investors"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.plainLink}
          >
            accredited investors
          </a> only. Information provided is for preliminary review and is not an offer to sell securities.
        </div>
      </main>
    </div>
  );
}
