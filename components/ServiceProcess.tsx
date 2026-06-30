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
  overview: string;
  desc: string;
  certifications: string[];
}

const STEPS: Step[] = [
  {
    n: "01",
    tag: "Russia & CIS",
    title: "Russia / CIS",
    overview:
      "The EAEU unified certification regime covers 5 member states under a single conformity mark — one approval, five markets.",
    desc:
      "We manage TR CU technical regulations and EAC declarations end-to-end — from notified-body selection through certificate registration in the FSIS database.",
    certifications: ["TR CU", "EAC", "GOST-R", "GOST ISO", "Fire Safety Certificate", "Sanitary-Epidemiological Conclusion"],
  },
  {
    n: "02",
    tag: "Europe",
    title: "European Union",
    overview:
      "CE marking grants access to the EU single market of 450 million consumers, backed by the strictest product-safety framework in the world.",
    desc:
      "From Low Voltage Directive to Machinery Regulation, we select applicable directives, engage accredited notified bodies, and compile the complete technical file.",
    certifications: ["CE Marking", "REACH", "RoHS / RoHS3", "WEEE", "ErP / Ecodesign", "Radio Equipment (RED)"],
  },
  {
    n: "03",
    tag: "India",
    title: "India",
    overview:
      "BIS compulsory registration under the IS scheme is the primary market-access gate for electronics, electrotechnical, and consumer goods entering India.",
    desc:
      "We coordinate BIS lab testing at NABL-accredited facilities, manage the CRS/ISI application portal, and handle liaison officer registration for foreign manufacturers.",
    certifications: ["BIS CRS", "BIS ISI Mark", "WPC Type Approval", "EPR Registration", "CDSCO (Medical)", "PESO"],
  },
  {
    n: "04",
    tag: "Gulf & Middle East",
    title: "Gulf / Middle East",
    overview:
      "GCC nations enforce SASO, ESMA, and ENAS mandatory schemes that require local importers and in-country lab testing for most regulated product categories.",
    desc:
      "Our Gulf desk coordinates SASO SALEEM registration, Emirates Authority approvals, and full compliance documentation for the Saudi, UAE, Qatar, and Kuwait markets.",
    certifications: ["SASO SALEEM", "ENAS (UAE)", "ESMA (UAE)", "GSO", "QS Mark (Qatar)", "ICCP (Kuwait)"],
  },
  {
    n: "05",
    tag: "Türkiye & Southeast Asia",
    title: "Türkiye / SEA",
    overview:
      "Türkiye's CE-aligned TSE regime and Vietnam's MOIT/QUATEST lab network are the key gatekeepers for industrial and consumer goods across this corridor.",
    desc:
      "We manage TSE type-approval, G-Mark registration, Vietnam MOIT/QUATEST testing, and Thai TIS submissions — with in-country representatives at every port.",
    certifications: ["TSE (Türkiye)", "G-Mark (Türkiye)", "MOIT / QUATEST (Vietnam)", "TIS (Thailand)", "SNI (Indonesia)", "PSB (Singapore)"],
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
                <p className="mt-5 text-sm text-white/70 leading-relaxed max-w-xs">
                  {current.overview}
                </p>
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

                  <div className="mt-6">
                    <div className="mb-3 text-[10px] font-bold tracking-[0.25em] text-(--ink-muted) uppercase">
                      Certifications &amp; Approvals
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="inline-flex items-center rounded border border-(--brand)/20 bg-(--brand)/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-(--brand)"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
