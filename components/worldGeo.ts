import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";
import { STEPS, type Step } from "./ServiceProcess";

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

export const COUNTRY_TO_STEP: Record<string, Step> = {};
const ASSIGN: [number, string[]][] = [
  [0, ["Russia", "Kazakhstan", "Belarus", "Armenia", "Kyrgyzstan"]],
  [
    1,
    [
      "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia",
      "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
      "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg",
      "Netherlands", "Poland", "Portugal", "Romania", "Slovakia",
      "Slovenia", "Spain", "Sweden",
    ],
  ],
  [2, ["India"]],
  [3, ["Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait"]],
  [4, ["Turkey", "Vietnam", "Thailand", "Indonesia"]],
];
for (const [stepIdx, names] of ASSIGN) {
  for (const name of names) COUNTRY_TO_STEP[name] = STEPS[stepIdx];
}
COUNTRY_TO_STEP["South Korea"] = HOME;

export function loadWorldCountries(): CountryFeature[] {
  const geo = feature(
    worldTopo as unknown,
    (worldTopo as unknown as { objects: { countries: unknown } }).objects.countries,
  ) as unknown as { features: CountryFeature[] };
  return geo.features;
}
