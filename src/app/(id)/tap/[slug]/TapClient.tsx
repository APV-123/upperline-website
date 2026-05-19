"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { QrCode } from "lucide-react";
import Image from "next/image";


declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
const pushDL = (evt: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(evt);
  }
};

const BRAND = { navy: "#003a5d", turq: "#31c8db", warm: "#d8d2c3" };

export function TapClient({
  metWith,
  headshot,
  vcf,
  title,
  slug,
}: {
  metWith: string;
  headshot: string;
  vcf: string;
  title: string;
  slug: string;
}) {
  const [showQR, setShowQR] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    company: "",
    jobtitle: "", // Role
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const MotionImage = motion(Image);
  useEffect(() => {
    pushDL({ event: "tap_page_view", tap_owner: slug });
  }, [slug]);

  useEffect(() => {
    if (isFormOpen) firstInputRef.current?.focus();
  }, [isFormOpen]);

  const wrap: React.CSSProperties = {
    background: BRAND.navy,
    color: "#fff",
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    paddingTop: "max(24px, env(safe-area-inset-top))",
    paddingBottom: "max(24px, env(safe-area-inset-bottom))",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const card: React.CSSProperties = {
    position: "relative",
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 560,
    textAlign: "center",
    boxShadow: "0 10px 26px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.16)",
  };

  const btn = (bg: string, color: string): React.CSSProperties => ({
    display: "block",
    textAlign: "center",
    padding: "16px 18px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 600,
    marginTop: 12,
    background: bg,
    color,
    boxShadow: "0 6px 18px rgba(0,0,0,.15)",
    transition: "transform .08s ease-out, filter .12s ease-out",
  });

  const fieldStyle =
    "w-full rounded-xl px-4 py-3 text-[15px] bg-white/5 text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-[#31c8db] focus:border-transparent";
  const labelStyle = "block text-left text-white/75 text-sm mb-1";

  const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOk(null);

    const payload = {
      ...formData,
      met_with: metWith,
      source_detail: "Tap → Networking",
      pageUrl: `https://upperlineco.com/tap/${slug}`,
      pageName: `Tap: ${metWith}`,
      website: (document.getElementById("website") as HTMLInputElement)?.value ?? "",
    };

    const res = await fetch("/api/tap/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setOk(json.ok === true);
    setLoading(false);

    pushDL({
      event: "tap_share_submit",
      status: json.ok ? "success" : "error",
      met_with: metWith,
    });
  }

  return (
    <div style={wrap}>
      <motion.div
        style={{ textAlign: "center", marginBottom: 18 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Image
          src="/Upperline-logo-inverted.png"
          alt="Upperline"
          width={160}
          height={60}
          style={{ margin: "0 auto 16px" }}
        />

      </motion.div>

      <motion.div style={card} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.28 }}>
        {/* QR toggle */}
        <button
          onClick={() => {
            setShowQR((s) => {
              const next = !s;
              pushDL({ event: next ? "tap_show_qr" : "tap_show_card", tap_owner: slug });
              return next;
            });
          }}
          aria-pressed={showQR}
          aria-label={showQR ? "Show business card" : "Show QR code"}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showQR ? <span style={{ fontSize: 12, fontWeight: 600 }}>×</span> : <QrCode size={18} strokeWidth={2} />}
        </button>

        {!showQR ? (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              style={{ marginBottom: 16, display: "inline-block" }}
            >
              <Image
                src={headshot}
                alt={metWith}
                width={120}
                height={120}
                sizes="120px"
                style={{
                  objectFit: "cover",
                  objectPosition: "center top",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 10px 22px rgba(0,0,0,.30)",
                  display: "block",
                }}
              />
            </motion.div>

            <motion.h1
              style={{ margin: "0 0 4px", fontSize: 22, letterSpacing: 0.3 }}
              {...fadeUp}
              transition={{ duration: 0.35 }}
            >
              {metWith}
            </motion.h1>

            <motion.p
              style={{ margin: "0 0 16px", fontSize: 14, color: BRAND.turq }}
              {...fadeUp}
              transition={{ duration: 0.35 }}
            >
              {title}
            </motion.p>

            {!isFormOpen ? (
              <>
                <motion.a
                  href={vcf}
                  style={btn("#fff", "#000")}
                  {...fadeUp}
                  transition={{ duration: 0.35 }}
                  onClick={() =>
                    pushDL({ event: "tap_vcard_click", tap_owner: slug })
                  }
                >
                  Save my contact (vCard)
                </motion.a>

                <motion.a
                  href="https://portal.upperlineco.com"
                  style={btn("#fff", "#000")}
                  {...fadeUp}
                  transition={{ duration: 0.35 }}
                  onClick={() =>
                    pushDL({
                      event: "tap_active_deals_click",
                      tap_owner: slug,
                    })
                  }
                >
                  View Active Deals
                </motion.a>

                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(true);
                    pushDL({ event: "tap_share_open", tap_owner: slug });
                  }}
                  style={{
                    ...btn(BRAND.turq, "#002333"),
                    width: "100%",
                  }}
                >
                  Share your info
                </button>
              </>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-3 space-y-4"
                style={{ textAlign: "left" }}
              >
                {/* Row 1: First/Last */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first" className={labelStyle}>
                      First name <span className="text-white/50">*</span>
                    </label>
                    <input
                      id="first"
                      ref={firstInputRef}
                      className={fieldStyle}
                      value={formData.firstname}
                      onChange={(e) =>
                        setFormData({ ...formData, firstname: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="last" className={labelStyle}>
                      Last name <span className="text-white/50">*</span>
                    </label>
                    <input
                      id="last"
                      className={fieldStyle}
                      value={formData.lastname}
                      onChange={(e) =>
                        setFormData({ ...formData, lastname: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelStyle}>
                    Email <span className="text-white/50">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={fieldStyle}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl px-5 py-3 font-semibold bg-[#31c8db] text-[#002333]"
                  >
                    {loading ? "Sending…" : "Share your info"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="text-white/80 underline"
                  >
                    Cancel
                  </button>
                </div>

                {ok === true && (
                  <p className="text-emerald-400 text-sm">
                    Thanks! We’ve got your info.
                  </p>
                )}

                {ok === false && (
                  <p className="text-rose-400 text-sm">
                    Something went wrong. Try again.
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <MotionImage
            src={`/qr/qr-${slug}.png`}
            alt={`QR code for ${metWith}`}
            width={420}
            height={420}
            style={{
              width: "84%",
              maxWidth: 420,
              height: "auto",
              margin: "8px auto 4px",
              display: "block",
              background: "#fff",
              borderRadius: 12,
              padding: 12,
            }}
          />
        )}
      </motion.div>
    </div >
  );
}
