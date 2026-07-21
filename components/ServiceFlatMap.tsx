"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { geoCentroid, geoGraticule, geoNaturalEarth1, geoPath } from "d3-geo";
import { type Step } from "./ServiceProcess";
import { COUNTRY_TO_STEP, HOME, WEST_BOUND, loadWorldCountries } from "./worldGeo";

const WIDTH = 820;
const HEIGHT = 430;

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

  // 경위도 격자 (15도 간격) — 배경에 흐리게 깔아 첨단 느낌 보강.
  const graticuleD = useMemo(
    () => pathGen(geoGraticule().step([15, 15])()) ?? "",
    [pathGen],
  );

  const [selected, setSelected] = useState<Step | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const rawId = useId().replace(/:/g, "");
  const arrowId = `flatmap-arrow-${rawId}`;
  const glowId = `flatmap-glow-${rawId}`;
  const bgGlowId = `flatmap-bgglow-${rawId}`;
  const landGradId = `flatmap-land-${rawId}`;
  const softGlowId = `flatmap-soft-${rawId}`;
  const markerGlowId = `flatmap-mglow-${rawId}`;

  const activeName = hoverName ?? selectedName;
  const arcD = useMemo(() => {
    const target = activeName ? nameToFeature[activeName] : null;
    if (!target || !koreaCentroid) return "";
    return (
      pathGen({ type: "LineString", coordinates: [koreaCentroid, geoCentroid(target)] }) ?? ""
    );
  }, [activeName, koreaCentroid, nameToFeature, pathGen]);

  // 거래국 중앙에 찍을 고리 마커 — 국경/채색 대신 이것만 표시. 스텝(거래국)당 하나만.
  const markers = useMemo(() => {
    const out: { name: string; step: Step; x: number; y: number; isHome: boolean }[] = [];
    const seen = new Set<Step>();
    for (const name of Object.keys(countryToStep)) {
      const step = countryToStep[name];
      if (seen.has(step)) continue;
      const f = nameToFeature[name];
      if (!f) continue;
      const p = projection(geoCentroid(f));
      if (!p) continue;
      seen.add(step);
      out.push({ name, step, x: p[0], y: p[1], isHome: name === "South Korea" });
    }
    return out;
  }, [countryToStep, nameToFeature, projection]);

  // 서울에서 모든 거래국으로 상시 연결되는 아크 경로.
  const routes = useMemo(() => {
    if (!koreaCentroid) return [];
    return markers
      .filter((m) => !m.isHome)
      .map((m, i) => {
        const f = nameToFeature[m.name];
        const d = f
          ? pathGen({ type: "LineString", coordinates: [koreaCentroid, geoCentroid(f)] }) ?? ""
          : "";
        return { name: m.name, d, i };
      })
      .filter((r) => r.d);
  }, [markers, koreaCentroid, nameToFeature, pathGen]);

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
          {/* 배경 광원 — 지도 중앙에서 은은하게 새어나오는 빛 */}
          <radialGradient id={bgGlowId} cx="42%" cy="38%" r="65%">
            <stop offset="0%" stopColor="rgba(120,170,255,0.28)" />
            <stop offset="45%" stopColor="rgba(90,130,220,0.10)" />
            <stop offset="100%" stopColor="rgba(10,31,68,0)" />
          </radialGradient>
          {/* 육지 그라데이션 — 지도 전체 좌표 기준(연속)이라 국가 경계 이음새가 안 생김 */}
          <linearGradient
            id={landGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={-HEIGHT * 0.1}
            x2="0"
            y2={HEIGHT * 0.9}
          >
            <stop offset="0%" stopColor="rgba(190,215,255,0.22)" />
            <stop offset="100%" stopColor="rgba(120,150,210,0.06)" />
          </linearGradient>
          {/* 육지 발광 언더레이용 부드러운 블러 */}
          <filter id={softGlowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          {/* 마커 발광 */}
          <filter id={markerGlowId} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>{`
          @keyframes flatmapDash { to { stroke-dashoffset: -8; } }
          @keyframes flatmapFlow { to { stroke-dashoffset: -19; } }
          @keyframes flatmapGlow { 0%,100% { opacity: .35; } 50% { opacity: .85; } }
          @keyframes flatmapPulse { 0% { r: 6; opacity: .55; } 100% { r: 16; opacity: 0; } }
        `}</style>
        {/* 배경 광원 레이어 */}
        <rect
          x={WIDTH * 0.05}
          y={-HEIGHT * 0.1}
          width={WIDTH}
          height={HEIGHT}
          fill={`url(#${bgGlowId})`}
        />
        {/* 경위도 격자 — 배경 */}
        {graticuleD && (
          <path
            d={graticuleD}
            fill="none"
            stroke="rgba(150,190,255,0.12)"
            strokeWidth={0.4}
          />
        )}
        {/* 국경·채색 없음 — 육지를 그라데이션 + 은은한 발광으로. (러·우 국경 이슈 회피) */}
        <g filter={`url(#${softGlowId})`} opacity={0.55}>
          {countries.map((c) => (
            <path key={`glow-${c.properties.name}`} d={pathGen(c) ?? ""} fill={`url(#${landGradId})`} />
          ))}
        </g>
        {countries.map((c) => (
          <path key={c.properties.name} d={pathGen(c) ?? ""} fill={`url(#${landGradId})`} />
        ))}
        {/* 상시 연결 아크 — 서울→거래국. 은은한 라인 + 흐르는 빛 점선. */}
        <g className="pointer-events-none" filter={`url(#${glowId})`}>
          {routes.map((r) => (
            <g key={`route-${r.name}`}>
              <path d={r.d} fill="none" stroke="rgba(150,190,255,0.22)" strokeWidth={0.8} strokeLinecap="round" />
              <path
                d={r.d}
                fill="none"
                stroke="rgba(190,220,255,0.9)"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeDasharray="1 18"
                style={{ animation: `flatmapFlow 3.4s linear infinite`, animationDelay: `${r.i * 0.3}s` }}
              />
            </g>
          ))}
        </g>
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
        {/* 거래국 중앙 고리 마커 — 호버/클릭 상호작용은 여기에. */}
        {markers.map((m) => {
          const isSelected = selected != null && m.step === selected;
          const color = m.isHome ? "rgba(220,90,110,0.85)" : "rgba(255,255,255,0.75)";
          return (
            <g
              key={m.name}
              transform={`translate(${m.x} ${m.y})`}
              onClick={() => handleClick(m.name)}
              onPointerEnter={() => {
                if (!m.isHome) setHoverName(m.name);
              }}
              onPointerLeave={() => setHoverName(null)}
              className="cursor-pointer"
              filter={`url(#${markerGlowId})`}
            >
              {/* 넓은 투명 히트박스 */}
              <circle r={11} fill="transparent" />
              {/* 밖으로 퍼지는 맥동 링 */}
              <circle
                r={6}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                style={{ animation: "flatmapPulse 2.8s ease-out infinite" }}
              />
              <circle
                r={isSelected ? 8 : 6}
                fill="none"
                stroke={color}
                strokeWidth={2}
                className="transition-all"
              />
              <circle r={2.5} fill={color} />
            </g>
          );
        })}
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
