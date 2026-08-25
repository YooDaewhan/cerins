"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";

// Swap any of these for your own photo URLs.
// Unsplash format: https://images.unsplash.com/{id}?auto=format&fit=crop&w={width}&q=80
const IMAGES = {
  certification:
    "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1600&q=80",
  inspection:
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
  ndt:
    "https://images.unsplash.com/photo-1581093458791-9d2b11a0c7e0?auto=format&fit=crop&w=1200&q=80",
  documentation:
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  pm:
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  customs:
    "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1200&q=80",
};

// Optional mp4 URLs per card. If set, the card autoplays the video (muted, looped)
// with the matching IMAGES entry used as a poster + fallback.
// Replace with your own /public/videos/*.mp4 paths once uploaded.
const VIDEOS: Partial<Record<keyof typeof IMAGES, string>> = {
  certification:
    "https://videos.pexels.com/video-files/4488879/4488879-uhd_2560_1440_25fps.mp4",
};

interface BentoItem {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  className: string;
  icon: ReactNode;
  image: string;
  video?: string;
  big?: boolean;
}

const cert = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);
const search = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const flask = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3h6M10 3v6.5L4.5 18a2 2 0 001.7 3h11.6a2 2 0 001.7-3L14 9.5V3" />
  </svg>
);
const doc = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const brief = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const ship = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 17l3 3 3-3M9 14V7a2 2 0 012-2h6l4 4v5M21 17h-9M5 9V5a2 2 0 012-2h2" />
  </svg>
);

const ITEMS: BentoItem[] = [
  {
    id: "certification",
    title: "인증",
    eyebrow: "시장 진입",
    description:
      "러시아·CIS·유럽·아시아 시장을 위한 EAC, GOST-R, CE, BIS 원스톱 인증.",
    href: "/certification/russia",
    className: "lg:col-span-2 lg:row-span-2",
    icon: cert,
    image: IMAGES.certification,
    video: VIDEOS.certification,
    big: true,
  },
  {
    id: "inspection",
    title: "선적 전 검사",
    eyebrow: "품질",
    description: "30개국 이상 공인 검사원의 현장 품질검사 및 선적전 검사.",
    href: "/inspection/pre-shipment-inspection",
    className: "lg:col-span-1 lg:row-span-1",
    icon: search,
    image: IMAGES.inspection,
  },
  {
    id: "ndt",
    title: "NDT & 실험실 시험",
    eyebrow: "엔지니어링",
    description: "초음파·방사선·자기 — 파괴 및 비파괴 검사.",
    href: "/inspection/ndt",
    className: "lg:col-span-1 lg:row-span-1",
    icon: flask,
    image: IMAGES.ndt,
  },
  {
    id: "documentation",
    title: "서류 작성",
    eyebrow: "컴플라이언스",
    description: "목적국 기준에 맞춘 서류 작성·번역·공증.",
    href: "/services/documentation",
    className: "lg:col-span-1 lg:row-span-1",
    icon: doc,
    image: IMAGES.documentation,
  },
  {
    id: "pm",
    title: "프로젝트 관리",
    eyebrow: "조율",
    description: "다국가·다업체 무역 프로젝트 일괄 관리.",
    href: "/services/project-management-custom-brokerage",
    className: "lg:col-span-1 lg:row-span-1",
    icon: brief,
    image: IMAGES.pm,
  },
  {
    id: "customs",
    title: "통관 대리",
    eyebrow: "통관",
    description: "러시아·CIS·베트남·한국 자체 면허 통관사 운영.",
    href: "/services/project-management-custom-brokerage",
    className: "lg:col-span-1 lg:row-span-1",
    icon: ship,
    image: IMAGES.customs,
  },
];

function BigCard({ item, index }: { item: BentoItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
      className={item.className}
    >
      <Link
        href={item.href}
        className="group relative h-full block overflow-hidden rounded-2xl border border-(--hairline) bg-[#0a1f44] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-25px_rgba(10,31,68,0.5)]"
      >
        <div className="absolute inset-0 overflow-hidden transition-transform duration-[1.4s] ease-out group-hover:scale-[1.06]">
          {item.video ? (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={item.video}
              poster={item.image}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disableRemotePlayback
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${item.image}')` }}
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f44]/95 via-[#0a1f44]/55 to-[#0a1f44]/10" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--gold)/50 to-transparent"
        />

        <div className="relative h-full flex flex-col justify-between p-7 lg:p-8">
          <div className="flex items-start justify-between">
            <div className="inline-flex w-11 h-11 items-center justify-center rounded-lg bg-white/12 backdrop-blur-md text-white ring-1 ring-white/25">
              {item.icon}
            </div>
            <span className="text-[10px] font-semibold tracking-[0.3em] text-white/65 uppercase">
              {item.eyebrow}
            </span>
          </div>

          <div>
            <h3 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white tracking-tight mb-3 leading-[1.1]">
              {item.title}
            </h3>
            <p className="text-sm lg:text-base text-white/75 leading-snug max-w-md line-clamp-2">
              {item.description}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-(--gold) group-hover:gap-3 transition-all">
              <span className="tracking-wider uppercase">자세히 보기</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SmallCard({ item, index }: { item: BentoItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
      className={item.className}
    >
      <Link
        href={item.href}
        className="group relative h-full flex flex-col overflow-hidden rounded-2xl border border-(--hairline) bg-white transition-all duration-300 hover:-translate-y-1 hover:border-(--on-brand)/20 hover:shadow-[0_24px_60px_-24px_rgba(10,31,68,0.18)]"
      >
        <div className="relative overflow-hidden basis-[48%] flex-shrink-0 bg-(--surface-2)">
          <div className="absolute inset-0 overflow-hidden transition-transform duration-[1.4s] ease-out group-hover:scale-[1.08]">
            {item.video ? (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={item.video}
                poster={item.image}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                disableRemotePlayback
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${item.image}')` }}
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-(--on-brand)/35 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 inline-flex w-9 h-9 items-center justify-center rounded-lg bg-white/85 backdrop-blur-sm text-(--brand) ring-1 ring-white/60">
            {item.icon}
          </div>
        </div>

        <div className="relative flex flex-col flex-1 p-5">
          <span className="text-[10px] font-semibold tracking-[0.25em] text-(--brand) uppercase mb-2">
            {item.eyebrow}
          </span>
          <h3 className="text-base lg:text-lg font-semibold text-(--on-brand) mb-1.5 tracking-tight leading-snug">
            {item.title}
          </h3>
          <p className="text-xs text-(--ink-muted) leading-snug line-clamp-1">
            {item.description}
          </p>
          <div className="mt-auto pt-3 inline-flex items-center text-(--brand) transition-transform group-hover:translate-x-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ServiceBento() {
  return (
    <section className="relative w-full h-full overflow-hidden text-(--on-brand)">
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
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              서비스
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white">
              글로벌 진출에 필요한 <span className="text-(--gold)">모든 것</span>.
            </h2>
            <p className="text-sm lg:text-base text-white/65 max-w-md">
              6가지 서비스, 하나의 창구. 인증부터 통관까지 CERINS가 국경을 넘겨드립니다.
            </p>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3 gap-3 lg:gap-4">
          {ITEMS.map((item, i) =>
            item.big ? (
              <BigCard key={item.id} item={item} index={i} />
            ) : (
              <SmallCard key={item.id} item={item} index={i} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
