"use client";

import type { Partner } from "@/src/lib/types";

interface PartnerSliderProps {
  partners: Partner[];
}

export default function PartnerSlider({ partners }: PartnerSliderProps) {
  if (partners.length === 0) return null;

  const mid = Math.ceil(partners.length / 2);
  const rowA = partners.slice(0, mid);
  const rowB = partners.slice(mid).length ? partners.slice(mid) : partners;

  const REPEAT = 8;
  const loopA = Array.from({ length: REPEAT }, () => rowA).flat();
  const loopB = Array.from({ length: REPEAT }, () => rowB).flat();

  return (
    <section className="relative bg-black py-10 my-6 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-black to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-black to-transparent"
      />

      <div className="marquee-track marquee-forward flex w-max items-center gap-16 mb-6">
        {loopA.map((p, i) => (
          <span
            key={`a-${p.id}-${i}`}
            className="flex-shrink-0 whitespace-nowrap text-lg font-semibold tracking-wide text-white/80"
          >
            {p.name}
          </span>
        ))}
      </div>

      <div className="marquee-track marquee-reverse flex w-max items-center gap-16">
        {loopB.map((p, i) => (
          <span
            key={`b-${p.id}-${i}`}
            className="flex-shrink-0 whitespace-nowrap text-lg font-semibold tracking-wide text-white/80"
          >
            {p.name}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes partner-marquee-fwd {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes partner-marquee-rev {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        .marquee-track { will-change: transform; }
        .marquee-forward { animation: partner-marquee-fwd 40s linear infinite; }
        .marquee-reverse { animation: partner-marquee-rev 50s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
}
