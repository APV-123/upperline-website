// src/app/tap/[slug]/page.tsx
import { TapClient } from "./TapClient";
import { notFound } from "next/navigation";

type Params = { slug: string };

const slugToMetWith: Record<
  string,
  { name: string; headshot: string; vcf: string; title: string }
> = {
  alex:    { name: "Alexander Vitenas", headshot: "/assets/headshots/alexander-vitenas.webp", vcf: "/assets/vcards/alexander-vitenas.vcf", title: "VP | Acquisitions & Operations" },
  jeremy:  { name: "Jeremy Knapp",      headshot: "/assets/headshots/jeremy-knapp.webp",      vcf: "/assets/vcards/jeremy-knapp.vcf",      title: "Sr Associate Investments & Asset Management" },
  nealy:   { name: "Nealy Mraz",        headshot: "/assets/headshots/nealy-mraz.webp",        vcf: "/assets/vcards/nealy-mraz.vcf",        title: "Chief Financial Officer" },
  spencer: { name: "Spencer Harkness",  headshot: "/assets/headshots/spencer-harkness.webp",  vcf: "/assets/vcards/spencer-harkness.vcf",  title: "Founder | CEO" },
};

export default async function TapPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params; // ← important

  const data =
    slugToMetWith[slug.toLowerCase()] ??
    null;

  if (!data) {
    // nicer than rendering “Unknown”
    notFound();
  }

  return (
    <TapClient
      metWith={data.name}
      headshot={data.headshot}
      vcf={data.vcf}
      title={data.title}
      slug={slug}
    />
  );
}

// Optional: fix the themeColor warning on this route
export const viewport = {
  themeColor: "#003a5d",
};