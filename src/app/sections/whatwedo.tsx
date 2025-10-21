import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
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
  {
    title: "Investment",
    body:
      "We target high-growth markets across development, value-add, and covered land strategies, building a diversified portfolio designed for both stability and long-term returns.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="mx-auto max-w-6xl px-6 pb-20 bg-neutral-100 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold">What We Do</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Upperline is dedicated to unlocking value in dynamic markets. We take an innovative, hands-on approach to repositioning and developing a range of asset types--including mixed-use, office, retail, and master-planned communitites. With a strong foundation in our core value and a focus on performance, we delvier exceptional results for our partners across both urban infill and suburban settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {ITEMS.map((it) => (
          <Card key={it.title} className="rounded-2xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-medium">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
