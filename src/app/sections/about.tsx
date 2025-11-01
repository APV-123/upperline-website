export default function About() {
  return (
    <section
      id="about"
      className="relative w-full bg-white scroll-mt-24 md:scroll-mt-32"
      aria-label="About Upperline"
    >
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="grid w-full gap-10 md:gap-12 md:grid-cols-5 items-start">
          {/* Heading / kicker */}
          <div className="md:col-span-2">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-[#003a5d]">
              About Upperline
            </h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#31c8db]" />
          </div>

          {/* Copy */}
          <div className="md:col-span-3 text-slate-600">
            <div className="max-w-prose text-[17px] leading-7 md:text-lg md:leading-8">
              <p>
                Upperline is a private, multi-strategy investment firm focused on real
                estate with complementary exposure to private equity. Our real estate
                platform leverages deep industry expertise to unlock value across a range
                of asset classes.
              </p>
              <p className="mt-5">
                Our investment strategy emphasizes building a diversified portfolio in
                high-growth markets, driving performance through strategic insights,
                innovative technology, and alignment with all stakeholders. Our team
                approaches each opportunity with fresh perspective and creative thinking,
                consistently delivering results that exceed expectations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
