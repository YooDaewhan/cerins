import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import {
  buildLocalizedPath,
  listCertificationCountries,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type {
  CertificationCountry,
  CertificationLink,
  LocaleCode,
} from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

interface SearchResult {
  country: CertificationCountry;
  certs: CertificationLink[];
  countryMatch: boolean;
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const { q } = await searchParams;
  const rawQuery = (Array.isArray(q) ? q[0] : q) ?? "";
  const query = rawQuery.trim();
  const needle = query.toLowerCase();

  const countries = await listCertificationCountries(code);

  const results: SearchResult[] = [];
  if (needle) {
    for (const country of countries) {
      const countryMatch =
        country.title.toLowerCase().includes(needle) ||
        (country.subtitle?.toLowerCase().includes(needle) ?? false);
      // 국가명이 맞으면 하위 인증항목 전부, 아니면 항목명이 맞는 것만
      const certs = countryMatch
        ? country.certifications
        : country.certifications.filter((c) =>
            c.title.toLowerCase().includes(needle),
          );
      if (countryMatch || certs.length > 0) {
        results.push({ country, certs, countryMatch });
      }
    }
  }

  const totalItems = results.reduce((sum, r) => sum + r.certs.length, 0);

  return (
    <>
      <PageHero
        title={query ? `“${query}” 검색 결과` : "인증 검색"}
        subtitle={
          query
            ? `${results.length}개 국가 · ${totalItems}개 인증항목`
            : "인증명 또는 국가명을 입력해 검색하세요."
        }
        breadcrumb="Search"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!query ? (
          <p className="text-gray-500 text-sm">검색어를 입력해 주세요.</p>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-gray-700 mb-2">
              “{query}”에 대한 검색 결과가 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              다른 인증명 또는 국가명으로 다시 검색해 보세요.
            </p>
            <Link
              href={buildLocalizedPath(code, "/certification")}
              className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-(--brand) hover:underline"
            >
              전체 인증 보기
              <svg
                className="w-3.5 h-3.5"
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
          </div>
        ) : (
          <div className="space-y-8">
            {results.map((r) => (
              <div
                key={r.country.slug}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="h-1.5 bg-(--brand)" />
                <div className="p-6">
                  <p className="text-xs text-(--brand) tracking-widest uppercase font-bold mb-1.5 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-(--brand) inline-block" />
                    인증 · {r.country.title}
                  </p>
                  <Link
                    href={buildLocalizedPath(
                      code,
                      `/certification/${r.country.slug}`,
                    )}
                    className="group inline-flex items-center gap-1.5 text-lg font-bold text-gray-900 hover:text-(--brand) transition-colors"
                  >
                    {r.country.title}
                    <svg
                      className="w-4 h-4 text-(--brand) opacity-0 group-hover:opacity-100 transition-opacity"
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
                  {r.country.subtitle && (
                    <p className="text-sm text-gray-500 mt-1">
                      {r.country.subtitle}
                    </p>
                  )}

                  {r.certs.length > 0 ? (
                    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {r.certs.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className="group flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 hover:border-(--brand) hover:bg-white hover:text-(--brand) transition-all"
                          >
                            <span className="w-1 h-1 rounded-full bg-(--brand) flex-shrink-0" />
                            <span className="flex-1">{c.title}</span>
                            <svg
                              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-gray-400">
                      등록된 하위 인증항목이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
