"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
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

  const [selected, setSelected] = useState<Step | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const arrowId = `flatmap-arrow-${useId().replace(/:/g, "")}`;

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
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#ff4757" />
          </marker>
        </defs>
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
                      ? "rgba(201,168,76,0.55)"
                      : "rgba(255,255,255,0.12)"
              }
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.5}
            />
          );
        })}
        <path
          d={arcD}
          fill="none"
          stroke="#ff4757"
          strokeWidth={2}
          markerEnd={`url(#${arrowId})`}
          opacity={arcD ? 1 : 0}
          className="pointer-events-none"
        />
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
