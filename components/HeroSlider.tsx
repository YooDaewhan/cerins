"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { HeroSlide, HeroTag, LocaleCode } from "@/src/lib/types";
import { isVideoUrl } from "@/src/lib/media";
import { buildLocalizedPath } from "@/src/lib/i18n";

const INTERVAL = 5500;
const FLIP_DURATION = 1000;
const FLIP_STAGGER = 70;
const COLS: number = 6;
const ROWS: number = 4;
const DEFAULT_LOCALE: LocaleCode = "ko";

// ponytail: 순서 함수만 다른 5개 웨이브 패턴, 플립마다 무작위로 골라 씀
const PATTERN_FNS: Array<(col: number, row: number) => number> = [
  (c, r) => c + r, // 대각선 ↘
  (c, r) => COLS - 1 - c + r, // 대각선 ↙
  (c, r) => Math.abs(c - (COLS - 1) / 2) + Math.abs(r - (ROWS - 1) / 2), // 중앙 → 바깥
  (c, r) => COLS - 1 - c + (ROWS - 1 - r), // 우하단 → 좌상단
  (c, r) => r, // 위 → 아래 (가로줄 순차)
  (c, r) => c, // 왼쪽 → 오른쪽 (세로줄 순차)
];

const TILE_PATTERNS = PATTERN_FNS.map((fn) => {
  const tiles = Array.from({ length: ROWS }).flatMap((_, r) =>
    Array.from({ length: COLS }).map((_, c) => ({ col: c, row: r, unit: fn(c, r) })),
  );
  const maxUnit = Math.max(...tiles.map((t) => t.unit));
  return { tiles, maxUnit };
});

interface HeroSliderProps {
  slides: HeroSlide[];
  locale: LocaleCode;
  tags?: HeroTag[];
}

// ponytail: 태그 목록 크기 티어. 티어를 좁혀 정돈된 그리드 느낌 유지.
// 인덱스 기반 결정론적 선택으로 SSR/CSR 일치.
const TAG_SIZES = ["text-base", "text-lg", "text-base", "text-xl"];

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  return "/" + locale + path;
}

