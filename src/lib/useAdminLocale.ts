"use client";

import { usePathname } from "next/navigation";
import { splitLocaleFromPath } from "./i18n";
import type { LocaleCode } from "./types";

// 현재 URL 로케일(= 편집 언어)을 반환. locale prop을 화면마다 뚫지 않기 위해
// 클라이언트 컴포넌트가 직접 호출한다. AdminLocaleSwitcher와 동일한 소스.
export function useAdminLocale(): LocaleCode {
  return splitLocaleFromPath(usePathname()).locale;
}
