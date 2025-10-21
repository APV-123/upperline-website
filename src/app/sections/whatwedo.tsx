import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  {
    title: "Investment",
    body:
      "We target high-growth markets across development, value-add, and covered land strategies, building a diversified portfolio designed for both stability and long-term returns.",
  },
  {
    title: "Development",
    body:
      "Our team's extensive experience, combined with strong industry relationships and an integrated development management system, enables us to consistently deliver projects on schedule and within budget.",
  },
  {
    title: "Asset Management",
    body:
      "Maximizing property performance with prudent financial management and best-in-class leasing and property management teams.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="relative py-16">
      {/* full-width gray background */}
      <div className="absolute inset-y-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-neutral-100" />

      {/* constrained content */}
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold">What We Do</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Upperline is dedicated to unlocking value in dynamic markets. We take an innovative, hands-on approach to repositioning and developing a range of asset types—including mixed-use, office, retail, and master-planned communities. With a strong foundation in our core values and a focus on performance, we deliver exceptional results for our partners across both urban infill and suburban settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
  {ITEMS.map((it) => (
    <Card
      key={it.title}
      className="
        group relative rounded-2xl bg-white 
        transition-all duration-300 ease-out 
        hover:-translate-y-1 hover:shadow-lg hover:border-upperline-navy/80
        border border-transparent
      "
    >
      <CardContent className="p-6">
        <h3 className="text-xl font-medium transition-colors duration-300 group-hover:text-upperline-navy">
          {it.title}
        </h3>
        <p className="mt-2 text-sm text-neutral-700">
          {it.body}
        </p>
      </CardContent>
    </Card>
  ))}
</div>

      </div>
      <div className="absolute bottom-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-1 bg-secondary/90 z-20" />
    </section>

  );
}
