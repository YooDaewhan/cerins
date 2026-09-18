import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { CANONICAL_HOST, isCanonicalHost } from "@/src/lib/site";

// Phase switch for getting the bare-IP URLs out of Google.
//
// false (now): non-canonical hosts stay crawlable so Googlebot can read the
//   "X-Robots-Tag: noindex" header from middleware.ts and drop them. A
//   "Disallow: /" here would block that crawl and freeze them in the index.
// true (after "site:<ip>" returns nothing): flip to hard-block the crawl.
//
// ponytail: a constant, not an env var — this gets flipped exactly once.
const BLOCK_NON_CANONICAL_CRAWL = false;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  if (!isCanonicalHost(host)) {
    return {
      rules: BLOCK_NON_CANONICAL_CRAWL
        ? { userAgent: "*", disallow: "/" }
        : { userAgent: "*", allow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${CANONICAL_HOST}/sitemap.xml`,
  };
}
