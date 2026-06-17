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
  const page = await getPageWithTranslation("about", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls("about")).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function AboutIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const root = await getPageWithTranslation("about", code);
  if (!root) notFound();

  // All "about" detail pages — section root excluded by slug.
  const items = (await listPagesByTemplate("about", code)).filter(
    (p) => p.page.slug !== "about",
  );

  return (
    <>
      <PageHero
        title={root.translation.title}
        subtitle={root.translation.subtitle}
        breadcrumb="About"
        image={root.translation.hero_image}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.page.id}
              href={buildLocalizedPath(code, `/about/${item.page.slug}`)}
              className="group border border-gray-200 rounded-lg p-6 hover:border-(--brand) hover:shadow-md transition-all"
            >
              <div className="w-8 h-0.5 bg-(--brand) mb-4" />
              <h2 className="text-base font-bold text-(--brand) mb-2 group-hover:text-(--brand) transition-colors">
                {item.translation.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.translation.meta_description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-(--brand)">
                Read more
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
