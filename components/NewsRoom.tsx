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
    <section className="relative py-20 overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/uploads/trade_bg_7s.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disableRemotePlayback
      />
      <div aria-hidden className="absolute inset-0 bg-black/55" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-0.5 bg-(--brand)" />
              <span className="text-xs font-semibold tracking-widest text-white/70 uppercase">Latest</span>
            </div>
            <h2 className="text-3xl font-bold text-white">News Room</h2>
          </div>
          <Link
            href={localized("/news", locale)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white border border-white/50 rounded px-4 py-2 hover:bg-white hover:text-(--brand) transition"
          >
            View More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="divide-y divide-white/15 border-t border-white/15">
          {latest.map((item) => (
            <Link
              key={item.id}
              href={localized(`/news/${item.slug}`, locale)}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-5 group"
            >
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-white/80 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-white/50 mt-1">{item.summary}</p>
              </div>
              <span className="text-xs text-white/50 flex-shrink-0">{item.published_at}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
