"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import { type Step } from "./ServiceProcess";
import { COUNTRY_TO_STEP, loadWorldCountries, type CountryFeature } from "./worldGeo";

const SIZE = 560;
const AUTO_SPEED = 0.045;
const CLICK_DRAG_THRESHOLD = 4;
const DRAG_SENSITIVITY = 0.28;

export default function ServiceGlobe() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const sphereRef = useRef<SVGPathElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const rotationRef = useRef<[number, number, number]>([-127, -20, 0]);
  const draggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const hoverNameRef = useRef<string | null>(null);
  const selectedNameRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<Step | null>(null);
  const arrowId = `globe-arrow-${useId().replace(/:/g, "")}`;

  const countries = useMemo(() => loadWorldCountries(), []);

  const nameToFeature = useMemo(() => {
    const map: Record<string, CountryFeature> = {};
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
    () => geoOrthographic().translate([SIZE / 2, SIZE / 2]).scale(SIZE / 2.15).clipAngle(90),
    [],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  useEffect(() => {
    let raf = 0;
    const paint = () => {
      projection.rotate(rotationRef.current);
      sphereRef.current?.setAttribute("d", pathGen({ type: "Sphere" }) ?? "");
      countries.forEach((c, i) => {
        pathRefs.current[i]?.setAttribute("d", pathGen(c) ?? "");
      });

      const activeName = hoverNameRef.current ?? selectedNameRef.current;
      const target = activeName ? nameToFeature[activeName] : null;
      if (target && koreaCentroid) {
        const arc = { type: "LineString" as const, coordinates: [koreaCentroid, geoCentroid(target)] };
        arcRef.current?.setAttribute("d", pathGen(arc) ?? "");
        arcRef.current?.setAttribute("opacity", "1");
      } else {
        arcRef.current?.setAttribute("opacity", "0");
      }
    };
    const render = () => {
      if (!draggingRef.current) rotationRef.current[0] += AUTO_SPEED;
      paint();
      raf = requestAnimationFrame(render);
    };
    paint();
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [countries, nameToFeature, koreaCentroid, pathGen, projection]);

  const pressedNameRef = useRef<string | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    dragDistanceRef.current = 0;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    pressedNameRef.current = (e.target as SVGElement).dataset?.name ?? null;
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPointRef.current.x;
    const dy = e.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
    rotationRef.current[0] += dx * DRAG_SENSITIVITY;
    rotationRef.current[1] = Math.max(
      -89,
      Math.min(89, rotationRef.current[1] - dy * DRAG_SENSITIVITY),
    );
  };
  const onPointerUp = () => {
    draggingRef.current = false;
    if (dragDistanceRef.current <= CLICK_DRAG_THRESHOLD && pressedNameRef.current) {
      const name = pressedNameRef.current;
      const step = COUNTRY_TO_STEP[name];
      if (step) {
        setSelected(step);
        selectedNameRef.current = name === "South Korea" ? null : name;
      }
    }
  };
  const onCountryEnter = (name: string) => {
    if (COUNTRY_TO_STEP[name] && name !== "South Korea") hoverNameRef.current = name;
  };
  const onCountryLeave = () => {
    hoverNameRef.current = null;
  };

  return (
    <section
      className="relative h-full w-full overflow-hidden bg-(--on-brand)"
      aria-label="Interactive service coverage globe"
    >
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
        <div className="lg:col-span-5 order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-px bg-white/60" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">
              서비스 커버리지
            </span>
          </div>
          <h3 className="text-3xl xl:text-4xl font-semibold text-white tracking-tight max-w-md">
            지구본을 돌려 국가를 확인해 보세요.
          </h3>
          <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
            드래그로 회전하고, 강조된 국가를 클릭하면 해당 지역의 인증 서비스 정보가 표시됩니다.
          </p>

          <div className="mt-8 min-h-[220px]">
            {selected ? (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <div className="text-[10px] font-bold tracking-[0.3em] text-(--gold) uppercase">
                  {selected.tag}
                </div>
                <h4 className="mt-2 text-xl font-semibold text-white">{selected.title}</h4>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{selected.desc}</p>
                {selected.certifications.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center rounded border border-(--gold)/30 bg-(--gold)/10 px-2.5 py-1 text-xs font-semibold text-(--gold)"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/40">
                강조된 국가를 클릭해 보세요.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ width: "min(90vw, 560px)", aspectRatio: "1 / 1" }}
            className="touch-none select-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
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
            <path ref={sphereRef} fill="#0e2547" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
            {countries.map((c, i) => {
              const name = c.properties.name;
              const step = COUNTRY_TO_STEP[name];
              const isHome = name === "South Korea";
              const isSelected = selected && step === selected;
              return (
                <path
                  key={name}
                  ref={(el) => {
                    pathRefs.current[i] = el;
                  }}
                  data-name={name}
                  onPointerEnter={() => onCountryEnter(name)}
                  onPointerLeave={onCountryLeave}
                  className={step ? "cursor-pointer hover:brightness-125 transition-[filter]" : ""}
                  fill={
                    isSelected
                      ? "var(--gold)"
                      : isHome
                        ? "var(--brand)"
                        : step
                          ? "rgba(201,168,76,0.55)"
                          : "rgba(255,255,255,0.18)"
                  }
                  stroke="rgba(10,31,68,0.6)"
                  strokeWidth={0.4}
                />
              );
            })}
            <path
              ref={arcRef}
              fill="none"
              stroke="#ff4757"
              strokeWidth={2}
              markerEnd={`url(#${arrowId})`}
              opacity={0}
              className="pointer-events-none"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
