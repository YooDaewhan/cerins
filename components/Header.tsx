"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Locale, LocaleCode, MenuNode } from "@/src/lib/types";
import UserMenu, { type HeaderUser } from "@/components/UserMenu";

interface HeaderProps {
  menus: MenuNode[];
  locale: LocaleCode;
  enabledLocales: Locale[];
  currentUser: HeaderUser | null;
}

const DEFAULT_LOCALE: LocaleCode = "ko";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const enabledCodes = enabledLocales.map((l) => l.code);

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
    if (openMenu) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
      if (headerRef.current) {
        headerRef.current.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (headerRef.current) {
        headerRef.current.style.paddingRight = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (headerRef.current) {
        headerRef.current.style.paddingRight = "";
      }
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const activeItem = menus.find((n) => n.label === openMenu);
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
          <div className="flex items-center justify-between h-20">
            {/* 로고 */}
            <Link
              href={locale === DEFAULT_LOCALE ? "/" : `/${locale}`}
              className="flex items-center"
              onClick={() => setOpenMenu(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cerins-logo.jpg" alt="CERINS" className="h-14 w-auto" />
            </Link>

            {/* 데스크톱 네비 */}
            <nav className="hidden lg:flex items-center gap-1">
              {menus.map((item) => {
                const isOpen = openMenu === item.label;
                const active = isActive(item.href);

                if (item.children.length === 0) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`relative px-6 py-6 text-base font-bold tracking-wider uppercase transition-colors ${
                        active
                          ? "text-(--brand) bg-[#fff5f6]"
                          : "text-gray-700 hover:text-(--brand) hover:bg-gray-100"
                      }`}
                      onClick={() => setOpenMenu(null)}
                    >
                      {item.label}
                      <span
                        className={`pointer-events-none absolute left-5 right-5 bottom-3 h-0.5 bg-(--brand) origin-left transition-transform duration-300 ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    onMouseEnter={() => {
                      if (openMenu) setOpenMenu(item.label);
                    }}
                    className={`relative px-6 py-6 text-base font-bold tracking-wider uppercase transition-colors ${
                      isOpen || active
                        ? "text-(--brand) bg-[#fff5f6]"
                        : "text-gray-700 hover:text-(--brand) hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`pointer-events-none absolute left-5 right-5 bottom-3 h-0.5 bg-(--brand) origin-left transition-transform duration-300 ${
                        isOpen || active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </button>
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

      {/* ── 메가 패널 ── */}
      <div
        aria-hidden={!openMenu}
        className={`fixed top-20 left-0 right-0 z-[95] transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${
          openMenu
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ height: "calc(80vh)" }}
      >
        <div className="relative h-full grid grid-cols-1 lg:grid-cols-2 bg-[#15161b] overflow-hidden">
          <div className="relative hidden lg:block overflow-hidden">
            {menus
              .filter((m) => m.mega_image_url)
              .map((m) => (
                <div
                  key={m.id}
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
                  style={{
                    backgroundImage: `url('${m.mega_image_url}')`,
                    opacity: openMenu === m.label ? 1 : 0,
                    transform: openMenu === m.label ? "scale(1)" : "scale(1.05)",
                    transition: "opacity 700ms ease, transform 8s ease-out",
                  }}
                />
              ))}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#15161b]/40" />
            <div className="absolute bottom-10 left-10 z-10 text-white/80">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-px bg-(--brand)" />
                <span className="text-[10px] tracking-[0.3em] font-semibold uppercase text-(--brand)">
                  CERINS
                </span>
              </div>
              <div className="font-mono text-xs text-white/50">
                Global Certification & Inspection
              </div>
            </div>
          </div>

          <div className="relative h-full flex flex-col px-8 sm:px-14 py-12 lg:py-16 overflow-y-auto">
            <div
              className="mb-10 lg:mb-14"
              style={{
                animation: openMenu
                  ? "megaIn 0.55s cubic-bezier(.2,.7,.2,1) 0.05s both"
                  : "none",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-0.5 bg-(--brand)" />
                <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-(--brand)">
                  Menu
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-(--brand) tracking-tight uppercase">
                {openMenu}
              </h2>
            </div>

            <ul className="flex-1 space-y-1">
              {activeItem?.children.map((child, idx) => (
                <li
                  key={child.id}
                  style={{
                    animation: openMenu
                      ? `megaIn 0.55s cubic-bezier(.2,.7,.2,1) ${0.1 + idx * 0.06}s both`
                      : "none",
                  }}
                >
                  <Link
                    href={child.href}
                    onClick={() => setOpenMenu(null)}
                    className="group flex items-center gap-4 py-3 border-b border-white/10 text-white hover:text-(--brand) transition-colors"
                  >
                    <span className="text-[10px] font-mono text-white/30 group-hover:text-(--brand) transition-colors w-6">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base sm:text-lg font-semibold tracking-wide uppercase flex-1">
                      {child.label}
                    </span>
                    <svg
                      className="w-5 h-5 text-white/30 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-(--brand) transition-all duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            <div
              className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{
                animation: openMenu
                  ? "megaIn 0.55s cubic-bezier(.2,.7,.2,1) 0.4s both"
                  : "none",
              }}
            >
              <Link
                href={locale === DEFAULT_LOCALE ? "/contact" : `/${locale}/contact`}
                className="group flex items-center justify-between gap-4 px-6 py-4 bg-(--brand) hover:bg-(--brand-dark) text-white text-sm font-bold tracking-wider uppercase transition-colors"
              >
                CERINS Brochure
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href={locale === DEFAULT_LOCALE ? "/contact" : `/${locale}/contact`}
                className="group flex items-center justify-between gap-4 px-6 py-4 bg-(--brand) hover:bg-(--brand-dark) text-white text-sm font-bold tracking-wider uppercase transition-colors"
              >
                Terms & Conditions
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={() => setOpenMenu(null)}
        aria-hidden
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
          openMenu ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <style>{`
        @keyframes megaIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
