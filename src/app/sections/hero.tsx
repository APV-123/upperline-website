"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      aria-label="Upperline hero"
      className="
        relative w-full overflow-hidden
        min-h-[62vh]           /* +6vh on phones for better cadence */
        sm:min-h-[64vh]
        md:min-h-[66vh]
        lg:min-h-[70vh]
        xl:min-h-[72vh]
      "
    >
      {/* Background */}
      <Image
        src="/assets/media/hero/optimized/wood-slat-facade.webp"
        alt="Upperline wood facade background"
        fill
        priority
        className="object-cover object-center"
      />

      {/* Vignette: slightly stronger at bottom for tagline legibility */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/8 to-transparent" />
        {/* subtle top burn to keep the mark crisp */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/15 to-transparent" />
      </div>

      {/* Safe-area aware gutters */}
      <div
        className="
          absolute inset-0
          px-6 sm:px-8 md:px-16 lg:px-28
          pb-[max(1.25rem,env(safe-area-inset-bottom))]  /* bottom breathing room */
          pt-[max(1.25rem,env(safe-area-inset-top))]
        "
      >
        {/* Logo mark */}
        <div
          className="
            absolute
            left-6 sm:left-8 md:left-16 lg:left-20
            top-[max(1.5rem,env(safe-area-inset-top))]
          "
        >
          <Image
            src="/upperline-mark.png"
            alt="Upperline mark"
            width={200}
            height={200}
            className="
              w-16 sm:w-20 md:w-28 lg:w-36 h-auto
              drop-shadow-lg
            "
          />
        </div>

        {/* Tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="
            absolute italic font-light text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,.45)]
            left-6 sm:left-8 md:left-16 lg:left-28
            bottom-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))]
            leading-[1.05]
            /* smooth responsive size instead of hard steps */
            text-[clamp(28px,6.5vw,56px)]
          "
        >
          Capital Elevated.
        </motion.h1>
      </div>
    </section>
  );
}
