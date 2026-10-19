import type { MetadataRoute } from "next";
import {
  getEnabledLocales,
  getPosts,
  listPublishedPages,
  urlForPage,
} from "@/src/lib/mockRepository";
import { buildLocalizedPath } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locales, pages, koreanPosts] = await Promise.all([
    getEnabledLocales(),
    listPublishedPages(),
    getPosts("news", "ko"),
  ]);
  const localeCodes = locales.map((l) => l.code);

  const slugById = new Map(pages.map((p) => [p.id, p.slug]));
  const parentSlugOf = (p: typeof pages[number]) =>
    p.parent_id != null ? slugById.get(p.parent_id) ?? null : null;

  const pageEntries: MetadataRoute.Sitemap = pages.flatMap((p) =>
    locales.map((l) => ({
      url: SITE_URL + urlForPage(p, l.code, parentSlugOf(p)),
      lastModified: new Date(p.updated_at),
      alternates: {
        languages: Object.fromEntries(
          locales.map((alt) => [alt.code, SITE_URL + urlForPage(p, alt.code, parentSlugOf(p))]),
        ),
      },
    })),
  );

  const postEntries: MetadataRoute.Sitemap = koreanPosts.flatMap((post) =>
    localeCodes.map((code) => ({
      url: SITE_URL + buildLocalizedPath(code, `/news/${post.slug}`),
      lastModified: new Date(post.updated_at),
    })),
  );

  return [...pageEntries, ...postEntries];
}
