"use client";

export default function WhoWeAre() {
  return (
    <section
      id="who-we-are"
      aria-label="Who We Are"
      className="relative bg-[#f6f7f8] text-[#2d3b45] scroll-mt-24 md:scroll-mt-32"
    >
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24 flex items-center">
        <div className="grid w-full gap-10 md:gap-12 md:grid-cols-5 items-start">
          {/* Left: heading + turquoise divider */}
          <div className="md:col-span-2">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#003a5d] leading-tight">
              Who We Are
            </h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#31c8db]" />
          </div>

          {/* Right: copy */}
          <div className="md:col-span-3">
            <div className="max-w-prose text-[17px] leading-7 md:text-lg md:leading-8">
              <p>
                Upperline is led by a team of experienced professionals with diverse
                backgrounds across commercial real estate. This breadth of expertise
                informs every investment decision we make, allowing us to approach each
                project with insight, creativity, and a clear vision for long-term success.
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
