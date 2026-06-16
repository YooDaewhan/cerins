import type { MetadataRoute } from "next";
import {
  getEnabledLocales,
  getPosts,
  listPublishedPages,
  urlForPage,
} from "@/src/lib/mockRepository";
import { buildLocalizedPath } from "@/src/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cerins.example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = getEnabledLocales();
  const localeCodes = locales.map((l) => l.code);
  const pages = listPublishedPages();

  const pageEntries: MetadataRoute.Sitemap = pages.flatMap((p) =>
    locales.map((l) => ({
      url: SITE_URL + urlForPage(p, l.code),
      lastModified: p.updated_at,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alt) => [alt.code, SITE_URL + urlForPage(p, alt.code)]),
        ),
      },
    })),
  );

  // News posts (single-locale today — same slug surfaces under each locale URL).
  const postEntries: MetadataRoute.Sitemap = getPosts("news", "ko").flatMap((post) =>
    localeCodes.map((code) => ({
      url: SITE_URL + buildLocalizedPath(code, `/news/${post.slug}`),
      lastModified: post.updated_at,
    })),
  );

  return [...pageEntries, ...postEntries];
}
