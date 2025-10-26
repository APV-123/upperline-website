import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Short, wallet-friendly links → redirect to parameterized meet page
      {
        source: "/tap/:handle",
        destination: "/meet?o=:handle",
        permanent: false,
      },
    ];
  },

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
