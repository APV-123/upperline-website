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
};

export default function DealIndexPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <Image
          src="/assets/media/hero/optimized/wood-slat-facade.webp"
          alt="Upperline facade"
          fill
          priority
          className={styles.heroImage}
        />

        <div className={styles.heroContent}>
          <Image
            src="/upperline-mark.png"
            alt="Upperline mark"
            width={120}
            height={40}
            className={styles.heroMark}
          />
        </div>
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
              href={`/deals/${deal.id}`}   // ✅ dynamic routing
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>{deal.name}</div>

                <div className={styles.cardMeta}>
                  Houston, TX · Opportunity
                </div>
              </div>

              <div className={styles.cardBlurb}>
                Investment opportunity overview coming soon.
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.cardRaise}>
                  ${deal.target_amount.toLocaleString()} Target
                </div>

                <div className={styles.cardCta}>
                  View Investment →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.footerNote}>
          <span className={styles.footerDot} />
          For{""}
          <a
            href="https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/accredited-investors"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.plainLink}
            >accredited investors
               </a>{""}only. Information provided is for preliminary review and is not an offer to sell securities.
        </div>
      </main>
    </div>
  );
}
