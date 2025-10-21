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
            Upperline represents the next stage of disciplined real estate investing and
            development. We focus on durable, essential assets and long-term value creation
            through rigorous underwriting, thoughtful design, and aligned partnerships.
          </p>
          <p className="mt-4">
            Our approach blends institutional standards with entrepreneurial agility—bringing
            clarity to complex sites and execution to high-conviction theses.
          </p>
        </div>
      </div>
    </section>
  );
}
