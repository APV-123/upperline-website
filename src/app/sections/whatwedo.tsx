import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  {
    title: "Development",
    body:
      "Source, entitle, and deliver essential projects with precision—grounded in feasibility and place-making.",
  },
  {
    title: "Asset Management",
    body:
      "Hands-on stewardship and disciplined operations to preserve optionality and drive performance.",
  },
  {
    title: "Investment",
    body:
      "Targeted, thesis-driven capital deployment with alignment, transparency, and risk control.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="mx-auto max-w-6xl px-6 pb-20">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold">What We Do</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Development, asset management, and investment—executed with discipline and long-term alignment.
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
