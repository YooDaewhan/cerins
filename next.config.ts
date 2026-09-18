import type { NextConfig } from "next";
import { CANONICAL_HOST } from "./src/lib/site";

// Keep every non-canonical host (bare IP, staging) out of search results.
// Lives here rather than in middleware.ts because next.config headers are
// applied before the filesystem, so they also cover /public files (brochures,
// uploads) and sitemap.xml — paths the middleware matcher deliberately skips.
// `missing` inverts the match: the header is set only when host is NOT canonical.
// No canonical host configured yet → noindex everything, everywhere.
const noindexNonCanonical = {
  source: "/:path*",
  missing: CANONICAL_HOST
    ? [{ type: "host" as const, value: CANONICAL_HOST.replaceAll(".", "\\.") }]
    : undefined,
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
};

const nextConfig: NextConfig = {
  headers: async () => [noindexNonCanonical],
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
