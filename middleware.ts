import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/src/lib/i18n";
import { locales } from "@/src/mocks/locales";

const NON_DEFAULT_PREFIXES = locales
  .filter((l) => l.is_enabled && l.code !== DEFAULT_LOCALE)
  .map((l) => `/${l.code}`);

function hasLocalePrefix(pathname: string): boolean {
  return NON_DEFAULT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

// Standalone pages that live outside the localized [locale] tree.
const STANDALONE_PREFIXES = ["/process", "/photo-report"];

function isStandalone(pathname: string): boolean {
  return STANDALONE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (hasLocalePrefix(pathname) || isStandalone(pathname)) {
    return NextResponse.next();
  }

  // Rewrite "/about" → "/ko/about" (URL bar keeps "/about").
  const rewritten = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
  const url = request.nextUrl.clone();
  url.pathname = rewritten;
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on all paths except Next internals, the API folder, and any path with
  // a file extension (favicon, robots.txt, sitemap.xml, images, etc.).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
