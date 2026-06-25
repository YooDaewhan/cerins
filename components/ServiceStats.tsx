"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

interface Stat {
  id: string;
  target: number;
  suffix: string;
  label: string;
  sub: string;
}

const STATS: Stat[] = [
  { id: "years",     target: 15,   suffix: "+",   label: "Years of operation",     sub: "Founded 2009 — Seoul HQ." },
  { id: "certs",     target: 1000, suffix: "+",   label: "Certifications delivered", sub: "EAC, GOST-R, CE, BIS, more." },
  { id: "countries", target: 30,   suffix: "+",   label: "Countries served",       sub: "Russia · CIS · EU · Asia." },
  { id: "lines",     target: 6,    suffix: "",    label: "Service lines",          sub: "Cert → Inspect → Clear." },
  { id: "support",   target: 24,   suffix: "/7",  label: "Project support",        sub: "Single project room per deal." },
  { id: "ontime",    target: 99,   suffix: "%",   label: "On-time delivery",       sub: "Tracked across 5-year window." },
];

function format(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-80px" });

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => format(v));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, stat.target, {
      duration: 1.8,
      ease: [0.2, 0.7, 0.2, 1],
      delay: 0.1 + index * 0.08,
    });
    return () => controls.stop();
  }, [inView, count, stat.target, index]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(useTransform(my, [-0.5, 0.5], ["6deg", "-6deg"]), {
    stiffness: 220,
    damping: 18,
  });
  const tiltY = useSpring(useTransform(mx, [-0.5, 0.5], ["-6deg", "6deg"]), {
    stiffness: 220,
    damping: 18,
  });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      style={{ perspective: 800 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          rotateX: tiltX,
          rotateY: tiltY,
          transformStyle: "preserve-3d",
        }}
        className="group relative h-full overflow-hidden rounded-2xl border border-(--hairline) bg-white p-6 lg:p-7 transition-shadow duration-300 hover:shadow-[0_24px_60px_-30px_rgba(10,31,68,0.20)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(280px circle at 50% 0%, rgba(180,18,58,0.08), transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-6 top-0 h-px w-10 bg-(--gold)/60"
        />
        <div className="relative flex items-baseline gap-1.5">
          <motion.span className="text-5xl lg:text-6xl font-bold tracking-tight text-(--on-brand) tabular-nums">
            {rounded}
          </motion.span>
          <span className="text-2xl lg:text-3xl font-bold text-(--brand)">
            {stat.suffix}
          </span>
        </div>
        <div className="relative mt-3 text-sm font-semibold text-(--on-brand) tracking-wide">
          {stat.label}
        </div>
        <div className="relative mt-1 text-xs text-(--ink-muted) leading-relaxed">
          {stat.sub}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ServiceStats() {
  return (
    <section className="relative w-full h-full overflow-hidden">
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
        <div className="mb-8 lg:mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              By the numbers
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white">
              Built over 15 years of <span className="text-(--gold)">cross-border work</span>.
            </h2>
            <p className="text-sm lg:text-base text-white/65 max-w-sm">
              The numbers behind every project we close — measured, not marketed.
            </p>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {STATS.map((s, i) => (
            <StatCard key={s.id} stat={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
