import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import {
  buildLocalizedPath,
  getAlternateUrls,
  getEnabledLocales,
  getPageWithTranslation,
  listPagesByTemplate,
  listPagesByTemplateRaw,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string; country: string; item: string }>;
}

export async function generateStaticParams() {
  const [locales, pages] = await Promise.all([
    getEnabledLocales(),
    listPagesByTemplateRaw("certification"),
  ]);
  const codes = locales.map((l) => l.code);
  const byId = new Map(pages.map((p) => [p.id, p]));
  return pages
    .filter((p) => p.parent_id != null && byId.has(p.parent_id))
    .flatMap((p) =>
      codes.map((locale) => ({
        locale,
        country: byId.get(p.parent_id!)!.slug,
        item: p.slug,
      })),
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, item } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation(item, locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls(item)).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function CertificationItemPage({ params }: Props) {
  const { locale, country, item } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const parent = await getPageWithTranslation(country, code);
  if (
    !parent ||
    parent.page.template !== "certification" ||
    parent.page.parent_id != null ||
    parent.page.slug === "certification"
  )
    notFound();

  const page = await getPageWithTranslation(item, code);
  if (
    !page ||
    page.page.template !== "certification" ||
    page.page.parent_id !== parent.page.id
  )
    notFound();

  const siblings = await listPagesByTemplate(
    "certification",
    code,
    parent.page.id,
  );

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb={`Certification · ${parent.translation.title}`}
        image={page.translation.hero_image ?? parent.translation.hero_image}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#f8f9fc] border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-(--brand)">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {parent.translation.title}
                </span>
              </div>
              <nav className="py-2">
                {siblings.map((s) => (
                  <Link
                    key={s.page.id}
                    href={buildLocalizedPath(
                      code,
                      `/certification/${country}/${s.page.slug}`,
                    )}
                    className={`block px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      s.page.slug === item
                        ? "border-[#c9a84c] text-(--brand) font-semibold bg-white"
                        : "border-transparent text-gray-500 hover:text-(--brand) hover:bg-white"
                    }`}
                  >
                    {s.translation.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div
              className="post-content text-gray-600"
              dangerouslySetInnerHTML={{ __html: page.translation.content }}
            />

            <div className="mt-12 bg-(--brand) rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-base mb-1">
                  Need a certification quote?
                </p>
                <p className="text-gray-400 text-sm">
                  Our experts will review your product and provide a detailed proposal.
                </p>
              </div>
              <Link
                href={buildLocalizedPath(code, "/contact")}
                className="flex-shrink-0 px-6 py-2.5 bg-[#c9a84c] text-(--brand) font-semibold text-sm rounded hover:bg-[#b8973b] transition"
              >
                Request a Quote
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link
                href={buildLocalizedPath(code, `/certification/${country}`)}
                className="text-sm text-gray-400 hover:text-(--brand) transition flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to {parent.translation.title}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
