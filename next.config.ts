import type { NextConfig } from "next";
import { CANONICAL_HOST } from "./src/lib/site";

// Keep every non-canonical host (bare IP, staging) out of search results.
// Lives here rather than in proxy.ts because next.config headers are
// applied before the filesystem, so they also cover /public files (brochures,
// uploads) and sitemap.xml — paths the proxy matcher deliberately skips.
// `missing` inverts the match: the header is set only when host is NOT canonical.
const noindexNonCanonical = {
  source: "/:path*",
  missing: [{ type: "host" as const, value: CANONICAL_HOST.replaceAll(".", "\\.") }],
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
};

const nextConfig: NextConfig = {
  headers: async () => [noindexNonCanonical],
  // Old PHP-site URLs (e.g. /main?mc_code=1010) still sit in Google's index →
  // send them home instead of a 404.
  // ponytail: no per-mc_code mapping; add one if a specific old page needs its own target.
  redirects: async () => [
    { source: "/main", destination: "/", permanent: true },
    { source: "/main/:path*", destination: "/", permanent: true },
    // Google Ads final URL is https://cerins.net/en_main/ — must not 404 or ads get disapproved.
    { source: "/en_main", destination: "/en", permanent: true },
    { source: "/en_main/:path*", destination: "/en", permanent: true },
  ],
  serverExternalPackages: ["pizzip", "sharp"],
  allowedDevOrigins: ["192.168.20.232", "172.30.1.35"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
