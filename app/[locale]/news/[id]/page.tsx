import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import {
  buildLocalizedPath,
  getEnabledLocales,
  getPostBySlug,
  getPosts,
  listPublishedPostSlugs,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateStaticParams() {
  const [locales, slugs] = await Promise.all([
    getEnabledLocales(),
    listPublishedPostSlugs("news", "ko"),
  ]);
  const codes = locales.map((l) => l.code);
  return slugs.flatMap((slug) => codes.map((locale) => ({ locale, id: slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const post =
    (await getPostBySlug("news", id, locale as LocaleCode)) ??
    (await getPostBySlug("news", id, "ko"));
  if (!post) return {};
  return {
    title: `${post.title} — CERINS News`,
    description: post.summary,
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const item =
    (await getPostBySlug("news", id, code)) ??
    (await getPostBySlug("news", id, "ko"));
  if (!item) notFound();

  const allPosts = await getPosts("news", item.locale);
  const idx = allPosts.findIndex((p) => p.id === item.id);
  const prev = allPosts[idx + 1] ?? null;
  const next = allPosts[idx - 1] ?? null;
  const author = item.author ?? "CERINS Editorial";

  return (
    <>
      <PageHero
        title="News Room"
        subtitle={item.published_at}
        breadcrumb="News"
        image={item.thumbnail}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href={buildLocalizedPath(code, "/")} className="hover:text-(--brand) transition">Home</Link>
          <span>/</span>
          <Link href={buildLocalizedPath(code, "/news")} className="hover:text-(--brand) transition">News</Link>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-xs">{item.title}</span>
        </nav>

        <article className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-8 py-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold bg-(--brand) text-white px-2.5 py-0.5 rounded">
                NEWS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-(--brand) leading-snug mb-4">
              {item.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {author}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {item.published_at}
              </span>
            </div>
          </div>

          <div className="px-8 py-8">
            <p className="text-base text-(--brand) font-medium leading-relaxed border-l-4 border-[#c9a84c] pl-4 mb-6 italic">
              {item.summary}
            </p>
            <p className="text-gray-600 leading-relaxed text-base">{item.content}</p>
          </div>
        </article>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prev ? (
            <Link
              href={buildLocalizedPath(code, `/news/${prev.slug}`)}
              className="flex flex-col gap-1 border border-gray-200 rounded-lg p-4 hover:border-(--brand) hover:shadow-sm transition group"
            >
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Article
              </span>
              <span className="text-sm font-semibold text-(--brand) group-hover:text-[#c9a84c] transition-colors line-clamp-2">
                {prev.title}
              </span>
            </Link>
          ) : <div />}

          {next ? (
            <Link
              href={buildLocalizedPath(code, `/news/${next.slug}`)}
              className="flex flex-col gap-1 border border-gray-200 rounded-lg p-4 hover:border-(--brand) hover:shadow-sm transition group text-right ml-auto w-full"
            >
              <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                Next Article
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-(--brand) group-hover:text-[#c9a84c] transition-colors line-clamp-2">
                {next.title}
              </span>
            </Link>
          ) : <div />}
        </div>

        <div className="mt-6 text-center">
          <Link
            href={buildLocalizedPath(code, "/news")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--brand) border border-(--brand) rounded px-5 py-2 hover:bg-(--brand) hover:text-white transition"
          >
            ← View All News
          </Link>
        </div>
      </div>
    </>
  );
}
