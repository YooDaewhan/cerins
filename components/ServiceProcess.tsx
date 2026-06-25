"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";

interface Step {
  n: string;
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
}

const STEPS: Step[] = [
  {
    n: "01",
    tag: "Discovery",
    title: "Inquiry & scoping",
    desc:
      "We map your product, target market, and timeline in one consultation. No RFQ relay, no guesswork.",
    bullets: [
      "Regulatory snapshot for target market in 48 hours",
      "Fixed project pricing before kickoff",
      "Single point of contact assigned",
    ],
  },
  {
    n: "02",
    tag: "Strategy",
    title: "Regulatory assessment",
    desc:
      "Notified bodies, labs, documents, port routes — every compliance path traced before a single test runs.",
    bullets: [
      "Standard selection (TR CU, EAC, GOST-R, CE, BIS)",
      "Test plan and lab scheduling",
      "Risk register and contingency routes",
    ],
  },
  {
    n: "03",
    tag: "Compliance",
    title: "Documentation",
    desc:
      "Every certificate, label, and customs form — drafted, translated, and legalized to destination-country standard.",
    bullets: [
      "Commercial, shipping, and regulatory document drafting",
      "Notarization and consular legalization",
      "Multi-language label and packaging review",
    ],
  },
  {
    n: "04",
    tag: "Operations",
    title: "Execution",
    desc:
      "Inspectors, labs, brokers, and carriers — coordinated from a single CERINS project room with daily reporting.",
    bullets: [
      "On-site PSI and NDT in 30+ countries",
      "Witness testing with notified-body presence",
      "Daily progress reports and milestone gates",
    ],
  },
  {
    n: "05",
    tag: "Delivery",
    title: "Customs clearance",
    desc:
      "Final clearance and handoff at destination — across Russia, the CIS, EU, Türkiye, the Gulf, India, and Vietnam.",
    bullets: [
      "Licensed in-house brokerage at gateway ports",
      "Tariff classification and duty optimization",
      "Post-clearance compliance file archived 7 years",
    ],
  },
];

const STEP_VH = 90;

export default function ServiceProcess() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const raw = v * STEPS.length;
    const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(raw)));
    setActive(idx);
  });

  const current = STEPS[active];

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: `${STEPS.length * STEP_VH}dvh` }}
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-16 h-[calc(100dvh-4rem)] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-px bg-white/60" />
              <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
                How we deliver
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
              </motion.div>
            </AnimatePresence>

            <div className="mt-14 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s.n}
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
              {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex items-center py-10 lg:py-12"
              style={{ minHeight: `${STEP_VH}dvh` }}
            >
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                className="relative w-full"
              >
                <div className="lg:hidden mb-5 flex items-end justify-between">
                  <div className="font-bold text-6xl leading-none text-white">
                    {s.n}
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
                    {s.tag}
                  </span>
                </div>

                <div className="relative rounded-2xl border border-(--hairline) bg-white p-7 sm:p-9 lg:p-10 shadow-[0_24px_60px_-30px_rgba(10,31,68,0.18)]">
                  <div className="hidden lg:inline-flex absolute -top-3 left-8 items-center gap-2 rounded-full bg-white px-3 py-1 border border-gray-200">
                    <span className="font-mono text-xs font-bold text-(--brand)">{s.n}</span>
                    <span className="text-[10px] font-semibold tracking-[0.25em] text-(--ink-muted) uppercase">
                      {s.tag}
                    </span>
                  </div>

                  <h4 className="text-2xl lg:text-3xl font-semibold text-(--on-brand) tracking-tight">
                    {s.title}
                  </h4>
                  <p className="mt-4 text-base text-(--ink-muted) leading-relaxed max-w-lg">
                    {s.desc}
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {s.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-3 text-sm text-(--on-brand)"
                      >
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-(--gold) flex-shrink-0" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
