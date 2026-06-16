import Link from "next/link";
import type { LocaleCode, Post } from "@/src/lib/types";

const DEFAULT_LOCALE: LocaleCode = "ko";

interface NewsRoomProps {
  posts: Post[];
  locale: LocaleCode;
}

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  return "/" + locale + path;
}

export default function NewsRoom({ posts, locale }: NewsRoomProps) {
  const latest = posts.slice(0, 4);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-0.5 bg-(--brand)" />
              <span className="text-xs font-semibold tracking-widest text-(--brand) uppercase">Latest</span>
            </div>
            <h2 className="text-3xl font-bold text-(--brand)">News Room</h2>
          </div>
          <Link
            href={localized("/news", locale)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--brand) border border-(--brand) rounded px-4 py-2 hover:bg-(--brand) hover:text-white transition"
          >
            View More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {latest.map((item) => (
            <Link
              key={item.id}
              href={localized(`/news/${item.slug}`, locale)}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-5 group"
            >
              <div>
                <h3 className="text-sm font-semibold text-(--brand) group-hover:text-(--brand) transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{item.published_at}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
