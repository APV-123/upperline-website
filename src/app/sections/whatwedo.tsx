export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="relative bg-[#003a5d] text-white py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Left: Heading */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold">What We Do</h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#31c8db]"></div>
          </div>

          {/* Right: Body */}
          <div className="md:col-span-3 leading-relaxed">
            <p>
              Upperline is dedicated to unlocking value in dynamic markets. We take an
              innovative, hands-on approach to repositioning and developing a range of
              asset types—including mixed-use, office, retail, and master-planned
              communities. With a strong foundation in our core values and a focus on
              performance, we deliver exceptional results for our partners across both
              urban infill and suburban settings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
