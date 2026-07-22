import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import {
  getAlternateUrls,
  getEnabledLocales,
  getPageWithTranslation,
  listPagesByTemplateRaw,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const [locales, pages] = await Promise.all([
    getEnabledLocales(),
    listPagesByTemplateRaw("services"),
  ]);
  const codes = locales.map((l) => l.code);
  return pages.flatMap((p) => codes.map((locale) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation(slug, locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls(slug)).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function ServicesPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = await getPageWithTranslation(slug, code);
  if (!page || page.page.template !== "services") notFound();

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb="Services"
        image={page.translation.hero_image}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="post-content text-gray-600"
          dangerouslySetInnerHTML={{ __html: page.translation.content }}
        />
      </div>
    </>
  );
}
