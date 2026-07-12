"use client";

import { useState } from "react";

type Category = "certification" | "inspection";

interface SubItem {
  key: string;
  label: string;
  desc: string;
}

const CATEGORIES: Record<
  Category,
  { label: string; desc: string; items: SubItem[] }
> = {
  certification: {
    label: "인증",
    desc: "수출 대상국의 강제 인증 절차를 진행합니다.",
    items: [
      {
        key: "trcu-gost",
        label: "TRCU · GOST",
        desc: "유라시아경제연합(EAEU) / 러시아·CIS 인증",
      },
      {
        key: "cec-india",
        label: "CEC (인도)",
        desc: "인도 화학 인증 (Chemical / Environmental Certificate)",
      },
    ],
  },
  inspection: {
    label: "검사",
    desc: "선적 전 품질 및 규격 적합성을 검증합니다.",
    items: [
      {
        key: "product-inspection",
        label: "제품검사",
        desc: "제품 품질 및 규격 적합성 검사",
      },
      {
        key: "scrap-india",
        label: "스크랩 (인도)",
        desc: "인도향 스크랩 선적 전 검사 (PSIC)",
      },
    ],
  },
};

export default function ProcessPage() {
  const [active, setActive] = useState<Category | null>(null);

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-[#B4123A] uppercase mb-2">
            Trade Process
          </p>
          <h1 className="text-2xl font-bold text-[#B4123A]">
            무역회사 업무 프로세스
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            업무 구분을 선택하면 세부 항목이 표시됩니다.
          </p>
        </header>

        {/* 1단계: 대분류 버튼 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {(Object.keys(CATEGORIES) as Category[]).map((key) => {
            const cat = CATEGORIES[key];
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(isActive ? null : key)}
                aria-pressed={isActive}
                className={`rounded-lg border px-6 py-5 text-left transition-all ${
                  isActive
                    ? "border-[#B4123A] bg-[#B4123A] text-white shadow-md"
                    : "border-gray-200 bg-white text-[#B4123A] hover:border-[#B4123A] hover:shadow-sm"
                }`}
              >
                <span className="block text-lg font-bold">{cat.label}</span>
                <span
                  className={`block text-xs mt-1 ${
                    isActive ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  {cat.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2단계: 세부 항목 */}
        {active && (
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm font-semibold text-[#B4123A] mb-4">
              {CATEGORIES[active].label} 세부 항목
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES[active].items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="group flex flex-col items-start rounded-lg border border-gray-200 bg-white px-5 py-4 text-left hover:border-[#B4123A] hover:shadow-md transition-all"
                >
                  <span className="text-base font-bold text-[#B4123A]">
                    {item.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
