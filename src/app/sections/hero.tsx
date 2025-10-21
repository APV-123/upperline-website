"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      className="
        relative w-full overflow-hidden
        min-h-[56vh]               /* xs: shorter on phones */
        sm:min-h-[60vh]            /* small phones / small tablets */
        md:min-h-[66vh]            /* tablet / small laptop */
        lg:min-h-[70vh]            /* laptop */
        xl:min-h-[72vh]            /* large desktop */
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

      {/* Subtle gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />

      {/* Logo mark (scales + nudges across breakpoints) */}
      <div
        className="
          absolute
          top-6 left-6           /* phones */
          sm:top-8 sm:left-8
          md:top-12 md:left-12
          lg:top-14 lg:left-16
        "
      >
        <Image
          src="/upperline-mark.png"
          alt="Upperline mark"
          width={200}
          height={200}
          className="
            w-16 h-auto          /* phones */
            sm:w-20
            md:w-32
            lg:w-40              /* desktops */
            drop-shadow-lg
          "
        />
      </div>

      {/* Tagline (larger and slightly higher on small screens, then relax) */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          absolute italic font-light text-white tracking-wide drop-shadow-md
          left-6 bottom-6        /* phones */
          sm:left-8 sm:bottom-8
          md:left-16 md:bottom-10
          lg:left-28 lg:bottom-14
          text-2xl               /* phones */
          sm:text-3xl
          md:text-4xl
          lg:text-5xl
        "
      >
        Capital Elevated.
      </motion.h2>
    </section>
  );
}
