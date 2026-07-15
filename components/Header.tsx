"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale, LocaleCode, MenuNode } from "@/src/lib/types";
import UserMenu, { type HeaderUser } from "@/components/UserMenu";
import AdvancedSearchModal from "@/components/AdvancedSearchModal";
import { buildLocalizedPath } from "@/src/lib/i18n";

interface HeaderProps {
  menus: MenuNode[];
  locale: LocaleCode;
  enabledLocales: Locale[];
  currentUser: HeaderUser | null;
}

const DEFAULT_LOCALE: LocaleCode = "ko";

const LOGOS = ["/cerins-logo-color.jpg", "/cerins-logo-white.jpg"] as const;
const LOGO_SWEEP_INTERVAL_MS = 10000;

function buildLocalizedHref(target: LocaleCode, currentPathname: string, enabled: LocaleCode[]): string {
  // Strip a leading locale segment if present.
  const segments = currentPathname.split("/").filter(Boolean);
  let rest = currentPathname;
  if (segments.length > 0 && (enabled as string[]).includes(segments[0])) {
    rest = "/" + segments.slice(1).join("/");
    if (rest === "/") rest = "/";
  }
  if (rest === "") rest = "/";
  if (target === DEFAULT_LOCALE) return rest;
  if (rest === "/") return "/" + target;
  return "/" + target + rest;
}

