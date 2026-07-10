"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LocaleCode, Post } from "@/src/lib/types";

const DEFAULT_LOCALE: LocaleCode = "ko";
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY = (slug: string) => `cerins-popup:${slug}`;

function localized(path: string, locale: LocaleCode): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}

export default function NewsPopup({
  posts,
  locale,
}: {
  posts: Post[];
  locale: LocaleCode;
}) {
  // 서버가 준 팝업 후보 중, "하루 보지 않기" 처리되지 않은 것만.
  // localStorage 는 클라이언트에서만 읽히므로 mount 후 계산(하이드레이션 안전).
  const [visible, setVisible] = useState<Post[]>([]);

  useEffect(() => {
    // 관리자 화면에서는 팝업을 띄우지 않는다(편집 방해).
    if (window.location.pathname.includes("/admin")) return;
    const now = Date.now();
    setVisible(
      posts.filter((p) => {
        const until = Number(localStorage.getItem(KEY(p.slug)) ?? 0);
        return !(until > now);
      }),
    );
  }, [posts]);

  const close = (slug: string) =>
    setVisible((v) => v.filter((p) => p.slug !== slug));

  const hideForDay = (slug: string) => {
    localStorage.setItem(KEY(slug), String(Date.now() + DAY_MS));
    close(slug);
  };

  if (visible.length === 0) return null;

  // 딤/오버레이 없음. 왼쪽 중앙(조금 위쪽)에 전통적인 팝업창처럼. 여러 개면 우측으로 계단식.
  return (
    <div className="pointer-events-none fixed left-4 top-[42%] z-40 flex -translate-y-1/2 flex-wrap items-start gap-4">
      {visible.map((p) => (
        <PopupCard
          key={p.slug}
          post={p}
          href={localized(`/news/${p.slug}`, locale)}
          onClose={() => close(p.slug)}
          onHideForDay={() => hideForDay(p.slug)}
        />
      ))}
    </div>
  );
}

interface CardProps {
  post: Post;
  href: string;
  onClose: () => void;
  onHideForDay: () => void;
}

function PopupCard({ post, href, onClose, onHideForDay }: CardProps) {
  const type =
    post.popup_type === 2 || post.popup_type === 3 ? post.popup_type : 1;

  return (
    <article className="pointer-events-auto flex w-[30rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl animate-[popup-in_.2s_ease-out]">
      {type === 1 && <HeaderBar post={post} href={href} />}
      {type === 2 && <HeroImage post={post} href={href} />}
      {type === 3 && <SideAccent post={post} href={href} />}

      <Footer onHideForDay={onHideForDay} onClose={onClose} />
    </article>
  );
}

const EYEBROW = "CERINS NEWS";

function Body({ post }: { post: Post }) {
  // 본문(sanitize 완료 HTML)을 그대로. 길면 스크롤.
  return (
    <div
      className="max-h-60 overflow-y-auto text-[13px] leading-relaxed text-neutral-600 [&_a]:text-(--brand) [&_a]:underline [&_img]:my-2 [&_img]:rounded [&_p]:mb-2"
      dangerouslySetInnerHTML={{ __html: post.content || post.summary }}
    />
  );
}

// 타입 1 — 컬러 헤더: 브랜드색 제목 바 + 이미지 + 내용.
function HeaderBar({ post, href }: { post: Post; href: string }) {
  return (
    <>
      <header className="bg-gradient-to-r from-(--brand) to-(--brand-dark) px-4 py-3.5">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {EYEBROW}
        </p>
        <Link
          href={href}
          className="block text-base font-bold leading-snug text-white hover:underline"
        >
          {post.title}
        </Link>
      </header>
      {post.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnail} alt="" className="h-40 w-full object-cover" />
      )}
      <div className="flex-1 p-4">
        <Body post={post} />
      </div>
    </>
  );
}

// 타입 2 — 이미지 히어로: 큰 이미지 위 제목 오버레이 + 내용.
function HeroImage({ post, href }: { post: Post; href: string }) {
  return (
    <>
      <Link href={href} className="relative block h-52">
        {post.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-(--brand) to-(--brand-dark)" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
            {EYEBROW}
          </p>
          <h3 className="text-lg font-bold leading-snug text-white">
            {post.title}
          </h3>
        </div>
      </Link>
      <div className="flex-1 p-4">
        <Body post={post} />
      </div>
    </>
  );
}

// 타입 3 — 사이드 강조: 좌측 브랜드 액센트 바 + 태그형 제목 + 구분선 + 내용.
function SideAccent({ post, href }: { post: Post; href: string }) {
  return (
    <div className="flex flex-1">
      <div className="w-1.5 shrink-0 bg-gradient-to-b from-(--brand) to-(--brand-dark)" />
      <div className="min-w-0 flex-1">
        {post.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnail} alt="" className="h-36 w-full object-cover" />
        )}
        <div className="space-y-2.5 p-4">
          <span className="inline-block rounded bg-(--brand)/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-(--brand)">
            공지 · NOTICE
          </span>
          <Link
            href={href}
            className="block border-b border-neutral-200 pb-2.5 text-base font-bold leading-snug text-neutral-900 hover:text-(--brand)"
          >
            {post.title}
          </Link>
          <Body post={post} />
        </div>
      </div>
    </div>
  );
}

function Footer({
  onHideForDay,
  onClose,
}: {
  onHideForDay: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-neutral-800 px-3.5 py-2.5 text-xs text-white">
      <button
        type="button"
        onClick={onHideForDay}
        className="text-white/80 transition hover:text-white"
      >
        오늘 하루 보지 않기
      </button>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1 font-semibold hover:text-white/80"
      >
        닫기
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
