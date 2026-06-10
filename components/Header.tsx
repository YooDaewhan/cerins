"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/data/navigation";

const megaImages: Record<string, string> = {
  About:
    "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop",
  Certification:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&auto=format&fit=crop",
  Inspection:
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1400&q=80&auto=format&fit=crop",
};

export default function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  // ESC 키로 닫기 + 메가 열렸을 때 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    if (openMenu) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const activeItem = navigation.find((n) => n.label === openMenu);

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled || openMenu
            ? "bg-white shadow-[0_2px_20px_rgba(10,31,68,0.08)]"
            : "bg-white"
        } border-b border-gray-200/60`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link
              href="/"
              className="group relative text-2xl font-bold tracking-widest"
              onClick={() => setOpenMenu(null)}
            >
              <span style={{ color: "#0a1f44" }}>CER</span>
              <span style={{ color: "#B4123A" }}>INS</span>
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[#B4123A] transition-all duration-300 group-hover:w-full" />
            </Link>

            {/* 데스크톱 네비 */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const isOpen = openMenu === item.label;
                const active = isActive(item.path);

                if (!item.children) {
                  return (
                    <Link
                      key={item.label}
                      href={item.path}
                      className={`relative px-5 py-5 text-sm font-bold tracking-wider uppercase transition-colors ${
                        active
                          ? "text-[#B4123A]"
                          : "text-gray-700 hover:text-[#B4123A]"
                      }`}
                      onClick={() => setOpenMenu(null)}
                    >
                      {item.label}
                      <span
                        className={`pointer-events-none absolute left-5 right-5 bottom-3 h-0.5 bg-[#B4123A] origin-left transition-transform duration-300 ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    onMouseEnter={() => {
                      if (openMenu) setOpenMenu(item.label);
                    }}
                    className={`relative px-5 py-5 text-sm font-bold tracking-wider uppercase transition-colors ${
                      isOpen || active
                        ? "text-[#B4123A]"
                        : "text-gray-700 hover:text-[#B4123A]"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`pointer-events-none absolute left-5 right-5 bottom-3 h-0.5 bg-[#B4123A] origin-left transition-transform duration-300 ${
                        isOpen || active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </button>
                );
              })}

              {/* 우측: 언어 또는 닫기 X */}
              <div className="ml-3">
                {openMenu ? (
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpenMenu(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-[#B4123A] hover:text-white transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLangOpen((v) => !v);
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-gray-700 hover:text-[#B4123A] border border-gray-300 rounded-full hover:border-[#B4123A] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                      </svg>
                      KOR
                    </button>
                    {langOpen && (
                      <div
                        className="absolute right-0 mt-2 w-32 bg-white border border-gray-100 rounded-lg shadow-xl py-1"
                        style={{ zIndex: 200 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="w-full text-left px-4 py-2 text-sm font-semibold text-[#B4123A] bg-[#fff5f6]" onClick={() => setLangOpen(false)}>Korean</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setLangOpen(false)}>English</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* 모바일 햄버거 */}
            <button
              type="button"
              className="lg:hidden relative w-9 h-9 flex items-center justify-center text-gray-700 hover:text-[#B4123A] transition-colors"
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
            {navigation.map((item) => (
              <div key={item.label} className="border-b border-gray-100">
                <div className="flex items-center">
                  {item.children ? (
                    <button
                      type="button"
                      className={`flex-1 text-left px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                        mobileExpanded === item.label ? "text-[#B4123A]" : "text-[#0a1f44] hover:text-[#B4123A]"
                      }`}
                      onClick={() => setMobileExpanded((v) => (v === item.label ? null : item.label))}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.path}
                      className={`flex-1 px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                        isActive(item.path) ? "text-[#B4123A]" : "text-[#0a1f44] hover:text-[#B4123A]"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                  {item.children && (
                    <svg className={`w-4 h-4 mr-5 text-gray-400 transition-transform duration-300 ${mobileExpanded === item.label ? "rotate-180 text-[#B4123A]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
                {item.children && (
                  <div className={`bg-[#f8f9fc] border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileExpanded === item.label ? "max-h-[600px]" : "max-h-0"}`}>
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className="flex items-center gap-2.5 pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-[#B4123A] border-b border-gray-100 last:border-0 transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B4123A]" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-5 py-4 flex items-center gap-3 bg-gray-50">
              <button className="text-sm font-semibold text-[#B4123A]">KOR</button>
              <span className="text-gray-300 text-xs">|</span>
              <button className="text-sm text-gray-500">ENG</button>
            </div>
          </div>
        </div>
      </header>

      {/* ── 메가 패널 ── */}
      <div
        aria-hidden={!openMenu}
        className={`fixed top-16 left-0 right-0 z-[95] transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${
          openMenu
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ height: "calc(80vh)" }}
      >
        <div className="relative h-full grid grid-cols-1 lg:grid-cols-2 bg-[#15161b] overflow-hidden">
          {/* 좌측 이미지 */}
          <div className="relative hidden lg:block overflow-hidden">
            {Object.entries(megaImages).map(([key, url]) => (
              <div
                key={key}
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
                style={{
                  backgroundImage: `url('${url}')`,
                  opacity: openMenu === key ? 1 : 0,
                  transform: openMenu === key ? "scale(1)" : "scale(1.05)",
                  transition: "opacity 700ms ease, transform 8s ease-out",
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#15161b]/40" />
            {/* 좌하단 데코 */}
            <div className="absolute bottom-10 left-10 z-10 text-white/80">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-px bg-[#B4123A]" />
                <span className="text-[10px] tracking-[0.3em] font-semibold uppercase text-[#B4123A]">
                  CERINS
                </span>
              </div>
              <div className="font-mono text-xs text-white/50">
                Global Certification & Inspection
              </div>
            </div>
          </div>

          {/* 우측 다크 패널 */}
          <div className="relative h-full flex flex-col px-8 sm:px-14 py-12 lg:py-16 overflow-y-auto">
            {/* 타이틀 */}
            <div
              className="mb-10 lg:mb-14"
              style={{
                animation: openMenu
                  ? "megaIn 0.55s cubic-bezier(.2,.7,.2,1) 0.05s both"
                  : "none",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-0.5 bg-[#B4123A]" />
                <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-[#B4123A]">
                  Menu
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#B4123A] tracking-tight uppercase">
                {openMenu}
              </h2>
            </div>

            {/* 서브 아이템 리스트 */}
            <ul className="flex-1 space-y-1">
              {activeItem?.children?.map((child, idx) => (
                <li
                  key={child.path}
                  style={{
                    animation: openMenu
                      ? `megaIn 0.55s cubic-bezier(.2,.7,.2,1) ${0.1 + idx * 0.06}s both`
                      : "none",
                  }}
                >
                  <Link
                    href={child.path}
                    onClick={() => setOpenMenu(null)}
                    className="group flex items-center gap-4 py-3 border-b border-white/10 text-white hover:text-[#B4123A] transition-colors"
                  >
                    <span className="text-[10px] font-mono text-white/30 group-hover:text-[#B4123A] transition-colors w-6">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base sm:text-lg font-semibold tracking-wide uppercase flex-1">
                      {child.label}
                    </span>
                    <svg
                      className="w-5 h-5 text-white/30 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#B4123A] transition-all duration-300"
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

            {/* 하단 CTA 버튼 */}
            <div
              className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{
                animation: openMenu
                  ? "megaIn 0.55s cubic-bezier(.2,.7,.2,1) 0.4s both"
                  : "none",
              }}
            >
              <a
                href="/contact"
                className="group flex items-center justify-between gap-4 px-6 py-4 bg-[#B4123A] hover:bg-[#9b0f32] text-white text-sm font-bold tracking-wider uppercase transition-colors"
              >
                CERINS Brochure
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/contact"
                className="group flex items-center justify-between gap-4 px-6 py-4 bg-[#B4123A] hover:bg-[#9b0f32] text-white text-sm font-bold tracking-wider uppercase transition-colors"
              >
                Terms & Conditions
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 배경 백드롭 (메가 아래 영역 클릭 닫기) */}
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
