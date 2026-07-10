import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { searchSite, type SearchCondition } from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type {
  LocaleCode,
  SearchMode,
  SearchOp,
  SearchScope,
} from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function asScope(v: unknown): SearchScope {
  return v === "certification" || v === "inspection" ? v : "all";
}
function asOp(v: unknown): SearchOp {
  return v === "or" || v === "not" ? v : "and";
}
function asMode(v: unknown): SearchMode {
  return v === "exact" || v === "begin" ? v : "near";
}

const OP_LABEL: Record<SearchOp, string> = { and: "그리고", or: "또는", not: "제외" };

// terms(JSON 조건 배열) 우선, 없으면 단순 q 로 폴백.
function parseConditions(terms: string, q: string): SearchCondition[] {
  if (terms) {
    try {
      const parsed = JSON.parse(terms);
      if (Array.isArray(parsed)) {
        const out: SearchCondition[] = parsed
          .filter((c) => c && typeof (c as { text?: unknown }).text === "string")
          .map((c) => ({
            op: asOp((c as { op?: unknown }).op),
            scope: asScope((c as { scope?: unknown }).scope),
            mode: asMode((c as { mode?: unknown }).mode),
            text: ((c as { text: string }).text).trim(),
          }))
          .filter((c) => c.text);
        if (out.length) return out;
      }
    } catch {
      // 무시하고 q 폴백
    }
  }
  return q.trim()
    ? [{ op: "and", scope: "all", mode: "near", text: q.trim() }]
    : [];
}

function conditionsToText(conditions: SearchCondition[]): string {
  return conditions
    .map((c, i) => (i === 0 ? c.text : `${OP_LABEL[c.op]} ${c.text}`))
    .join(" ");
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const sp = await searchParams;
  const conditions = parseConditions(one(sp.terms), one(sp.q));
  const query = conditionsToText(conditions);

  const hits = conditions.length
    ? await searchSite({ conditions, locale: code })
    : [];

  return (
    <>
      <PageHero
        title={query ? `“${query}” 검색 결과` : "검색"}
        subtitle={
          query ? `${hits.length}건` : "검색어를 입력해 검색하세요."
        }
        breadcrumb="Search"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!query ? (
          <p className="text-gray-500 text-sm">검색어를 입력해 주세요.</p>
        ) : hits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-gray-700 mb-2">
              “{query}”에 대한 검색 결과가 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              다른 검색어나 검색 범위로 다시 시도해 보세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {hits.map((hit, i) => (
              <li key={`${hit.href}-${i}`}>
                <Link
                  href={hit.href}
                  className="group block rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-(--brand) hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-(--brand) bg-(--brand)/10 rounded px-2 py-0.5">
                      {hit.type}
                    </span>
                    {hit.context && (
                      <span className="text-xs text-gray-400">
                        {hit.context}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-gray-900 group-hover:text-(--brand) transition-colors">
                    {hit.title}
                  </p>
                  {hit.snippet && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {hit.snippet}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
