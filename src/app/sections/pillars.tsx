"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";

const NAVY  = "#003a5d";
const MUTED = "rgba(31,51,64,.82)";

type CSSVarStyle = React.CSSProperties & Record<"--navy" | "--muted", string>;

const PILLARS = [
  {
    title: "Investment",
    body:
      "We target high-growth markets across development, value-add, and covered-land strategies, building a diversified portfolio designed for stability and long-term returns.",
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

export default function Pillars() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isAnyOpen = openIndex !== null;

  // click-outside to close
  const openRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isAnyOpen) return;
    const onDown = (e: MouseEvent) => {
      if (openRef.current && !openRef.current.contains(e.target as Node)) setOpenIndex(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isAnyOpen]);

  // pointer-coarse guard
  const coarse =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  const onGlassMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (coarse) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--mx", String(x));
    e.currentTarget.style.setProperty("--my", String(y));
  };
  const onGlassLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (coarse) return;
    e.currentTarget.style.removeProperty("--mx");
    e.currentTarget.style.removeProperty("--my");
  };
  const sectionStyle: CSSVarStyle = {
    "--navy": NAVY,
    "--muted": MUTED,
    backgroundColor: "white",
    backgroundImage:
      "linear-gradient(rgba(0,58,93,0.06), rgba(0,58,93,0.06)), url('/Upperline_IconPattern3Outline_Navy_RGB.png')",
    backgroundRepeat: "repeat",
    backgroundSize: "560px auto",
    backgroundPosition: "center top",
  };

  return (
    <section
      aria-label="Upperline pillars"
      className="relative flex items-center min-h-[30vh] py-20 md:py-28"
      style={sectionStyle}
    >
      {/* Global styles */}
      <style jsx global>{`
        /* ---------- motion ---------- */
        @keyframes sheenSlide {
          0%   { transform: translateX(-120%); opacity: 0; }
          30%  { opacity: .35; }
          60%  { opacity: .22; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px) scale(0.996); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        /* one-pass seesaw: right -> left -> settle */
        @keyframes seesawX {
          0%   { transform: translateX(8px); }
          60%  { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
        .animate-seesaw { animation: seesawX 1200ms cubic-bezier(.22,1,.24,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .animate-sheen, .anim-fadeInUp, .animate-seesaw { animation: none !important; }
          .glass-3d { transform: none !important; }
          .specular { display: none !important; }
        }

        /* ---------- bases ---------- */
        .card-wrap { position: relative; transition: transform .3s ease, box-shadow .3s ease; }
        .card-surface { position: relative; overflow: hidden; }
        .glass-backplate { position: absolute; inset: -2px; border-radius: inherit; pointer-events: none; }

        /* ---------- CLOSED glass (darker, more opaque) ---------- */
        .glass-closed{
            border-radius: 1rem;
            background: linear-gradient(180deg, rgba(0,64,84,.86), rgba(0,58,78,.84)); /* was .78/.76 */
            backdrop-filter: blur(14px) saturate(130%);
            -webkit-backdrop-filter: blur(14px) saturate(130%);
            border: 1px solid rgba(255,255,255,.14);
            box-shadow:
                inset 0 1px 0 rgba(255,255,255,.10),
                inset 0 -1px 0 rgba(0,0,0,.18),
                0 14px 32px rgba(0,20,28,.35);
        }

        .glass-closed > .glass-backplate {
          background: rgba(0,28,40,0.35);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        /* ---------- CLOSED title: modern, high-contrast, readable ---------- */
        .closed-title{
        position: relative;
        color: rgba(248, 252, 255, .98);     /* near-white */
        font-weight: 650;
        letter-spacing: 0.01em;
        -webkit-text-stroke: .25px rgba(0,15,25,.28);  /* hairline edge for clarity */
        text-shadow:
            0 1px 2px rgba(0,0,0,.45),                  /* lift off the glass */
            0 0 1px rgba(0,0,0,.25);
        transition: color .18s ease, text-shadow .18s ease, transform .18s ease;
        }

        /* faint, narrow plate that only sits behind the glyphs; no “chip” look */
        .closed-title::before{
        content:"";
        position:absolute;
        inset: -0.12em -0.35em;                /* hugs the text */
        border-radius: 4px;
        background: rgba(0,0,0,.16);           /* subtle separation from pane */
        filter: blur(.6px);
        opacity: .85;
        z-index: -1;                           /* behind the text only */
        }

       
        /* When hovering, remove the dark underlay behind title */
        .card-wrap:hover .closed-title::before,
        .card-wrap:focus-within .closed-title::before {
        opacity: 0;
        transition: opacity 0.25s ease;
        }

        /* Slight text brightening on hover */
        .card-wrap:hover .closed-title,
        .card-wrap:focus-within .closed-title {
        color: #fff;
        text-shadow:
            0 2px 5px rgba(0,0,0,0.35),
            0 0 4px rgba(255,255,255,0.25);
        transform: translateY(-0.5px);
        }



        /* ---------- OPEN glass (rectangular + sea-glass) ---------- */
        .glass-open {
          border-radius: 0;
          background-image:
            linear-gradient(180deg,
              rgba(130,210,195,0.98) 0%,
              rgba(112,198,183,0.96) 50%,
              rgba(96,188,173,0.95) 100%
            ),
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='1.1' numOctaves='2' stitchTiles='stitch' type='fractalNoise'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.02 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>");
          background-blend-mode: screen, multiply;
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(0,0,0,0.08),
            0 16px 34px rgba(0,24,32,0.22),
            0 0 0 1px rgba(0,58,93,0.08);
          transform: scale(1.02);
          transition: transform 320ms cubic-bezier(.22,1,.36,1);
          position: relative;
        }
        
        .glass-open > .glass-backplate {
          background: rgba(255,255,255,0.68);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .glass-open::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(0,0,0,0.08));
          mix-blend-mode: overlay; pointer-events: none;
        }

        /* Bevel ring + contact shadow (3D) */
        .glass-3d::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: conic-gradient(
            from 210deg at 50% 50%,
            rgba(255,255,255,.55),
            rgba(255,255,255,.22) 30%,
            rgba(0,40,60,.12) 55%,
            rgba(255,255,255,.35) 75%,
            rgba(255,255,255,.55)
          );
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 10px; box-shadow: inset 0 0 6px rgba(255,255,255,0.25);
          box-sizing: border-box; opacity: .7;
        }
        .glass-3d::after {
          content: ""; position: absolute; left: 2%; right: 2%; bottom: -16px; height: 34px;
          background: radial-gradient(60% 120% at 50% 0, rgba(0,0,0,.26), rgba(0,0,0,0));
          filter: blur(10px); opacity: .45; pointer-events: none;
        }

        /* specular highlight follows mouse */
        .specular {
          position: absolute; inset: -1px; pointer-events: none;
          mix-blend-mode: screen;
          background: radial-gradient(220px 160px at calc((var(--mx,.5))*100%) calc((var(--my,.22))*100%),
            rgba(255,255,255,.38), rgba(255,255,255,0) 60%);
          transition: opacity .2s ease; opacity: .55;
        }
        .glass-3d {
          perspective: 900px;
          transform: perspective(900px)
            rotateX(calc((.5 - var(--my,.5)) * 2deg))
            rotateY(calc((var(--mx,.5) - .5) * 2deg))
            scale(1.02);
        }

        /* Painted-on/glossy title when OPEN */
        .title-gloss {
        position: relative;
        z-index: 2;                 /* sit above the glass layers */
        color: var(--navy);         /* solid ink, no background-clip */
        font-weight: 800;
        letter-spacing: -0.01em;
        isolation: isolate;         /* avoid blend with pane effects */

        /* “raised ink” feel: subtle white lift + soft depth */
        text-shadow:
            0 1px 0 rgba(255,255,255,.65),
            0 2px 6px rgba(0,40,60,.18);
        -webkit-text-stroke: .2px rgba(255,255,255,.22);
        }
        .title-gloss::after {
        content: "";
        position: absolute;
        left: -2%;
        right: -2%;
        top: 16%;
        height: 22%;
        pointer-events: none;
        /* a thin clear-coat highlight */
        background: linear-gradient(180deg,
            rgba(255,255,255,.48),
            rgba(255,255,255,0)
        );
        filter: blur(.7px);
        opacity: .9;
        mix-blend-mode: screen;      /* plays well on light/mid backgrounds */
        }

        .glass-open p { color: #4b5b63; text-shadow: 0 1px rgba(255,255,255,0.15); }
        /* ===== Stainless standoffs (corner hardware) ===== */
        :root { --mount-off: 18px; --mount-size: 14px; }

        .glass-hardware {
        position: absolute;
        inset: 0;
        pointer-events: none;          /* purely decorative */
        z-index: 3;                    /* above glass, below title gloss */
        }

        /* Base puck */
        .mount {
        position: absolute;
        width: var(--mount-size);
        height: var(--mount-size);
        border-radius: 9999px;
        /* stainless look: dark→light conic + soft radial highlight */
        background:
            radial-gradient(80% 80% at 35% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 60%),
            conic-gradient(
            from 210deg,
            #c6ccd1, #8e959b, #d7dce0, #5f676f, #c6ccd1
            );
        box-shadow:
            inset 0 1px 2px rgba(255,255,255,.6),
            inset 0 -1px 2px rgba(0,0,0,.25),
            0 2px 6px rgba(0,0,0,.25);
        border: 1px solid rgba(0,0,0,.15);
        transform: translateZ(0);      /* promote for crispness */
        }

        /* tiny screw/fastener dot */
        .mount::after {
        content: "";
        position: absolute; inset: 0;
        margin: 33%;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(0,0,0,.5), rgba(0,0,0,0) 70%);
        opacity: .35;
        }

        /* positions (inset from corners) */
        .mount-tl { top: var(--mount-off);  left:  var(--mount-off); }
        .mount-tr { top: var(--mount-off);  right: var(--mount-off); }
        .mount-bl { bottom: var(--mount-off); left:  var(--mount-off); }
        .mount-br { bottom: var(--mount-off); right: var(--mount-off); }
        /* ---- closed sizing + hardware-aware gutter ---- */
        :root{
          /* you already set these; redefining is harmless */
          --mount-off: 18px;
          --mount-size: 14px;

          /* keep title clear of mounts; auto-updates if you tweak hardware */
          --mount-gutter: calc(var(--mount-off) + var(--mount-size) + 10px);

          /* single source of truth for closed height */
          --card-closed-h: 64px;
        }

        /* responsive tweak */
        @media (max-width: 640px){
          :root{
            --mount-off: 14px;
            --mount-size: 12px;
            --mount-gutter: calc(var(--mount-off) + var(--mount-size) + 8px);
            --card-closed-h: 56px;
          }
        }

        /* uniform height + spacing when CLOSED */
        .is-closed .card-surface{ min-height: var(--card-closed-h); }
        .is-closed .title-button{
          min-height: var(--card-closed-h);
          padding-inline: var(--mount-gutter); /* <-- title stays away from hardware */
        }

        /* keep open state comfy (you already added some padding; this just formalizes it) */
        .is-open .title-button{
          padding-inline: calc(var(--mount-off) + 12px);
        }


        /* subtle parallax of the highlight based on mouse-tracked --mx/--my */
        .glass-3d .mount {
        background-position:
            calc(30% + (var(--mx, .5) - .5) * 8px)
            calc(28% + (var(--my, .22) - .22) * 8px),
            center;
        }

        /* slightly heavier contact shadow when the pane is OPEN */
        .glass-open .mount {
        box-shadow:
            inset 0 1px 2px rgba(255,255,255,.65),
            inset 0 -1px 2px rgba(0,0,0,.28),
            0 3px 10px rgba(0,0,0,.28);
        }

        /* Responsive tweak: smaller mounts on very narrow screens */
        @media (max-width: 420px) {
        :root { --mount-off: 14px; --mount-size: 12px; }
        }
        /* --- Improve text padding when open --- */
        .glass-open button,
        .glass-open .px-6 {
        padding-left: 2.5rem !important;  /* was 1.5rem via px-6 */
        padding-right: 2.5rem !important;
        }

        /* Add a touch more breathing room between top edge and title */
        .glass-open button {
        padding-top: 1.25rem !important;   /* slightly taller than default */
        }

        /* Give the paragraph area a bit more depth below */
        .glass-open .pb-6 {
        padding-bottom: 2rem !important;
        }

      `}</style>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className={[ 
          // more vertical gap on narrow screens; normal gap on md+
          "grid gap-x-6 gap-y-10 sm:gap-y-12 md:gap-y-6",
          isAnyOpen ? "md:grid-cols-1" : "md:grid-cols-3",
         ].join(" ")}
        >
          {(isAnyOpen ? [PILLARS[openIndex!]] : PILLARS).map((p, i) => {
            const idx = isAnyOpen ? openIndex! : i;
            const isOpen = isAnyOpen;

            return (
              <div
                key={p.title}
                ref={isOpen ? openRef : null}
                className={[
                  "card-wrap ring-1 group",
                  isOpen
                    ? "ring-white/20"
                    : "is-closed rounded-2xl ring-white/10 hover:-translate-y-1 hover:shadow-2xl hover:ring-[#69a43a]/55",
                ].join(" ")}
                style={{
                  boxShadow: isOpen ? "0 16px 34px rgba(0,24,32,.22)" : "0 14px 32px rgba(0,20,28,.35)",
                }}
              >
                {/* subtle sheen only when closed */}
                {!isOpen && (
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <span
                      className="absolute top-0 bottom-0 w-1/3 animate-sheen opacity-0 group-hover:opacity-100"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.18) 45%, rgba(255,255,255,0) 100%)",
                        animationDuration: "1.6s",
                        animationIterationCount: "infinite",
                      }}
                    />
                  </span>
                )}

                <div
                  className={[
                    "card-surface",
                    isOpen ? "glass-open glass-3d animate-seesaw" : "glass-closed",
                  ].join(" ")}
                  onMouseMove={isOpen ? onGlassMove : undefined}
                  onMouseLeave={isOpen ? onGlassLeave : undefined}
                  >
                    {/* corner hardware */}
                  <span className="glass-hardware">
                    <span className="mount mount-tl" />
                    <span className="mount mount-tr" />
                    <span className="mount mount-bl"/>
                    <span className="mount mount-br"/>
                  </span>

                  <span className="glass-backplate" aria-hidden="true" />
                  {isOpen && <span className="specular" aria-hidden="true" />}

                  {/* Title bar (click toggles) */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => (isOpen ? setOpenIndex(null) : setOpenIndex(idx))}
                    className={[
                      "title-button flex w-full items-center gap-3 px-6 py-5 select-none",
                      isOpen ? "justify-start" : "justify-center",
                    ].join(" ")}
                  >

                    {isOpen ? (
                      <h3 className="m-0 text-[1.15rem] md:text-xl title-gloss">{p.title}</h3>
                    ) : (
                      <h3 className="m-0 text-lg md:text-xl font-semibold tracking-tight closed-title">
                        {p.title}
                      </h3>
                    )}
                  </button>

                  {/* body */}
                  {isOpen && (
                    <div className="px-6 pb-6 pt-3" style={{ animation: "fadeInUp 260ms ease-out both" }}>
                      <div className="mb-3 border-t border-white/40" />
                      <p className="leading-relaxed">{p.body}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
