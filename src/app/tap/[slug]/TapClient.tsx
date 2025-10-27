"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode } from "lucide-react";

declare global {
  interface Window { dataLayer?: Array<Record<string, unknown>> }
}
const pushDL = (evt: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(evt);
  }
};

const BRAND = { navy: "#003a5d", turq: "#31c8db", warm: "#d8d2c3" };

export function TapClient({
  metWith, headshot, vcf, title, slug,
}: { metWith: string; headshot: string; vcf: string; title: string; slug: string }) {
  const [showQR, setShowQR] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);                 // NEW
  const [formData, setFormData] = useState({
    firstname: "", lastname: "", email: "", phone: "", company: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => { pushDL({ event: "tap_page_view", tap_owner: slug }); }, [slug]);

  // ... styles omitted for brevity (keep yours as-is)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setOk(null);

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

    pushDL({ event: "tap_share_submit", status: json.ok ? "success" : "error", met_with: metWith });
  }

  // UI
  return (
    <div style={{ background: BRAND.navy, color: "#fff", minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <motion.div style={{ textAlign: "center", marginBottom: 18 }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <img src="/Upperline-logo-inverted.png" alt="Upperline" style={{ width: "min(160px, 40vw)" }} />
      </motion.div>

      <motion.div
        style={{
          position: "relative", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, textAlign: "center",
          boxShadow: "0 10px 26px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.16)",
        }}
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.28 }}
      >
        {/* QR toggle */}
        <button
          onClick={() => {
            setShowQR(s => { const next = !s; pushDL({ event: next ? "tap_show_qr" : "tap_show_card", tap_owner: slug }); return next; });
          }}
          aria-pressed={showQR}
          aria-label={showQR ? "Show business card" : "Show QR code"}
          style={{
            position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.12)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10,
            padding: "6px 10px", cursor: "pointer", fontSize: 12, backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {showQR ? <span style={{ fontSize: 12, fontWeight: 600 }}>×</span> : <QrCode size={18} strokeWidth={2} />}
        </button>

        {!showQR && (
          <>
            {/* Header */}
            <motion.img
              src={headshot} alt={metWith}
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", marginBottom: 16,
                border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 10px 22px rgba(0,0,0,.30)" }}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            />
            <motion.h1 style={{ margin: "0 0 4px", fontSize: 22, letterSpacing: 0.3 }}>{metWith}</motion.h1>
            <motion.p style={{ margin: "0 0 16px", fontSize: 14, color: BRAND.turq }}>{title}</motion.p>

            {/* vCard button stays in both states */}
            <motion.a
              href={vcf}
              style={{ display: "block", textAlign: "center", padding: "16px 18px", borderRadius: 12, fontWeight: 600,
                marginTop: 12, background: "#fff", color: "#000", boxShadow: "0 6px 18px rgba(0,0,0,.15)" }}
              onClick={() => pushDL({ event: "tap_vcard_click", tap_owner: slug })}
            >
              Save my contact (vCard)
            </motion.a>

            {/* CTA state vs Form state */}
            {!isFormOpen ? (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(true); pushDL({ event: "tap_share_open", tap_owner: slug }); }}
                  style={{
                    display: "block", width: "100%", textAlign: "center", padding: "16px 18px",
                    borderRadius: 12, fontWeight: 600, marginTop: 12, background: BRAND.turq,
                    color: "#002333", boxShadow: "0 6px 18px rgba(0,0,0,.15)"
                  }}
                >
                  Share your info
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" style={{ marginTop: 12 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2 bg-transparent text-white border-white/20"
                         placeholder="First name *" value={formData.firstname}
                         onChange={e => setFormData({ ...formData, firstname: e.target.value })} required />
                  <input className="border rounded-lg px-3 py-2 bg-transparent text-white border-white/20"
                         placeholder="Last name *" value={formData.lastname}
                         onChange={e => setFormData({ ...formData, lastname: e.target.value })} required />
                </div>

                <input className="border rounded-lg px-3 py-2 w-full bg-transparent text-white border-white/20"
                       type="email" placeholder="Email *" value={formData.email}
                       onChange={e => setFormData({ ...formData, email: e.target.value })} required />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2 bg-transparent text-white border-white/20"
                         placeholder="Phone" value={formData.phone}
                         onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2 bg-transparent text-white border-white/20"
                         placeholder="Company" value={formData.company}
                         onChange={e => setFormData({ ...formData, company: e.target.value })} />
                </div>

                <textarea className="border rounded-lg px-3 py-2 w-full bg-transparent text-white border-white/20"
                          placeholder="Notes (what we discussed, timeline, etc.)" rows={4}
                          value={formData.notes}
                          onChange={e => setFormData({ ...formData, notes: e.target.value })} />

                {/* honeypot */}
                <input id="website" name="website" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} autoComplete="off" />

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={loading}
                          style={{ display: "block", textAlign: "center", padding: "16px 18px",
                                   borderRadius: 12, fontWeight: 600, background: BRAND.turq, color: "#002333" }}>
                    {loading ? "Sending…" : "Share your info"}
                  </button>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="underline text-white/80">
                    Cancel
                  </button>
                </div>

                {ok === true && <p className="text-green-500 text-sm">Thanks! We’ve got your info.</p>}
                {ok === false && <p className="text-red-400 text-sm">Something went wrong. Try again or email admin@upperlineco.com.</p>}
              </form>
            )}
          </>
        )}

        {showQR && (
          <motion.img
            src={`/qr/qr-${slug}.png`} alt={`QR code for ${metWith}`}
            style={{ width: "84%", maxWidth: 420, height: "auto", margin: "8px auto 4px", display: "block",
                     background: "#fff", borderRadius: 12, padding: 12 }}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
          />
        )}
      </motion.div>
    </div>
  );
}