export default function Header({ menus, locale, enabledLocales, currentUser }: HeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [logoTick, setLogoTick] = useState(0);

  const enabledCodes = enabledLocales.map((l) => l.code);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(buildLocalizedPath(locale, `/search?q=${encodeURIComponent(q)}`));
  };

  useEffect(() => {
    const id = setInterval(() => {
      setLogoTick((v) => v + 1);
    }, LOGO_SWEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const logoOutIndex = logoTick === 0 ? 0 : (logoTick - 1) % LOGOS.length;
  const logoInIndex = logoTick % LOGOS.length;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    if (openMenu) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenu]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const currentLocale = enabledLocales.find((l) => l.code === locale);

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-shadow duration-300 ${
          scrolled || openMenu
            ? "bg-white shadow-[0_2px_20px_rgba(10,31,68,0.08)]"
            : "bg-white"
        } border-b border-gray-200/60`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-center h-20">
            {/* 로고 — 다른 요소처럼 flex 흐름에 포함, 최소 너비만 지정하고 오른쪽 여백만 유지 */}
            <Link
              href={locale === DEFAULT_LOCALE ? "/" : `/${locale}`}
              className="flex items-center h-12 min-w-32 mr-6 shrink-0"
              onClick={() => setOpenMenu(null)}
            >
              <div className="relative h-14 w-[140px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGOS[logoInIndex]}
                  alt="CERINS"
                  className="absolute inset-0 h-14 w-auto object-contain object-left"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={logoTick}
                  src={LOGOS[logoOutIndex]}
                  alt="CERINS"
                  className={`absolute inset-0 h-14 w-auto object-contain object-left ${
                    logoTick > 0 ? "animate-logo-veil" : ""
                  }`}
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(115deg, #000 0%, #000 42%, transparent 56%, transparent 100%)",
                    maskImage:
                      "linear-gradient(115deg, #000 0%, #000 42%, transparent 56%, transparent 100%)",
                    WebkitMaskSize: "300% 100%",
                    maskSize: "300% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "0% 0%",
                    maskPosition: "0% 0%",
                  }}
                />
              </div>
            </Link>

            {/* 데스크톱 네비 */}
            <nav
              className="hidden lg:flex items-center gap-1"
              onMouseLeave={() => setHovered(null)}
            >
              {menus.map((item, idx) => {
                const isOpen = openMenu === item.label;
                const active = isActive(item.href);
                // 마우스가 올라간 항목이 있으면 그 항목만, 없으면 활성/열린 항목만 배경 표시 → 배경은 항상 한 개.
                const filled = hovered ? hovered === item.label : isOpen || active;
                const divider = idx > 0 ? (
                  <span key={`divider-${item.id}`} className="w-px h-5 bg-black" aria-hidden />
                ) : null;

                if (item.children.length === 0) {
                  return (
                    <div key={item.id} className="flex items-center">
                      {divider}
                      <Link
                        href={item.href}
                        onMouseEnter={() => setHovered(item.label)}
                        className={`group relative overflow-hidden whitespace-nowrap px-6 py-6 text-base font-bold tracking-wider uppercase transition-colors duration-300 ${
                          filled ? "text-white" : "text-gray-700"
                        }`}
                        onClick={() => setOpenMenu(null)}
                      >
                        {/* 왼쪽에서 오른쪽으로 채워지는 배경 */}
                        <span
                          className={`pointer-events-none absolute inset-0 bg-(--brand) origin-left transition-transform duration-300 ease-out ${
                            filled ? "scale-x-100" : "scale-x-0"
                          }`}
                        />
                        <span className="relative z-10">{item.label}</span>
                        {/* 활성 상태 흰색 밑줄 */}
                        <span
                          className={`pointer-events-none absolute left-5 right-5 bottom-3 z-10 h-0.5 bg-white origin-left transition-transform duration-300 ${
                            active ? "scale-x-100" : "scale-x-0"
                          }`}
                        />
                      </Link>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="relative flex items-center">
                    {divider}
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenMenu(isOpen ? null : item.label)}
                      onMouseEnter={() => {
                        setHovered(item.label);
                        if (openMenu) setOpenMenu(item.label);
                      }}
                      className={`group relative overflow-hidden whitespace-nowrap px-6 py-6 text-base font-bold tracking-wider uppercase transition-colors duration-300 ${
                        filled ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {/* 왼쪽에서 오른쪽으로 채워지는 배경 */}
                      <span
                        className={`pointer-events-none absolute inset-0 bg-(--brand) origin-left transition-transform duration-300 ease-out ${
                          filled ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                      <span className="relative z-10">{item.label}</span>
                      {/* 활성 상태 흰색 밑줄 */}
                      <span
                        className={`pointer-events-none absolute left-5 right-5 bottom-3 z-10 h-0.5 bg-white origin-left transition-transform duration-300 ${
                          isOpen || active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </button>

                    {/* 간단한 드롭다운 — 가로로 한 줄 */}
                    {isOpen && (
                      <div className="absolute top-full left-0 z-[110] mt-2 flex items-stretch divide-x divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_16px_40px_rgba(10,31,68,0.14)] animate-[ddIn_.22s_cubic-bezier(.2,.7,.2,1)_both]">
                        {/* 상단 브랜드 액센트 */}
                        <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-(--brand) via-[#d6325a] to-(--brand)" />
                        {item.children.map((child, ci) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            onClick={() => setOpenMenu(null)}
                            style={{ animation: `ddItemIn .3s cubic-bezier(.2,.7,.2,1) ${0.04 + ci * 0.04}s both` }}
                            className="group flex items-center gap-2.5 whitespace-nowrap px-6 py-4 text-sm font-semibold tracking-wide uppercase text-gray-600 transition-colors duration-200 hover:bg-[#fff5f6] hover:text-(--brand)"
                          >
                            <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300 transition-all duration-300 group-hover:w-4 group-hover:bg-(--brand)" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 우측: 사용자 메뉴 */}
              <div className="ml-3">
                <UserMenu user={currentUser} locale={locale} />
              </div>

              {/* 우측: 언어 선택 */}
              <div className="ml-2 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLangOpen((v) => !v);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-gray-700 hover:text-(--brand) border border-gray-300 rounded-full hover:border-(--brand) transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                  </svg>
                  {currentLocale?.code.toUpperCase() ?? locale.toUpperCase()}
                </button>
                {langOpen && (
                  <div
                    className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-lg shadow-xl py-1"
                    style={{ zIndex: 200 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {enabledLocales.map((l) => {
                      const href = buildLocalizedHref(l.code, pathname, enabledCodes);
                      const isCurrent = l.code === locale;
                      return (
                        <Link
                          key={l.code}
                          href={href}
                          onClick={() => setLangOpen(false)}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isCurrent
                              ? "font-semibold text-(--brand) bg-[#fff5f6]"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {l.native_name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* 검색 (헤더 우측 끝, 네비와 분리) */}
            <form onSubmit={handleSearch} className="hidden lg:block shrink-0 ml-4">
              <div className="relative flex items-center w-69 rounded-full bg-gray-100 border border-gray-200 focus-within:border-(--brand) focus-within:bg-white transition-all duration-300">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="인증·국가 검색"
                  aria-label="인증 검색"
                  className="flex-1 min-w-0 bg-transparent pl-4 pr-1 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Advanced search"
                  onClick={() => setAdvOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 mr-1 text-xs font-bold text-gray-600 hover:text-(--brand) border border-gray-300 rounded-full hover:border-(--brand) transition-colors whitespace-nowrap"
                >
                  <span className="text-sm leading-none">+</span>
                  Advanced
                </button>
                <button
                  type="submit"
                  aria-label="검색"
                  className="w-7 h-7 mr-1 flex items-center justify-center rounded-full text-gray-500 hover:text-(--brand) transition-colors duration-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </button>
              </div>
            </form>

            <AdvancedSearchModal
              locale={locale}
              open={advOpen}
              onClose={() => setAdvOpen(false)}
            />

            {/* 모바일 햄버거 */}
            <button
              type="button"
              className="lg:hidden relative w-9 h-9 flex items-center justify-center text-gray-700 hover:text-(--brand) transition-colors"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className={`absolute block h-0.5 w-5 bg-current transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5"}`} />
              <span className={`absolute block h-0.5 w-5 bg-current transition-all duration-300 ${mobileOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute block h-0.5 w-5 bg-current transition-all duration-300 ${mobileOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5"}`} />
            </button>
          </div>
        </div>

        {/* ── 모바일 메뉴 ── */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-[80vh]" : "max-h-0"}`}>
          <div className="border-t border-gray-200 bg-white shadow-xl overflow-y-auto max-h-[80vh]">
            {menus.map((item) => (
              <div key={item.id} className="border-b border-gray-100">
                <div className="flex items-center">
                  {item.children.length > 0 ? (
                    <button
                      type="button"
                      className={`flex-1 text-left px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                        mobileExpanded === item.label ? "text-(--brand)" : "text-(--brand)"
                      }`}
                      onClick={() => setMobileExpanded((v) => (v === item.label ? null : item.label))}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex-1 px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                        isActive(item.href) ? "text-(--brand)" : "text-(--brand)"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                  {item.children.length > 0 && (
                    <svg className={`w-4 h-4 mr-5 text-gray-400 transition-transform duration-300 ${mobileExpanded === item.label ? "rotate-180 text-(--brand)" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
                {item.children.length > 0 && (
                  <div className={`bg-[#f8f9fc] border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileExpanded === item.label ? "max-h-[600px]" : "max-h-0"}`}>
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className="flex items-center gap-2.5 pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-(--brand) border-b border-gray-100 last:border-0 transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-(--brand)" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
              <UserMenu user={currentUser} locale={locale} variant="mobile" />
            </div>
            <div className="px-5 py-4 flex items-center gap-3 bg-gray-50 flex-wrap">
              {enabledLocales.map((l, i) => {
                const href = buildLocalizedHref(l.code, pathname, enabledCodes);
                const isCurrent = l.code === locale;
                return (
                  <span key={l.code} className="flex items-center gap-3">
                    {i > 0 && <span className="text-gray-300 text-xs">|</span>}
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`text-sm ${isCurrent ? "font-semibold text-(--brand)" : "text-gray-500"}`}
                    >
                      {l.code.toUpperCase()}
                    </Link>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* 드롭다운 바깥 클릭 시 닫기 (투명) */}
      {openMenu && (
        <div
          onClick={() => setOpenMenu(null)}
          aria-hidden
          className="fixed inset-0 z-[90]"
        />
      )}

      <style>{`
        @keyframes ddIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ddItemIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoVeil {
          from {
            -webkit-mask-position: 0% 0%;
            mask-position: 0% 0%;
          }
          to {
            -webkit-mask-position: 100% 0%;
            mask-position: 100% 0%;
          }
        }
        .animate-logo-veil {
          animation: logoVeil 2600ms ease-in-out forwards;
        }
      `}</style>
    </>
  );
}
