import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import {
  buildLocalizedPath,
  getAlternateUrls,
  getPageWithTranslation,
  listPagesByTemplate,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation("certification", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls("certification")).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function CertificationIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const root = await getPageWithTranslation("certification", code);
  if (!root) notFound();

  const allCert = await listPagesByTemplate("certification", code, null);
  const items = allCert.filter((p) => p.page.slug !== "certification");

  return (
    <>
      <PageHero
        title={root.translation.title}
        subtitle={root.translation.subtitle}
        breadcrumb="Certification"
        image={root.translation.hero_image}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-gray-500 text-sm max-w-2xl mb-10">
          CERINS facilitates mandatory product certification for exporters entering regulated markets worldwide. Select a country or region below to learn about specific requirements and our service scope.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => (
            <Link
              key={c.page.id}
              href={buildLocalizedPath(code, `/certification/${c.page.slug}`)}
              className="group flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:border-(--brand) hover:shadow-md transition-all"
            >
              <div className="h-1.5 bg-(--brand) group-hover:bg-(--brand) transition-colors" />
              <div className="p-5 flex-1">
                <h2 className="text-base font-bold text-(--brand) mb-2 group-hover:text-(--brand) transition-colors">
                  {c.translation.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">{c.translation.meta_description}</p>
              </div>
              <div className="px-5 pb-4 flex items-center gap-1 text-xs font-semibold text-(--brand)">
                View details
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
