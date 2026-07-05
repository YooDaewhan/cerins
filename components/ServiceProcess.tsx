"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { CertificationLink } from "@/src/lib/types";

export interface Step {
  n: string;
  tag: string;
  title: string;
  overview: string;
  desc: string;
  certifications: CertificationLink[];
  /** 서비스 커버리지 지도에서 강조할 world-atlas 영문 국가명 */
  mapCountries?: string[];
}

/** STEPS 폴백 데모용: 실제 하위 페이지가 없을 때 표시되는 정적 항목 */
const cert = (titles: string[]): CertificationLink[] =>
  titles.map((title) => ({ title, href: "#" }));

export const STEPS: Step[] = [
  {
    n: "01",
    tag: "러시아 · CIS",
    title: "러시아 / CIS",
    overview:
      "유라시아경제연합(EAEU) 통합 인증 체계는 5개 회원국에 단일 적합성 마크로 적용됩니다. 하나의 인증으로 다섯 개 시장을 커버합니다.",
    desc:
      "TR CU 기술규정 및 EAC 적합성 선언을 처음부터 끝까지 관리합니다. 인증기관 선정부터 FSIS 데이터베이스 등록까지 전 과정을 지원합니다.",
    certifications: cert(["TR CU", "EAC", "GOST-R", "GOST ISO", "화재안전 인증서", "위생역학 결론서"]),
  },
  {
    n: "02",
    tag: "유럽",
    title: "유럽연합 (EU)",
    overview:
      "CE 마킹은 4억 5천만 소비자 규모의 EU 단일시장 진입을 위한 필수 요건으로, 세계에서 가장 엄격한 제품안전 체계를 기반으로 합니다.",
    desc:
      "저전압 지침부터 기계류 규정까지, 적용 지침을 선별하고 공인 인증기관을 연결하며 완전한 기술 문서를 작성합니다.",
    certifications: cert(["CE 마킹", "REACH", "RoHS / RoHS3", "WEEE", "ErP / 에코디자인", "무선기기 지침 (RED)"]),
  },
  {
    n: "03",
    tag: "인도",
    title: "인도",
    overview:
      "BIS 강제 등록(IS 제도)은 전자·전기제품 및 소비재가 인도에 진입하기 위한 핵심 관문입니다.",
    desc:
      "NABL 공인 시험소에서의 BIS 시험을 조율하고, CRS/ISI 신청 포털을 관리하며, 해외 제조사의 연락 담당자 등록을 지원합니다.",
    certifications: cert(["BIS CRS", "BIS ISI 마크", "WPC 형식 승인", "EPR 등록", "CDSCO (의료기기)", "PESO"]),
  },
  {
    n: "04",
    tag: "걸프 · 중동",
    title: "걸프 / 중동",
    overview:
      "GCC 국가들은 SASO, ESMA, ENAS 강제 인증 제도를 시행하며, 대부분의 규제 제품군에 대해 현지 수입업자 및 현지 시험을 요구합니다.",
    desc:
      "SASO SALEEM 등록, 에미리트 당국 승인, 사우디·UAE·카타르·쿠웨이트 시장 전반의 컴플라이언스 문서를 일괄 처리합니다.",
    certifications: cert(["SASO SALEEM", "ENAS (UAE)", "ESMA (UAE)", "GSO", "QS 마크 (카타르)", "ICCP (쿠웨이트)"]),
  },
  {
    n: "05",
    tag: "튀르키예 · 동남아",
    title: "튀르키예 / 동남아",
    overview:
      "튀르키예의 CE 연계 TSE 제도와 베트남의 MOIT/QUATEST 시험 네트워크는 이 지역 산업재·소비재의 핵심 진입 관문입니다.",
    desc:
      "TSE 형식 승인, G-마크 등록, 베트남 MOIT/QUATEST 시험, 태국 TIS 신청을 관리하며, 주요 항구마다 현지 대리인을 운영합니다.",
    certifications: cert(["TSE (튀르키예)", "G-마크 (튀르키예)", "MOIT / QUATEST (베트남)", "TIS (태국)", "SNI (인도네시아)", "PSB (싱가포르)"]),
  },
];

const AUTOPLAY_MS = 5000;

