export default function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold">About Upperline</h2>
          <div className="mt-3 h-1 w-16 rounded bg-secondary"></div>
        </div>
        <div className="md:col-span-3 text-muted-foreground leading-relaxed">
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
    </section>
  );
}
