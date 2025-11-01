export default function WhatWeDo() {
  return (
    <section
      id="what-we-do"
      aria-label="What We Do"
      className="relative bg-[#003a5d] text-white scroll-mt-24 md:scroll-mt-32"
    >
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="grid w-full gap-10 md:gap-12 md:grid-cols-5 items-start">
          {/* Heading (first on mobile, right column on md+) */}
          <div className="order-1 md:order-2 md:col-span-2 md:text-right">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              What We Do
            </h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#31c8db] md:ml-auto" />
          </div>

          {/* Copy (second on mobile, left column on md+) */}
          <div className="order-2 md:order-1 md:col-span-3">
            <div className="max-w-prose text-white/90 text-[17px] leading-7 md:text-lg md:leading-8">
              <p>
                Upperline is dedicated to unlocking value in dynamic markets. We take an
                innovative, hands-on approach to repositioning and developing a range of
                asset types—including mixed-use, office, retail, and master-planned
                communities.
              </p>
              <p className="mt-5">
                With a strong foundation in our core values and a focus on performance, we
                deliver exceptional results for our partners across both urban infill and
                suburban settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
