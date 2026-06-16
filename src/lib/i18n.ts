import { locales } from "@/src/mocks/locales";
import type { LocaleCode } from "@/src/lib/types";

export const DEFAULT_LOCALE: LocaleCode = "ko";

const enabledCodes = new Set<LocaleCode>(
  locales.filter((l) => l.is_enabled).map((l) => l.code),
);

export function isLocale(value: string): value is LocaleCode {
  return enabledCodes.has(value as LocaleCode);
}

/**
 * Split a URL pathname into its locale prefix and the remaining slug-portion.
 *
 *   /            → { locale: 'ko', rest: '/' }
 *   /about       → { locale: 'ko', rest: '/about' }
 *   /en          → { locale: 'en', rest: '/' }
 *   /en/about    → { locale: 'en', rest: '/about' }
 *   /ja/about/x  → { locale: 'ja', rest: '/about/x' }
 */
export function splitLocaleFromPath(pathname: string): {
  locale: LocaleCode;
  rest: string;
} {
  const [, head = "", ...rest] = pathname.split("/");
  if (isLocale(head) && head !== DEFAULT_LOCALE) {
    const restPath = "/" + rest.join("/");
    return { locale: head, rest: restPath === "/" ? "/" : restPath };
  }
  return { locale: DEFAULT_LOCALE, rest: pathname || "/" };
}

/**
 * Build a localized URL.
 *
 *   buildLocalizedPath('ko', '/about')  → '/about'
 *   buildLocalizedPath('en', '/about')  → '/en/about'
 *   buildLocalizedPath('ja', '/')       → '/ja'
 *
 * `slugOrPath` should start with '/' — it's the path portion after the locale
 * prefix, NOT a bare slug.
 */
export function buildLocalizedPath(locale: LocaleCode, slugOrPath: string): string {
  const path = slugOrPath.startsWith("/") ? slugOrPath : "/" + slugOrPath;
  if (locale === DEFAULT_LOCALE) {
    return path;
  }
  if (path === "/") {
    return "/" + locale;
  }
  return "/" + locale + path;
}
