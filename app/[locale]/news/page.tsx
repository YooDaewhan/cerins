import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAlternateUrls,
  getPageWithTranslation,
  getPostAuthor,
  getPosts,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import PageHero from "@/components/PageHero";
import NewsListClient, { type NewsListRow } from "./NewsListClient";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getPageWithTranslation("news", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        getAlternateUrls("news").map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function NewsListPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const root = getPageWithTranslation("news", code);
  if (!root) notFound();

  const posts = getPosts("news", code);

  const rows: NewsListRow[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    published_at: p.published_at,
    author: getPostAuthor(p.id),
  }));

  return (
    <>
      <PageHero
        title={root.translation.title}
        subtitle={root.translation.subtitle}
        breadcrumb="News"
        image={root.translation.hero_image}
      />
      <NewsListClient rows={rows} locale={code} />
    </>
  );
}
