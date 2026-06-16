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

export function generateStaticParams() {
  const codes = getEnabledLocales().map((l) => l.code);
  return listPagesByTemplateRaw("services").flatMap((p) =>
    codes.map((locale) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = getPageWithTranslation(slug, locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        getAlternateUrls(slug).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function ServicesPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = getPageWithTranslation(slug, code);
  if (!page || page.page.template !== "services") notFound();

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb="Services"
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {page.translation.content.map((block) => (
          <div key={block.heading} className="mb-10">
            <h2 className="text-xl font-bold text-(--brand) mb-3 flex items-center gap-3">
              <span className="w-1 h-5 bg-[#c9a84c] rounded block" />
              {block.heading}
            </h2>
            <p className="text-gray-600 leading-relaxed">{block.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
