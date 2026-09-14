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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 발췌문에서 검색어를 <mark>로 강조. 대소문자 무시, 겹치는 단어 분해.
function highlight(text: string, terms: string[]) {
  const words = terms
    .flatMap((t) => t.split(/\s+/))
    .map((w) => w.trim())
    .filter(Boolean);
  if (!words.length) return text;
  const wordSet = new Set(words.map((w) => w.toLowerCase()));
  const re = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    wordSet.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-(--brand)/20 text-(--brand) font-semibold rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

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

  const PER_PAGE = 5;
  const pageCount = Math.max(1, Math.ceil(hits.length / PER_PAGE));
  const cur = Math.min(pageCount, Math.max(1, Number(one(sp.page)) || 1));
  const pageHits = hits.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  // 현재 검색 조건을 유지한 채 page 만 교체.
  const base = new URLSearchParams();
  if (one(sp.terms)) base.set("terms", one(sp.terms));
  if (one(sp.q)) base.set("q", one(sp.q));
  const pageHref = (p: number) => {
    const params = new URLSearchParams(base);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

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
          <>
          <ul className="divide-y divide-gray-100">
            {pageHits.map((hit, i) => (
              <li key={`${hit.href}-${i}`} className="py-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-(--brand) bg-(--brand)/10 rounded px-2 py-0.5">
                    {hit.type}
                  </span>
                  {hit.context && (
                    <span className="text-xs text-gray-400">{hit.context}</span>
                  )}
                </div>
                <Link
                  href={hit.href}
                  className="text-lg font-bold text-gray-900 hover:text-(--brand) hover:underline transition-colors"
                >
                  {highlight(hit.title, hit.terms)}
                </Link>
                {hit.snippet && (
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {highlight(hit.snippet, hit.terms)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-1">
              {cur > 1 && (
                <Link href={pageHref(cur - 1)} className="px-3 py-2 text-sm text-gray-500 hover:text-(--brand)">
                  이전
                </Link>
              )}
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={
                    p === cur
                      ? "min-w-9 rounded-md bg-(--brand) px-3 py-2 text-center text-sm font-bold text-white"
                      : "min-w-9 rounded-md px-3 py-2 text-center text-sm text-gray-600 hover:bg-gray-100"
                  }
                >
                  {p}
                </Link>
              ))}
              {cur < pageCount && (
                <Link href={pageHref(cur + 1)} className="px-3 py-2 text-sm text-gray-500 hover:text-(--brand)">
                  다음
                </Link>
              )}
            </nav>
          )}
          </>
        )}
      </div>
    </>
  );
}