export default function HeroSlider({ slides, locale, tags = [] }: HeroSliderProps) {
  const total = slides.length;
  const hasVideo = slides.some((s) => isVideoUrl(s.image));
  const router = useRouter();

  // 검색창 아래로 노출할 키워드 — 상단 4개는 검색창으로 대체하며 제외
  const shownTags = tags.slice(4);
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(buildLocalizedPath(locale, `/search?q=${encodeURIComponent(q)}`));
  };

  const [flipCount, setFlipCount] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(total > 1 ? 1 : 0);
  const [flipping, setFlipping] = useState(false);
  const [displayIdx, setDisplayIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [patternIdx, setPatternIdx] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const current = flipCount % 2 === 0 ? frontIdx : backIdx;
  const totalFlip = TILE_PATTERNS[patternIdx].maxUnit * FLIP_STAGGER + FLIP_DURATION;

  const goTo = useCallback(
    (idx: number) => {
      if (flipping || total === 0) return;
      const clamped = ((idx % total) + total) % total;
      if (clamped === current) return;
      if (flipCount % 2 === 0) setBackIdx(clamped);
      else setFrontIdx(clamped);
      setFlipping(true);
      setFlipCount((f) => f + 1);
      setProgress(0);
      setPatternIdx((p) => {
        const next = Math.floor(Math.random() * (TILE_PATTERNS.length - 1));
        return next >= p ? next + 1 : next;
      });
      startRef.current = performance.now();
    },
    [flipping, flipCount, total, current],
  );

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    if (!flipping) return;
    const t = setTimeout(() => {
      setFlipping(false);
      setDisplayIdx(current);
    }, totalFlip);
    return () => clearTimeout(t);
  }, [flipping, current, totalFlip]);

  useEffect(() => {
    if (total === 0 || flipping) return;
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
  }, [flipping, total, current, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (total === 0) {
    return (
      <section className="relative w-full h-full overflow-hidden select-none bg-[#0d2244]" />
    );
  }

  const textSlide = slides[displayIdx];

  return (
    <section className="relative w-full h-full overflow-hidden select-none">
      {hasVideo ? (
        // ponytail: 비디오 슬라이드는 타일 분할 불가 → 크로스페이드 폴백
        slides.map((s, i) => {
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
        })
      ) : (
        <div
          className="absolute inset-0 z-[1]"
          style={{
            perspective: "1400px",
            backgroundColor: slides[current].fallback,
          }}
        >
          {TILE_PATTERNS[patternIdx].tiles.map(({ col, row, unit }) => {
            const delay = unit * FLIP_STAGGER;
            const bgPosX =
              COLS === 1 ? "50%" : `${(col / (COLS - 1)) * 100}%`;
            const bgPosY =
              ROWS === 1 ? "50%" : `${(row / (ROWS - 1)) * 100}%`;
            const bgSize = `${COLS * 100}% ${ROWS * 100}%`;
            return (
              <div
                key={`${col}-${row}`}
                className="absolute"
                style={{
                  left: `${(col / COLS) * 100}%`,
                  top: `${(row / ROWS) * 100}%`,
                  width: `calc(${100 / COLS}% + 0.5px)`,
                  height: `calc(${100 / ROWS}% + 0.5px)`,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transformStyle: "preserve-3d",
                    transform: `rotateY(${flipCount * 180}deg)`,
                    transition: `transform ${FLIP_DURATION}ms cubic-bezier(0.5,0,0.3,1) ${delay}ms`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      backgroundImage: `url('${slides[frontIdx].image}')`,
                      backgroundSize: bgSize,
                      backgroundPosition: `${bgPosX} ${bgPosY}`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      backgroundImage: `url('${slides[backIdx].image}')`,
                      backgroundSize: bgSize,
                      backgroundPosition: `${bgPosX} ${bgPosY}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                href={localized("/contact", locale)}
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
            </div>
            </div>

            <div className="hidden lg:flex flex-col gap-7 content-center justify-center lg:mt-28">
              <form
                onSubmit={handleSearch}
                className="w-full min-w-[360px] ml-auto"
                style={{
                  animation: "tagFloat 0.6s cubic-bezier(.2,.7,.2,1) 0.2s both",
                }}
              >
                <div className="relative">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="인증·국가 검색"
                    aria-label="인증 검색"
                    className="w-full rounded-full bg-white/10 border border-white/25 backdrop-blur-md pl-5 pr-12 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-(--brand) focus:bg-white/15 transition-all duration-300"
                  />
                  <button
                    type="submit"
                    aria-label="검색"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-(--brand) text-white hover:bg-(--brand-dark) transition-colors duration-300"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                        d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                      />
                    </svg>
                  </button>
                </div>
              </form>

              {shownTags.length > 0 && (
                <div className="grid grid-cols-2 gap-x-10 gap-y-3.5 justify-items-end text-right">
                  {shownTags.map((t, i) => {
                    const size = TAG_SIZES[(i * 3 + 1) % TAG_SIZES.length];
                    const accent = i % 5 === 0;
                    return (
                      <a
                        key={`${t.href}-${i}`}
                        href={t.href}
                        className={`group flex items-baseline gap-2 ${size} leading-none whitespace-nowrap transition-colors duration-300 hover:text-(--brand) ${accent ? "text-white/90 font-semibold" : "text-white/55 font-medium"}`}
                        style={{
                          animation: `tagFloat 0.6s cubic-bezier(.2,.7,.2,1) ${0.28 + i * 0.035}s both`,
                        }}
                      >
                        <span className="w-0 h-px bg-(--brand) transition-all duration-300 group-hover:w-4" />
                        {t.title}
                      </a>
                    );
                  })}
                </div>
              )}

              {/* 동영상 재생 공간 — 우선 검은 배경으로 자리만 확보 */}
              <div
                className="w-full min-w-[360px] ml-auto aspect-video rounded-xl bg-black border border-white/15 overflow-hidden"
                style={{
                  animation: "tagFloat 0.6s cubic-bezier(.2,.7,.2,1) 0.4s both",
                }}
                aria-label="동영상 재생 영역"
              />
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
