import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAlternateUrls,
  getPageWithTranslation,
  getPosts,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import PageHero from "@/components/PageHero";
import FaqListClient, { type FaqListRow } from "./FaqListClient";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation("faq", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls("faq")).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function FaqListPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const [root, posts] = await Promise.all([
    getPageWithTranslation("faq", code),
    getPosts("faq", code),
  ]);
  if (!root) notFound();

  const rows: FaqListRow[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    published_at: p.published_at,
    author: p.author ?? "CERINS Editorial",
  }));

  return (
    <>
      <PageHero
        title={root.translation.title}
        subtitle={root.translation.subtitle}
        breadcrumb="FAQ"
        image={root.translation.hero_image}
      />
      <FaqListClient rows={rows} locale={code} />
    </>
  );
}
