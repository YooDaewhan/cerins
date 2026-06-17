import type { MetadataRoute } from "next";
import {
  getEnabledLocales,
  getPosts,
  listPublishedPages,
  urlForPage,
} from "@/src/lib/mockRepository";
import { buildLocalizedPath } from "@/src/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cerins.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locales, pages, koreanPosts] = await Promise.all([
    getEnabledLocales(),
    listPublishedPages(),
    getPosts("news", "ko"),
  ]);
  const localeCodes = locales.map((l) => l.code);

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

  const postEntries: MetadataRoute.Sitemap = koreanPosts.flatMap((post) =>
    localeCodes.map((code) => ({
      url: SITE_URL + buildLocalizedPath(code, `/news/${post.slug}`),
      lastModified: post.updated_at,
    })),
  );

  return [...pageEntries, ...postEntries];
}