export default function ServiceProcess({ steps = STEPS }: { steps?: Step[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.4),
      { threshold: [0, 0.4, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 화살표 네비게이션 — 양 끝에서 멈춤
  const step = useCallback((dir: 1 | -1) => {
    setActive((cur) => {
      const next = cur + dir;
      if (next < 0 || next >= steps.length) return cur;
      return next;
    });
  }, [steps.length]);

  // 화면에 보일 때만 일정 시간마다 자동 전환 (끝에서 처음으로 순환)
  useEffect(() => {
    if (!inView || steps.length <= 1) return;
    const id = setInterval(() => {
      setActive((cur) => (cur + 1) % steps.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [inView, steps.length, active]);

  const current = steps[active];

  return (
    <section
      ref={sectionRef}
      className="relative h-full w-full overflow-hidden"
      aria-label="Our delivery process"
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

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
        <div className="hidden lg:block lg:col-span-5">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              인증 서비스 국가
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.n}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="font-bold leading-[0.85] tracking-tight text-[9rem] xl:text-[11rem] text-white">
                {current.n}
              </div>
              <div className="mt-3 text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase">
                {current.tag}
              </div>
              <h3 className="mt-3 text-3xl xl:text-4xl font-semibold text-white tracking-tight max-w-md">
                {current.title}
              </h3>
              <p className="mt-5 text-sm text-white/70 leading-relaxed max-w-xs">
                {current.overview}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-14 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(i)}
                aria-label={s.title}
                className={`h-[2px] transition-all duration-500 ${
                  i === active
                    ? "w-14 bg-(--gold)"
                    : i < active
                      ? "w-8 bg-white/40"
                      : "w-8 bg-white/20"
                }`}
              />
            ))}
          </div>
          <div className="mt-4 font-mono text-[10px] tracking-[0.25em] text-white/60 uppercase">
            {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </div>
        </div>

        <div className="lg:col-span-7 w-full">
          <div className="lg:hidden mb-5 flex items-end justify-between">
            <div className="font-bold text-6xl leading-none text-white">
              {current.n}
            </div>
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              {current.tag}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.n}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
              className="relative w-full"
            >
              <div className="relative rounded-2xl border border-(--hairline) bg-white p-7 sm:p-9 lg:p-10 shadow-[0_24px_60px_-30px_rgba(10,31,68,0.18)]">
                <div className="hidden lg:inline-flex absolute -top-3 left-8 items-center gap-2 rounded-full bg-white px-3 py-1 border border-gray-200">
                  <span className="font-mono text-xs font-bold text-(--brand)">{current.n}</span>
                  <span className="text-[10px] font-semibold tracking-[0.25em] text-(--ink-muted) uppercase">
                    {current.tag}
                  </span>
                </div>

                <h4 className="text-2xl lg:text-3xl font-semibold text-(--on-brand) tracking-tight">
                  {current.title}
                </h4>
                <p className="mt-4 text-base text-(--ink-muted) leading-relaxed max-w-lg">
                  {current.desc}
                </p>

                <div className="mt-6">
                  <div className="mb-3 text-[10px] font-bold tracking-[0.25em] text-(--ink-muted) uppercase">
                    인증 항목
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {current.certifications.map((c) =>
                      c.href && c.href !== "#" ? (
                        <Link
                          key={`${current.n}-${c.title}`}
                          href={c.href}
                          className="inline-flex items-center rounded border border-(--brand)/20 bg-(--brand)/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-(--brand) transition-colors hover:bg-(--brand) hover:text-white hover:border-(--brand)"
                        >
                          {c.title}
                        </Link>
                      ) : (
                        <span
                          key={`${current.n}-${c.title}`}
                          className="inline-flex items-center rounded border border-(--brand)/20 bg-(--brand)/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-(--brand)"
                        >
                          {c.title}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="lg:hidden mt-6 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(i)}
                aria-label={s.title}
                className={`h-[2px] transition-all duration-500 ${
                  i === active
                    ? "w-10 bg-(--gold)"
                    : i < active
                      ? "w-6 bg-white/40"
                      : "w-6 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => step(-1)}
        disabled={active === 0}
        className="hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full border border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-(--brand) hover:border-white transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Previous country"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={active === steps.length - 1}
        className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full border border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-(--brand) hover:border-white transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Next country"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  );
}
