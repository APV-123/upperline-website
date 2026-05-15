"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./deal-index.module.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Deal = {
  slug: string;
  name: string;
  location: string;
  strategy: string;
  targetRaise: string;
  blurb: string;
};

const DEALS: Deal[] = [
  {
    slug: "inwood-rosehill",
    name: "Inwood – Rosehill",
    location: "Houston, TX",
    strategy: "Retail / Mixed-Use",
    targetRaise: "$1.5M Target",
    blurb:
      "A curated early look at our Inwood – Rosehill opportunity. Review the thesis and key facts before requesting full access.",
  },
  {
    slug: "houston-farmers-market",
    name: "Houston Farmers Market",
    location: "Houston, TX",
    strategy: "Retail Redevelopment",
    targetRaise: "Target TBD",
    blurb:
      "An early preview of a value-creation redevelopment concept. Explore the highlights and tell us if you'd like to engage.",
  },
];

export default function DealIndexPage() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ✅ Cmd + K (Mac) or Ctrl + K (Windows)
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

        {/* overlay content */}
        <div className={styles.heroContent}>
          <img
            src="/upperline-mark.png"
            alt="Upperline mark"
            className={styles.heroMark}
          />
        </div>
      </section>

      <section className={styles.navySection}>
        <div className={styles.navyInner}>
          <h1 className={styles.navyTitle}>
            Current Opportunities
          </h1>

          <p className={styles.navySub}>
            Select an opportunity below to review details and indicate interest.
          </p>

        </div>
      </section>


      {/* Body */}
      <main className={styles.main}>
        <div className={styles.grid}>
          {DEALS.map((deal) => (
            <Link key={deal.slug} href={`/${deal.slug}`} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>{deal.name}</div>
                <div className={styles.cardMeta}>
                  {deal.location} · {deal.strategy}
                </div>
              </div>

              <div className={styles.cardBlurb}>{deal.blurb}</div>

              <div className={styles.cardBottom}>
                <div className={styles.cardRaise}>{deal.targetRaise}</div>
                <div className={styles.cardCta}>View Investment →</div>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.footerNote}>
          <span className={styles.footerDot} />
          For accredited investors only. Information provided is for preliminary review and is not an offer to sell securities.
        </div>
      </main>
    </div>
  );
}