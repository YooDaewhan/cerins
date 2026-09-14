import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import SidePhoto from "@/components/SidePhoto";
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
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const [locales, pages] = await Promise.all([
    getEnabledLocales(),
    listPagesByTemplateRaw("inspection"),
  ]);
  const codes = locales.map((l) => l.code);
  return pages
    .filter((p) => p.slug !== "inspection" && p.parent_id == null)
    .flatMap((p) => codes.map((locale) => ({ locale, slug: p.slug })));
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

export default async function InspectionDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = await getPageWithTranslation(slug, code);
  if (
    !page ||
    page.page.template !== "inspection" ||
    page.page.slug === "inspection" ||
    page.page.parent_id != null
  )
    notFound();

  const [sideNavAll, children] = await Promise.all([
    listPagesByTemplate("inspection", code, null),
    listPagesByTemplate("inspection", code, page.page.id),
  ]);
  const sideNav = sideNavAll.filter((p) => p.page.slug !== "inspection");

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb="Inspection"
        image={page.translation.hero_image}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#f8f9fc] border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#4C4C3C]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Inspection</span>
              </div>
              <nav className="py-2">
                {sideNav.map((item) => (
                  <Link
                    key={item.page.id}
                    href={buildLocalizedPath(code, `/inspection/${item.page.slug}`)}
                    className={`block px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      item.page.slug === slug
                        ? "border-[#c9a84c] text-(--brand) font-semibold bg-white"
                        : "border-transparent text-gray-500 hover:text-(--brand) hover:bg-white"
                    }`}
                  >
                    {item.translation.title}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-4 border border-gray-100 rounded-lg p-4 bg-white">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Enquiries</p>
              <p className="text-sm text-gray-600 mb-3">Have a project in mind? Reach out to our inspection team.</p>
              <Link
                href={buildLocalizedPath(code, "/contact")}
                className="block text-center text-xs font-semibold text-white bg-(--brand) px-4 py-2 rounded hover:bg-[#0d2a5a] transition"
              >
                Contact Us
              </Link>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {children.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-6 bg-[#c9a84c] rounded" />
                  <h2 className="text-xl font-bold text-(--brand)">세부 항목</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {children.map((c) => (
                    <Link
                      key={c.page.id}
                      href={buildLocalizedPath(
                        code,
                        `/inspection/${slug}/${c.page.slug}`,
                      )}
                      className="group flex items-start justify-between gap-3 border border-gray-200 rounded-lg p-4 hover:border-(--brand) hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-(--brand) mb-1 truncate">
                          {c.translation.title}
                        </h3>
                        {c.translation.meta_description && (
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                            {c.translation.meta_description}
                          </p>
                        )}
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-(--brand) transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div
              className="post-content text-gray-600"
              dangerouslySetInnerHTML={{ __html: page.translation.content }}
            />


            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link href={buildLocalizedPath(code, "/inspection")} className="text-sm text-gray-400 hover:text-(--brand) transition flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Inspection
              </Link>
            </div>
          </div>
          <SidePhoto
            url={page.translation.side_image}
            alt={page.translation.title}
          />
        </div>
      </div>
    </>
  );
}
