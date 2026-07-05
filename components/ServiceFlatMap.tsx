"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { STEPS, type Step } from "./ServiceProcess";
import { COUNTRY_TO_STEP, HOME, WEST_BOUND, loadWorldCountries } from "./worldGeo";

const WIDTH = 820;
const HEIGHT = 430;

// slug 별 고정 색상 — 러시아는 붉은계열, 유럽은 푸른계열로 항상 고정.
const FIXED_COLORS: Record<string, string> = {
  russia: "234,179,8",   // yellow
  europe: "132,204,22",  // lime (연두)
  belarus: "236,72,153", // pink (분홍)
};

// 그 외 지역에 순서대로 배정하는 색상 (붉은·푸른계열과 겹치지 않게).
const REGION_PALETTE = [
  "59,130,246",  // blue
  "168,85,247",  // purple
  "249,115,22",  // orange
  "20,184,166",  // teal
  "217,70,239",  // fuchsia
  "239,68,68",   // red
  "99,102,241",  // indigo
];

// ponytail: EAFR/EU/AS/OC only — Americas + poles excluded per design.
const REGION = {
  type: "Polygon" as const,
  coordinates: [[
    [WEST_BOUND, -55],
    [180, -55],
    [180, 72],
    [WEST_BOUND, 72],
    [WEST_BOUND, -55],
  ]],
};

