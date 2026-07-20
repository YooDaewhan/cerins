"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { HeroSlide, HeroTag, LocaleCode } from "@/src/lib/types";
import { isVideoUrl } from "@/src/lib/media";
import FeedbackButton, { type FeedbackUser } from "@/components/FeedbackButton";

const INTERVAL = 5500;
const DEFAULT_LOCALE: LocaleCode = "ko";

// ponytail: 히어로 우측 왼쪽 줄 표시용 국가. major 는 크게, minor 는 하단에 작게.
// 오른쪽 줄(인증/검사 항목)은 tags prop 실데이터를 링크로 렌더.
const COUNTRY_MAJOR = ["RUS", "KAZ", "INDIA"];
const COUNTRY_MINOR = ["UZB", "AZE", "VNM", "UKR", "KOR"];

interface HeroSliderProps {
  slides: HeroSlide[];
  locale: LocaleCode;
  tags?: HeroTag[];
  feedbackUser?: FeedbackUser | null;
  // 우하단 상시 노출 소개 동영상(관리자에서 관리). 비어 있으면 자리표시자만 표시.
  heroVideo?: string;
}

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  return "/" + locale + path;
}

export default function HeroSlider({ slides, locale, tags = [], feedbackUser = null, heroVideo = "" }: HeroSliderProps) {
  const total = slides.length;

  const [current, setCurrent] = useState(0);
  // 우측 하위요소(인증/검사 항목)를 마운트 후 클라이언트에서만 섞어 하이드레이션 불일치 방지.
  const [shownTags, setShownTags] = useState<HeroTag[]>(tags);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const displayIdx = current;

  const goTo = useCallback(
    (idx: number) => {
      if (total === 0) return;
      const clamped = ((idx % total) + total) % total;
      if (clamped === current) return;
      setCurrent(clamped);
      setProgress(0);
      startRef.current = performance.now();
    },
    [total, current],
  );

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    if (total === 0) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / INTERVAL, 1);
      setProgress(pct);
      if (pct >= 1) {
        setProgress(0);
        goTo(current + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [total, current, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  useEffect(() => {
    const a = [...tags];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    setShownTags(a);
  }, [tags]);

  if (total === 0) {
    return (
      <section className="relative w-full h-full overflow-hidden select-none bg-[#0d2244]" />
    );
  }

  const textSlide = slides[displayIdx];

  return (
    <section className="relative w-full h-full overflow-hidden select-none">
      {slides.map((s, i) => {
        const active = i === current;
        const isVideo = isVideoUrl(s.image);
        return (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
            style={{
              opacity: active ? 1 : 0,
              zIndex: active ? 1 : 0,
              backgroundColor: s.fallback,
            }}
            aria-hidden={!active}
          >
            {isVideo ? (
              <video
                src={s.image}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${s.image}')` }}
              />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20 z-[2]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-[2]" />

      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-(--brand) via-[#d6325a] to-(--brand) z-[3]" />

      <div className="relative z-[5] h-full flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12">
          <div className="lg:grid lg:grid-cols-[1fr_auto] lg:gap-14 lg:items-center">
            <div className="max-w-2xl" key={`text-${displayIdx}`}>
            <div
              className="flex items-center gap-3 mb-6"
              style={{
                animation: "slideUp 0.7s cubic-bezier(.2,.7,.2,1) both",
              }}
            >
              <div className="w-10 h-px bg-(--brand)" />
              <span className="text-xs font-bold tracking-[0.3em] text-(--brand) uppercase">
                {textSlide.eyebrow}
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-[2.9rem] font-bold text-white leading-[1.15] mb-6"
              style={{
                animation: "slideUp 0.8s cubic-bezier(.2,.7,.2,1) 0.08s both",
              }}
            >
              {textSlide.headline}
            </h1>

            <p
              className="text-gray-200/90 text-base sm:text-lg leading-relaxed mb-9 max-w-xl"
              style={{
                animation: "slideUp 0.8s cubic-bezier(.2,.7,.2,1) 0.18s both",
              }}
            >
              {textSlide.sub}
            </p>

            <div
              className="flex flex-wrap gap-3"
              style={{
                animation: "slideUp 0.8s cubic-bezier(.2,.7,.2,1) 0.28s both",
              }}
            >
              <a
                href={localized("/requests", locale)}
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-(--brand) text-white text-sm font-semibold rounded-full hover:bg-(--brand-dark) transition-all duration-300 shadow-[0_8px_24px_rgba(180,18,58,0.35)] hover:shadow-[0_12px_28px_rgba(180,18,58,0.45)] hover:-translate-y-0.5"
              >
                Get a Quote
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
              <a
                href={localized("/certification", locale)}
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/50 text-white text-sm font-semibold rounded-full hover:bg-white hover:text-(--brand) hover:border-white transition-all duration-300"
              >
                Our Services
              </a>
              <FeedbackButton currentUser={feedbackUser} contactHref={localized("/contact", locale)} />
            </div>
            </div>

            <div className="hidden lg:flex flex-col gap-7 content-center justify-center lg:mt-28">
              <div className="grid grid-cols-2 gap-x-16 justify-items-end text-right">
                {/* 왼쪽 줄: 인증/검사 항목 — 실데이터 링크, 새로고침마다 랜덤.
                    앞 5개는 크게(세로), 다음 5개는 작게(좌→우 가로). */}
                <div className="flex flex-col items-end gap-4">
                  {shownTags.slice(0, 5).map((t, i) => (
                    <a
                      key={t.href}
                      href={t.href}
                      className="text-xl font-semibold text-white/90 leading-none whitespace-nowrap hover:text-white transition-colors"
                      style={{
                        animation: `tagFloat 0.6s cubic-bezier(.2,.7,.2,1) ${0.28 + i * 0.04}s both`,
                      }}
                    >
                      {t.title}
                    </a>
                  ))}
                  <div className="mt-4 flex flex-wrap justify-end gap-x-3 gap-y-1 max-w-[240px]">
                    {shownTags.slice(5, 10).map((t, i) => (
                      <a
                        key={t.href}
                        href={t.href}
                        className="text-[11px] font-medium leading-none whitespace-nowrap text-white/45 hover:text-white/80 transition-colors"
                        style={{
                          animation: `tagFloat 0.6s cubic-bezier(.2,.7,.2,1) ${0.28 + (5 + i) * 0.04}s both`,
                        }}
                      >
                        {t.title}
                      </a>
                    ))}
                  </div>
                </div>

                {/* 오른쪽 줄: 국가 (클릭 없음) */}
                <div className="flex flex-col items-end gap-4">
                  {COUNTRY_MAJOR.map((label, i) => (
                    <span
                      key={label}
                      className="text-xl font-semibold text-white/90 leading-none whitespace-nowrap"
                      style={{
                        animation: `tagFloat 0.6s cubic-bezier(.2,.7,.2,1) ${0.32 + i * 0.04}s both`,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                  <span
                    className="mt-4 max-w-[150px] text-[11px] font-medium leading-relaxed text-white/45"
                    style={{
                      animation: `tagFloat 0.6s cubic-bezier(.2,.7,.2,1) ${0.32 + COUNTRY_MAJOR.length * 0.04}s both`,
                    }}
                  >
                    {COUNTRY_MINOR.join(" · ")}
                  </span>
                </div>
              </div>

              {/* 상시 소개 동영상 — 우측. 관리자에서 링크/업로드로 관리. 없으면 검은 자리표시자. */}
              <div
                className="relative w-full min-w-[360px] ml-auto aspect-video rounded-xl bg-black border border-white/15 overflow-hidden"
                style={{
                  transform: "translateX(30%)",
                  animation: "tagFloat 0.6s cubic-bezier(.2,.7,.2,1) 0.4s both",
                }}
                aria-label="동영상 재생 영역"
              >
                {heroVideo && (
                  <video
                    src={heroVideo}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={prev}
        className="group absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[10] w-12 h-12 hidden sm:flex items-center justify-center rounded-full border border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-(--brand) hover:border-white transition-all duration-300 hover:scale-110"
        aria-label="Previous slide"
      >
        <svg
          className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5"
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
      </button>

      <button
        type="button"
        onClick={next}
        className="group absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[10] w-12 h-12 hidden sm:flex items-center justify-center rounded-full border border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-(--brand) hover:border-white transition-all duration-300 hover:scale-110"
        aria-label="Next slide"
      >
        <svg
          className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5"
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
      </button>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10] flex items-center gap-2 sm:gap-3">
        {slides.map((_, i) => {
          const isCurrent = i === current;
          return (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="group relative h-1 rounded-full overflow-hidden bg-white/25 hover:bg-white/40 transition-all duration-300"
              style={{ width: isCurrent ? 56 : 24 }}
              aria-label={`Slide ${i + 1}`}
            >
              {isCurrent && (
                <span
                  className="absolute inset-y-0 left-0 bg-(--brand)"
                  style={{
                    width: `${progress * 100}%`,
                    transition: "width 0.05s linear",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-8 right-8 z-[10] text-white/60 text-xs font-mono select-none">
        <span className="text-white font-semibold">
          {String(current + 1).padStart(2, "0")}
        </span>
        <span className="mx-1 text-white/40">/</span>
        {String(total).padStart(2, "0")}
      </div>

      <div className="hidden sm:flex absolute bottom-8 left-8 z-[10] items-center gap-2 text-white/40 text-[10px] tracking-[0.3em] uppercase">
        <div className="w-px h-6 bg-white/30 animate-[scrollHint_1.8s_ease-in-out_infinite]" />
        Scroll
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollHint {
          0%, 100% { transform: scaleY(0.6); opacity: 0.4; }
          50%      { transform: scaleY(1);   opacity: 1; }
        }
        @keyframes tagFloat {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to   { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
