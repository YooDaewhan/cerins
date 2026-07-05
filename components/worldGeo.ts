import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";
import type { Feature, Geometry, Position } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";
import { STEPS, type Step } from "./ServiceProcess";

// 지도 좌측 경계: 아프리카 서안(세네갈 서쪽 끝, 약 -17.5°)까지만.
// 이보다 서쪽의 섬(아이슬란드 -18.6°, 카보베르데 -23.9°)은 자동으로 제외된다.
export const WEST_BOUND = -17.5;

export interface CountryFeature extends Feature<Geometry> {
  properties: { name: string };
}

export const HOME: Step = {
  n: "KR",
  tag: "HOME BASE",
  title: "대한민국",
  overview: "CERINS 본사가 위치한 곳. 2009년부터 여기서 전 세계 인증·검사 프로젝트를 조율합니다.",
  desc: "국내 제조사의 해외 진출부터 해외 바이어의 한국 공급망 검증까지, 모든 프로젝트가 이곳에서 시작됩니다.",
  certifications: [],
};

export const EU_MAP_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
  "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg",
  "Netherlands", "Poland", "Portugal", "Romania", "Slovakia",
  "Slovenia", "Spain", "Sweden",
];

// 인증 국가 페이지 slug → world-atlas 지도의 영문 국가명 매핑.
// 목록에 없는 slug 은 slug 자체를 영문 국가명으로 간주한다 (예: "india" → "India").
const CERT_SLUG_TO_MAP_COUNTRIES: Record<string, string[]> = {
  russia: ["Russia"],
  kazakhstan: ["Kazakhstan"],
  belarus: ["Belarus", "Kyrgyzstan", "Armenia"],
  uzbekistan: ["Uzbekistan"],
  ukraine: ["Ukraine"],
  turkmenistan: ["Turkmenistan"],
  azerbaijan: ["Azerbaijan"],
  vietnam: ["Vietnam"],
  europe: EU_MAP_COUNTRIES,
};

export function mapCountriesForSlug(slug: string): string[] {
  const preset = CERT_SLUG_TO_MAP_COUNTRIES[slug];
  if (preset) return preset;
  return [
    slug
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" "),
  ];
}

export const COUNTRY_TO_STEP: Record<string, Step> = {};
const ASSIGN: [number, string[]][] = [
  [0, ["Russia", "Kazakhstan", "Belarus", "Armenia", "Kyrgyzstan"]],
  [1, EU_MAP_COUNTRIES],
  [2, ["India"]],
  [3, ["Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait"]],
  [4, ["Turkey", "Vietnam", "Thailand", "Indonesia"]],
];
for (const [stepIdx, names] of ASSIGN) {
  for (const name of names) COUNTRY_TO_STEP[name] = STEPS[stepIdx];
}
COUNTRY_TO_STEP["South Korea"] = HOME;

// 날짜변경선(180°)을 넘는 좌표(러시아 추코트카 등)는 서경으로 감겨
// 지도 왼쪽 끝에 떨어진 섬처럼 렌더링되므로 우측 경계에 고정한다.
function clampAntimeridian(ring: Position[]): Position[] {
  return ring.map(([lon, lat]) => (lon < -90 ? [179.999, lat] : [lon, lat]));
}

// WEST_BOUND 서쪽에 있는 폴리곤 조각(프랑스령 기아나, 랑겔 섬 등)을 제거하고
// 남은 조각의 날짜변경선 넘김을 보정한다.
function sanitizePolygons(polygons: Position[][][]): Position[][][] {
  return polygons
    .filter((poly) => {
      const [lon] = geoCentroid({ type: "Polygon", coordinates: poly });
      return lon >= WEST_BOUND;
    })
    .map((poly) => poly.map(clampAntimeridian));
}

export function loadWorldCountries(): CountryFeature[] {
  const geo = feature(
    worldTopo as unknown,
    (worldTopo as unknown as { objects: { countries: unknown } }).objects.countries,
  ) as unknown as { features: CountryFeature[] };
  return geo.features
    .map((f) => {
      const g = f.geometry;
      if (g.type === "Polygon") {
        const kept = sanitizePolygons([g.coordinates]);
        return { ...f, geometry: kept[0] ? { ...g, coordinates: kept[0] } : g };
      }
      if (g.type === "MultiPolygon") {
        return { ...f, geometry: { ...g, coordinates: sanitizePolygons(g.coordinates) } };
      }
      return f;
    })
    .filter(
      (f) => f.geometry.type !== "MultiPolygon" || f.geometry.coordinates.length > 0,
    ) as CountryFeature[];
}
