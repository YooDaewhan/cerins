"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface ValueSlide {
  id: string;
  accent: string;
  eyebrow: string;
  title: ReactNode;
  desc: string;
  metric: string;
}

const VALUES: ValueSlide[] = [
  {
    id: "speed",
    accent: "01",
    eyebrow: "신속성",
    title: (
      <>
        시장 출시 기간을 <span className="text-(--brand)">몇 달</span> 단축하세요.
      </>
    ),
    desc:
      "인증·시험·서류를 병렬로 진행 — 품질 타협 없이 기간을 압축합니다.",
    metric: "EAC + GOST-R 평균 6~8주 처리",
  },
  {
    id: "coverage",
    accent: "02",
    eyebrow: "커버리지",
    title: (
      <>
        하나의 창구. <span className="text-(--brand)">러시아부터 베트남까지.</span>
      </>
    ),
    desc:
      "서울·모스크바·호치민 직영 사무소 — CIS·EU·걸프·남아시아 공인 파트너 네트워크.",
    metric: "30개국 이상 · 직영 사무소 3개",
  },
  {
    id: "compliance",
    accent: "03",
    eyebrow: "컴플라이언스",
    title: (
      <>
        감사 수준의 <span className="text-(--brand)">모든 인증서.</span>
      </>
    ),
    desc:
      "TR CU·GOST-R·CE·BIS 인증기관 직접 계약. 재판매 없이, 통관에서 놀랄 일 없습니다.",
    metric: "2024년 통관 거절 0건",
  },
  {
    id: "trust",
    accent: "04",
    eyebrow: "신뢰",
    title: (
      <>
        15년. <span className="text-(--brand)">1,000건 이상의 프로젝트.</span>
      </>
    ),
    desc:
      "현대급 OEM 수출부터 첫 수출 중소기업까지 — 2009년부터 동일한 전문 팀이 함께합니다.",
    metric: "2009년 설립 · 서울 본사",
  },
];

const AUTO_MS = 5800;

export default function ServiceValues() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const startTs = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTs;
      const pct = Math.min(elapsed / AUTO_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        setActive((a) => (a + 1) % VALUES.length);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, paused]);

  const current = VALUES[active];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full h-full overflow-hidden"
      aria-label="Why CERINS"
    >
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--gold)/40 to-transparent"
      />

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-6 lg:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              CERINS를 선택하는 이유
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-white/60 uppercase">
            {current.accent} / {String(VALUES.length).padStart(2, "0")}
          </div>
        </div>

        <div className="relative flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
              className="lg:col-span-8 relative"
            >
              <div className="text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase mb-5">
                <span className="text-white">{current.eyebrow}</span>
                <span className="mx-2 text-white/30">/</span>
                운영 원칙
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.04] text-white max-w-4xl">
                {current.title}
              </h2>
              <p className="mt-6 lg:mt-8 text-base lg:text-xl text-white/65 leading-relaxed max-w-2xl">
                {current.desc}
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-(--gold)" />
                <span className="text-xs font-semibold text-white tracking-wide">
                  {current.metric}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`watermark-${current.id}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="hidden lg:flex lg:col-span-4 justify-end items-center pointer-events-none select-none"
              aria-hidden
            >
              <div className="relative">
                <div className="font-bold leading-[0.85] tracking-tight text-[16rem] xl:text-[20rem] text-white/[0.08]">
                  {current.accent}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-(--gold)/30" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 lg:mt-10">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {VALUES.map((v, i) => {
              const state =
                i === active ? "current" : i < active ? "past" : "future";
              const fill =
                state === "current"
                  ? `${progress * 100}%`
                  : state === "past"
                    ? "100%"
                    : "0%";
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setProgress(0);
                  }}
                  className="group text-left"
                  aria-label={`View ${v.eyebrow}`}
                >
                  <div className="relative h-[2px] w-full bg-white/20 overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0 bg-(--brand) transition-[width] duration-100 linear"
                      style={{ width: fill }}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span
                      className={`font-mono text-[10px] tracking-[0.25em] uppercase transition-colors ${
                        i === active ? "text-white" : "text-white/50"
                      }`}
                    >
                      {v.accent}
                    </span>
                    <span
                      className={`text-xs font-semibold tracking-wide transition-colors ${
                        i === active
                          ? "text-white"
                          : "text-white/50 group-hover:text-white"
                      }`}
                    >
                      {v.eyebrow}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