export default function ServiceFlatMap({ steps }: { steps?: Step[] }) {
  const allCountries = useMemo(() => loadWorldCountries(), []);

  const countryToStep = useMemo(() => {
    if (!steps || steps.length === 0) return COUNTRY_TO_STEP;
    const map: Record<string, Step> = {};
    for (const step of steps) {
      for (const name of step.mapCountries ?? []) map[name] = step;
    }
    map["South Korea"] = HOME;
    return map;
  }, [steps]);

  // 러시아·유럽은 slug 로 색을 고정하고, 나머지는 팔레트를 순서대로 배정한다.
  const stepColor = useMemo(() => {
    const m = new Map<Step, string>();
    const source = steps && steps.length ? steps : STEPS;
    let paletteIdx = 0;
    source.forEach((s, i) => {
      const fixed = s.slug ? FIXED_COLORS[s.slug] : i === 0 ? FIXED_COLORS.russia : i === 1 ? FIXED_COLORS.europe : undefined;
      if (fixed) {
        m.set(s, fixed);
      } else {
        m.set(s, REGION_PALETTE[paletteIdx % REGION_PALETTE.length]);
        paletteIdx++;
      }
    });
    return m;
  }, [steps]);

  const countries = useMemo(
    () =>
      allCountries.filter((c) => {
        const [lon, lat] = geoCentroid(c);
        return lon >= WEST_BOUND && lon <= 180 && lat >= -55 && lat <= 72;
      }),
    [allCountries],
  );

  const nameToFeature = useMemo(() => {
    const map: Record<string, (typeof countries)[number]> = {};
    countries.forEach((c) => {
      map[c.properties.name] = c;
    });
    return map;
  }, [countries]);

  const koreaCentroid = useMemo(() => {
    const korea = nameToFeature["South Korea"];
    return korea ? geoCentroid(korea) : null;
  }, [nameToFeature]);

  const projection = useMemo(
    () => geoNaturalEarth1().fitExtent([[0, 0], [WIDTH, HEIGHT]], REGION),
    [],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const [selected, setSelected] = useState<Step | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const rawId = useId().replace(/:/g, "");
  const arrowId = `flatmap-arrow-${rawId}`;
  const glowId = `flatmap-glow-${rawId}`;

  const activeName = hoverName ?? selectedName;
  const arcD = useMemo(() => {
    const target = activeName ? nameToFeature[activeName] : null;
    if (!target || !koreaCentroid) return "";
    return (
      pathGen({ type: "LineString", coordinates: [koreaCentroid, geoCentroid(target)] }) ?? ""
    );
  }, [activeName, koreaCentroid, nameToFeature, pathGen]);

  const handleClick = (name: string) => {
    const step = countryToStep[name];
    if (!step) return;
    setSelected(step);
    setSelectedName(name === "South Korea" ? null : name);
  };

  return (
    <section
      className="relative h-full w-full overflow-hidden bg-(--on-brand)"
      aria-label="Interactive service coverage flat map"
    >
      <svg
        viewBox={`${WIDTH * 0.05} ${-HEIGHT * 0.1} ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full select-none"
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
          >
            <circle cx="5" cy="5" r="4" fill="#ff5a6e" />
          </marker>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>{`
          @keyframes flatmapDash { to { stroke-dashoffset: -8; } }
          @keyframes flatmapGlow { 0%,100% { opacity: .35; } 50% { opacity: .85; } }
        `}</style>
        {countries.map((c) => {
          const name = c.properties.name;
          const step = countryToStep[name];
          const isHome = name === "South Korea";
          const isSelected = selected && step === selected;
          return (
            <path
              key={name}
              d={pathGen(c) ?? ""}
              data-name={name}
              onClick={() => handleClick(name)}
              onPointerEnter={() => {
                if (step && !isHome) setHoverName(name);
              }}
              onPointerLeave={() => setHoverName(null)}
              className={step ? "cursor-pointer hover:brightness-125 transition-[filter]" : ""}
              fill={
                isSelected
                  ? "var(--gold)"
                  : isHome
                    ? "var(--brand)"
                    : step
                      ? `rgba(${stepColor.get(step) ?? "201,168,76"},0.55)`
                      : "rgba(255,255,255,0.12)"
              }
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.5}
            />
          );
        })}
        {arcD && (
          <g className="pointer-events-none" filter={`url(#${glowId})`}>
            {/* 은은하게 맥동하는 발광 언더레이 */}
            <path
              d={arcD}
              fill="none"
              stroke="#ff5a6e"
              strokeWidth={5}
              strokeLinecap="round"
              style={{ animation: "flatmapGlow 2.6s ease-in-out infinite" }}
            />
            {/* 흐르는 점선 */}
            <path
              d={arcD}
              fill="none"
              stroke="#ff5a6e"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeDasharray="0.5 7.5"
              markerEnd={`url(#${arrowId})`}
              style={{ animation: "flatmapDash 1s linear infinite" }}
            />
          </g>
        )}
      </svg>

      <div className="pointer-events-none relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center">
        <div className="pointer-events-auto max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              서비스 커버리지
            </span>
          </div>
          <h3 className="text-3xl xl:text-4xl font-semibold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(10,31,68,0.8)]">
            평면 지도로 한눈에 확인하세요.
          </h3>
          <p className="mt-4 text-sm text-white/70 leading-relaxed drop-shadow-[0_2px_8px_rgba(10,31,68,0.8)]">
            강조된 국가에 마우스를 올리거나 클릭하면 해당 지역의 인증 서비스 정보가 표시됩니다.
          </p>

          <div className="mt-8 min-h-[220px]">
            {selected ? (
              <div className="rounded-2xl border border-white/15 bg-(--on-brand)/80 backdrop-blur-sm p-6">
                <div className="text-[10px] font-bold tracking-[0.3em] text-(--gold) uppercase">
                  {selected.tag}
                </div>
                <h4 className="mt-2 text-xl font-semibold text-white">{selected.title}</h4>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{selected.desc}</p>
                {selected.certifications.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.certifications.map((c) =>
                      c.href && c.href !== "#" ? (
                        <Link
                          key={c.title}
                          href={c.href}
                          className="inline-flex items-center rounded border border-(--gold)/30 bg-(--gold)/10 px-2.5 py-1 text-xs font-semibold text-(--gold) transition-colors hover:bg-(--gold) hover:text-(--on-brand)"
                        >
                          {c.title}
                        </Link>
                      ) : (
                        <span
                          key={c.title}
                          className="inline-flex items-center rounded border border-(--gold)/30 bg-(--gold)/10 px-2.5 py-1 text-xs font-semibold text-(--gold)"
                        >
                          {c.title}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-(--on-brand)/60 backdrop-blur-sm p-6 text-sm text-white/50">
                강조된 국가를 클릭해 보세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
