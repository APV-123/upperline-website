"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
      {/* remove the gradient; keep only a very soft bottom divider */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-12 blur-lg opacity-30" />

      {/* SEO heading, visually hidden */}
      <h1 className="sr-only">Upperline Companies</h1>

      {/* Larger, responsive logo */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto mb-4 flex justify-center"
      >
        <Image
          src="/upperline-logo.png"
          alt="Upperline"
          priority
          // clamp: 200px on small screens → 340px on large
          className="h-auto w-[clamp(200px,28vw,340px)]"
          width={340}
          height={92}
        />
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="text-[13px] font-medium tracking-wide text-secondary"
      >
        Capital Elevated
      </motion.p>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground"
      >
        Investing and developing at the intersection of land, capital, and design —
        powered by discipline, partnership, and stewardship.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="mt-8 flex items-center justify-center gap-3"
      >
        <Button className="bg-primary text-primary-foreground px-6 rounded-2xl">
          Explore Our Work
        </Button>
        <Button variant="outline" className="rounded-2xl">
          Contact Us
        </Button>
      </motion.div>
    </section>
  );
}
