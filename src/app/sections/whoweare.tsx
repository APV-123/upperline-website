"use client";

export default function WhoWeAre() {
  return (
    <section
      id="who-we-are"
      className="relative bg-[#f6f7f8] flex items-center min-h-[30vh] py-20 md:py-24"
    >
      <div className="mx-auto max-w-5xl px-6 w-full">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Left column: heading + turquoise divider */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold text-[#003a5d]">
              Who We Are
            </h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#31c8db]"></div>
          </div>

          {/* Right column: text */}
          <div className="md:col-span-3 text-[#2d3b45] leading-relaxed">
            <p>
              Upperline is led by a team of experienced professionals with
              diverse backgrounds across commercial real estate. This breadth of
              expertise informs every investment decision we make, allowing us
              to approach each project with insight, creativity, and a clear
              vision for long-term success.
            </p>
          </div>
        </div>
      </div>

      {/* Turquoise divider line at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#31c8db]" />
    </section>
  );
}
