// src/app/sections/team.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Member = {
  name: string;
  title: string;
  headshot?: string;
  blurb: string;
};

const TEAM: Member[] = [
  {
    name: "Spencer Harkness",
    title: "Founder | CEO",
    headshot: "/assets/headshots/spencer-harkness.webp",
    blurb:
      "Spencer leads Upperline’s strategy and capital formation with a multi-cycle mindset across development and investment.",
  },
  {
    name: "Nealy Mraz",
    title: "CFO",
    headshot: "/assets/headshots/nealy-mraz.webp",
    blurb:
      "Nealy oversees finance, reporting, and capital operations with a focus on discipline, clarity, and repeatability.",
  },
  {
    name: "Alexander Vitenas",
    title: "VP | Acquisitions & Operations",
    headshot: "/assets/headshots/alexander-vitenas.webp",
    blurb:
      "Alex leads sourcing, diligence, and execution while building the tech and operating systems that power Upperline’s platform.",
  },
  {
    name: "Jeremy Knapp",
    title: "Sr Associate | Investments & Asset Management",
    headshot: "/assets/headshots/jeremy-knapp.webp",
    blurb:
      "Jeremy supports acquisitions and asset management, driving underwriting, KPIs, and day-to-day performance.",
  },
];

export default function Team() {
  const [idx, setIdx] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  // rotate every 30s
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % TEAM.length), 30_000);
    return () => clearInterval(t);
  }, []);

  // left/right click advance
  const onSectionClick = (e: React.MouseEvent) => {
    if (!sectionRef.current) return;
    const r = sectionRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width / 2) setIdx(i => (i - 1 + TEAM.length) % TEAM.length);
    else setIdx(i => (i + 1) % TEAM.length);
  };

  const member = useMemo(() => TEAM[idx], [idx]);

  return (
    <section
      id="team"
      ref={sectionRef}
      onClick={onSectionClick}
      className="relative w-full text-white"
      style={{
        backgroundImage: "linear-gradient(180deg,#08314a 0%, #04283d 60%, #062f47 100%), url('/Upperline_IconPattern3Outline_Navy_RGB.png')",
        backgroundBlendMode: "normal, soft-light",
        backgroundRepeat: "repeat",
        backgroundSize: "560px auto",
        backgroundPosition: "center",
        // height + centering rails/pane
        minHeight: "30vh",
        display: "flex",
        alignItems: "center",
      }}
      aria-label="Our Team"
    >
      {/* Rail (edge-to-edge, ABOVE the glass) */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: "38%", // rail position
          height: 12,
          background:
            "linear-gradient(#e8eef2,#cfd6dc) padding-box, radial-gradient(200% 60% at 50% -40%, rgba(0,0,0,.25), rgba(0,0,0,0)) border-box",
          borderTop: "1px solid rgba(0,0,0,0.25)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 18px rgba(0,0,0,0.18)",
        }}
      />

      {/* Pane wrapper (centered) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-full px-6 sm:px-8"
        style={{ top: "42%" }} // ensure glass hangs below rail
      >
        <div className="mx-auto max-w-5xl relative">
          {/* Hangers – align with pane corners; sit on rail above */}
          <Hanger side="left" />
          <Hanger side="right" />

          {/* Glass pane */}
          <article
            className="rounded-2xl md:rounded-3xl backdrop-blur-xl relative shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(130,210,195,0.95), rgba(105,197,183,0.93))",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(0,58,93,0.08), 0 16px 34px rgba(0,24,32,0.22)",
            }}
          >
            {/* Corner mounts that the hangers meet */}
            <CornerMount pos="tl" />
            <CornerMount pos="tr" />
            <CornerMount pos="bl" />
            <CornerMount pos="br" />

            <div className="p-4 sm:p-5 md:p-6 lg:p-7">
              <header className="flex items-center gap-3 sm:gap-4">
                {member.headshot && (
                  <Image
                    src={member.headshot}
                    alt={`${member.name} headshot`}
                    width={56}
                    height={56}
                    className="rounded-full ring-2 ring-white/70 shadow"
                  />
                )}
                <div>
                  <h3
                    className="m-0 leading-tight"
                    style={{
                      color: "#053b5a",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      textShadow:
                        "0 1px 0 rgba(255,255,255,.65), 0 2px 6px rgba(0,40,60,.18)",
                    }}
                  >
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm md:text-[0.95rem] text-[rgba(6,51,68,.85)]">
                    {member.title}
                  </p>
                </div>
              </header>

              <div className="my-3 md:my-4 h-px w-full bg-white/55" />

              <p className="text-[rgba(18,44,54,.9)] leading-relaxed md:text-[1.05rem]">
                {member.blurb}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- Hardware bits ---------- */

function Hanger({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: "-22px", // starts above pane top so it touches the rail
        [isLeft ? "left" : "right"]: "26px",
        width: 22,
        height: 72,
      } as React.CSSProperties}
    >
      {/* Roller on rail */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 26,
          height: 26,
          borderRadius: "50%",
          background:
            "radial-gradient(60% 60% at 38% 35%, #ffffff, rgba(255,255,255,0) 60%), conic-gradient(from 210deg, #cfd5da, #8b939a, #e4eaee, #6a737b, #cfd5da)",
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,.7), inset 0 -1px 2px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.25)",
          border: "1px solid rgba(0,0,0,.15)",
          zIndex: 2,
        }}
      />
      {/* Strap */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: 6,
          height: 52,
          borderRadius: 3,
          background:
            "linear-gradient(180deg, #e9eef2, #c7d0d7 65%, #aab3ba 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(0,0,0,.25)",
        }}
      />
      {/* Small roller details on strap (like the ref image) */}
      <span
        style={dotOnStrap(30)}
      />
      <span
        style={dotOnStrap(46)}
      />
    </div>
  );
}

function dotOnStrap(topPx: number): React.CSSProperties {
  return {
    position: "absolute",
    top: topPx,
    left: "50%",
    transform: "translateX(-50%)",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background:
      "radial-gradient(60% 60% at 38% 35%, #ffffff, rgba(255,255,255,0) 60%), conic-gradient(from 210deg, #cfd5da, #8b939a, #e4eaee, #6a737b, #cfd5da)",
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,.7), inset 0 -1px 2px rgba(0,0,0,.25)",
    border: "1px solid rgba(0,0,0,.15)",
  };
}

function CornerMount({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map: Record<typeof pos, React.CSSProperties> = {
    tl: { top: 14, left: 14 },
    tr: { top: 14, right: 14 },
    bl: { bottom: 14, left: 14 },
    br: { bottom: 14, right: 14 },
  };
  return (
    <span
      aria-hidden
      className="absolute"
      style={{
        ...map[pos],
        width: 14,
        height: 14,
        borderRadius: "9999px",
        background:
          "radial-gradient(70% 70% at 35% 30%, rgba(255,255,255,.9), rgba(255,255,255,0) 60%), conic-gradient(from 210deg, #c6ccd1, #8e959b, #d7dce0, #5f676f, #c6ccd1)",
        boxShadow:
          "inset 0 1px 2px rgba(255,255,255,.65), inset 0 -1px 2px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.25)",
        border: "1px solid rgba(0,0,0,.15)",
      }}
    />
  );
}
