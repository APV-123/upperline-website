import { TapClient } from "./TapClient";

const slugToMetWith: Record<string, { name: string; headshot: string; vcf: string; title: string }> = {
  alex: { name: "Alexander Vitenas", headshot: "/assets/headshots/alexander-vitenas.webp", vcf: "/assets/vcards/alexander-vitenas.vcf", title: "VP | Acquisitions & Operations" },
  jeremy: { name: "Jeremy Knapp", headshot: "/assets/headshots/jeremy-knapp.webp", vcf: "/assets/vcards/jeremy-knapp.vcf", title: "Investment Analyst" },
  nealy: { name: "Nealy Mraz", headshot: "/assets/headshots/nealy-mraz.webp", vcf: "/assets/vcards/nealy-mraz.vcf", title: "Development Manager" },
  spencer: { name: "Spencer Harkness", headshot: "/assets/headshots/spencer-harkness.webp", vcf: "/assets/vcards/spencer-harkness.vcf", title: "Managing Partner & CEO" },
};

export default function TapPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const teamData = slugToMetWith[slug.toLowerCase()] || { name: "Unknown", headshot: "", vcf: "", title: "" };
  if (teamData.name === "Unknown") {
    console.warn(`Invalid slug: ${slug}, defaulting to Unknown`);
    // Optionally return a 404 (requires server component or middleware)
  }
  return <TapClient metWith={teamData.name} headshot={teamData.headshot} vcf={teamData.vcf} title={teamData.title} slug={slug} />;
}