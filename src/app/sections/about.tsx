export default function About() {
  return (
    // Full-width band; we control height with the inner container
    <section id="about" className="relative w-full bg-white">
      {/* Shared section container: consistent height + vertical centering */}
      <div className="mx-auto max-w-5xl px-6 min-h-[30vh] py-20 md:py-28 flex items-center">
        <div className="grid w-full gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold">About Upperline</h2>
            <div className="mt-3 h-1 w-16 rounded bg-secondary" />
          </div>

          <div className="md:col-span-3 leading-relaxed text-muted-foreground">
            <p>
              Upperline is a private, multi-strategy investment firm focused on real
              estate with complementary exposure to private equity. Our real estate
              platform leverages deep industry expertise to unlock value across a range
              of asset classes.
            </p>
            <p className="mt-4">
              Our investment strategy emphasizes building a diversified portfolio in
              high-growth markets driving performance through strategic insights,
              innovative technology, and alignment with all stakeholders. Our team
              approaches each opportunity with fresh perspective and creative thinking,
              consistently delivering results that exceed expectations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
