"use client";

import { useState, useEffect } from "react";
import type { Partner } from "@/src/lib/types";

const VISIBLE = 4;

interface PartnerSliderProps {
  partners: Partner[];
}

export default function PartnerSlider({ partners }: PartnerSliderProps) {
  const [start, setStart] = useState(0);

  useEffect(() => {
    if (partners.length === 0) return;
    const timer = setInterval(() => {
      setStart((s) => (s + 1) % partners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [partners.length]);

  if (partners.length === 0) return null;

  const prev = () => setStart((s) => (s - 1 + partners.length) % partners.length);
  const next = () => setStart((s) => (s + 1) % partners.length);

  const visible = Array.from({ length: VISIBLE }, (_, i) => partners[(start + i) % partners.length]);

  return (
    <section className="py-16 bg-[#f8f9fc] border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-0.5 bg-(--brand)" />
            <span className="text-xs font-semibold tracking-widest text-(--brand) uppercase">Partners</span>
            <div className="w-8 h-0.5 bg-(--brand)" />
          </div>
          <h2 className="text-2xl font-bold text-(--brand)">Our Global Partners</h2>
        </div>

        <div className="relative flex items-center gap-4">
          <button
            onClick={prev}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-(--brand) hover:text-(--brand) transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-hidden">
            {visible.map((partner, i) => (
              <div
                key={`${partner.id}-${i}`}
                className="bg-white border border-gray-200 rounded-lg p-5 flex items-center justify-center h-20 hover:border-(--brand) transition"
              >
                <span className="text-sm font-semibold text-gray-500 text-center">{partner.name}</span>
              </div>
            ))}
          </div>

          <button
            onClick={next}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-(--brand) hover:text-(--brand) transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
