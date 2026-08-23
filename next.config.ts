import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js loads its supported Node graphics primitives through a dynamic
  // require. Keep both packages external so Vercel traces the native canvas
  // package and its platform binary into the verification function.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],

  async headers() {
    return [
      {
        // Keep meet and tap URLs out of search results
        source: "/meet",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex, nosnippet" },
        ],
      },
      {
        source: "/tap/:handle",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex, nosnippet" },
        ],
      },
    ];
  },
};

export default nextConfig;
