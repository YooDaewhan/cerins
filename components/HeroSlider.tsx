"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { HeroSlide, LocaleCode } from "@/src/lib/types";
import { isVideoUrl } from "@/src/lib/media";

const INTERVAL = 5500;
const DEFAULT_LOCALE: LocaleCode = "ko";

interface HeroSliderProps {
  slides: HeroSlide[];
  locale: LocaleCode;
}

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  return "/" + locale + path;
}

export default function HeroSlider({ slides, locale }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const total = slides.length;

  const goTo = useCallback(
    (idx: number) => {
      if (total === 0) return;
      setCurrent(((idx % total) + total) % total);
      setProgress(0);
      startRef.current = performance.now();
    },
    [total],
  );

  const prev = useCallback(() => {
    if (total === 0) return;
    setCurrent((slide) => (slide - 1 + total) % total);
    setProgress(0);
    startRef.current = performance.now();
  }, [total]);

  const next = useCallback(() => {
    if (total === 0) return;
    setCurrent((slide) => (slide + 1) % total);
    setProgress(0);
    startRef.current = performance.now();
  }, [total]);

  useEffect(() => {
    if (total === 0) return;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / INTERVAL, 1);
      setProgress(pct);
      if (pct >= 1) {
        setCurrent((c) => (c + 1) % total);
        startRef.current = performance.now();
        setProgress(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [current, total]);

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
                style={{
                  backgroundImage: `url('${s.image}')`,
                  animation: active ? "kenburns 7s ease-out forwards" : "none",
                }}
              />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20 z-[2]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-[2]" />

      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-(--brand) via-[#d6325a] to-(--brand) z-[3]" />

      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-[3] text-right">
        <div className="flex items-center gap-3 justify-end mb-2">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
            since 2009
          </div>
          <div className="w-8 h-px bg-white/30" />
        </div>
        <div className="font-mono text-white/30 text-xs">
          CERTIFICATION · INSPECTION
        </div>
      </div>

      <div className="relative z-[5] h-full flex items-center">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
          <div className="max-w-2xl" key={`text-${current}`}>
            <div
              className="flex items-center gap-3 mb-6"
              style={{
                animation: "slideUp 0.7s cubic-bezier(.2,.7,.2,1) both",
              }}
            >
              <div className="w-10 h-px bg-(--brand)" />
              <span className="text-xs font-bold tracking-[0.3em] text-(--brand) uppercase">
                {slides[current].eyebrow}
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-[2.9rem] font-bold text-white leading-[1.15] mb-6"
              style={{
                animation: "slideUp 0.8s cubic-bezier(.2,.7,.2,1) 0.08s both",
              }}
            >
              {slides[current].headline}
            </h1>

            <p
              className="text-gray-200/90 text-base sm:text-lg leading-relaxed mb-9 max-w-xl"
              style={{
                animation: "slideUp 0.8s cubic-bezier(.2,.7,.2,1) 0.18s both",
              }}
            >
              {slides[current].sub}
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
        @keyframes kenburns {
          from { transform: scale(1.08); }
          to   { transform: scale(1.0); }
        }
        @keyframes scrollHint {
          0%, 100% { transform: scaleY(0.6); opacity: 0.4; }
          50%      { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </section>
  );
}
