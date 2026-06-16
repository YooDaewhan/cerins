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

// MVP: tag derived from slug. Future: add a `tag` column on pages.
const SLUG_TAG: Record<string, string> = {
  "pre-shipment-inspection": "PSI",
  "india-voc": "VOC",
  "ndt": "NDT",
  "general-inspection": "QC",
  "other-services": "OTHER",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getPageWithTranslation("inspection", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        getAlternateUrls("inspection").map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function InspectionIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const root = getPageWithTranslation("inspection", code);
  if (!root) notFound();

  const items = listPagesByTemplate("inspection", code).filter(
    (p) => p.page.slug !== "inspection",
  );

  return (
    <>
      <PageHero
        title={root.translation.title}
        subtitle={root.translation.subtitle}
        breadcrumb="Inspection"
        image={root.translation.hero_image}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-gray-500 text-sm max-w-2xl mb-10">
          CERINS deploys certified inspectors across Korea, China, Vietnam, India, and Turkey — ensuring product quality, regulatory conformity, and on-time delivery for every shipment.
        </p>
        <div className="space-y-4">
          {items.map((svc) => (
            <Link
              key={svc.page.id}
              href={buildLocalizedPath(code, `/inspection/${svc.page.slug}`)}
              className="group flex items-start gap-5 border border-gray-200 rounded-lg p-6 hover:border-(--brand) hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 w-14 h-14 bg-[#f0f4fa] rounded-lg flex items-center justify-center group-hover:bg-(--brand) transition-colors">
                <span className="text-xs font-bold text-(--brand) group-hover:text-white transition-colors">
                  {SLUG_TAG[svc.page.slug] ?? svc.page.slug.slice(0, 4).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-(--brand) mb-1 group-hover:text-(--brand) transition-colors">
                      {svc.translation.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">{svc.translation.meta_description}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-(--brand) transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
