import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import type { LocaleCode, MenuNode } from "@/src/lib/types";

interface FooterProps {
  menus: MenuNode[];
  locale: LocaleCode;
}

const DEFAULT_LOCALE: LocaleCode = "ko";

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  if (path === "/") return "/" + locale;
  return "/" + locale + path;
}

export default function Footer({ menus, locale }: FooterProps) {
  const contactHref = localized("/contact", locale);
  const newsHref = localized("/news", locale);

  return (
    <footer className="snap-start snap-always bg-[#1e1e1e] text-white relative">
      <div className="h-1 bg-gradient-to-r from-(--brand) via-(--brand) to-(--brand)" />

      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-(--brand)" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-(--brand)">
              Ready to start?
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center">
            Bring your products to global markets with{" "}
            <span className="text-(--brand)">CERINS</span>
          </h3>
          <Link
            href={contactHref}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-(--brand) hover:opacity-90 text-white text-sm font-bold tracking-wider uppercase rounded-full transition-opacity"
          >
            Get a Quote
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="text-2xl font-bold tracking-widest mb-3">
              <span className="text-white">CER</span>
              <span className="text-(--brand)">INS</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Global Certification & Inspection Partner. Connecting Standards,
              Markets and Trust since 2009.
            </p>
            <div className="flex items-center gap-2">
              {["E", "L", "K"].map((c) => (
                <a
                  key={c}
                  href="#"
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/70 text-xs font-bold hover:bg-(--brand) hover:border-(--brand) hover:text-white transition-colors"
                  aria-label={`Social ${c}`}
                >
                  {c}
                </a>
              ))}
            </div>
          </div>

          {menus.slice(0, 3).map((item) => (
            <div key={item.id}>
              <h4 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-(--brand)" />
                {item.label}
              </h4>
              <ul className="space-y-2.5">
                {(item.children.length > 0
                  ? item.children
                  : [{ id: item.id, label: item.label, href: item.href }]
                ).map((child) => (
                  <li key={child.id}>
                    <Link
                      href={child.href}
                      className="group inline-flex items-center gap-2 text-sm text-gray-400 hover:text-(--brand) transition-colors"
                    >
                      <span className="w-0 group-hover:w-3 h-px bg-(--brand) transition-all duration-300" />
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-(--brand) mb-2">
              Headquarters
            </div>
            <p className="text-gray-300 leading-relaxed">Seoul, Republic of Korea</p>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-(--brand) mb-2">
              Email
            </div>
            <a href="mailto:info@cerins.com" className="text-gray-300 hover:text-white transition-colors">
              info@cerins.com
            </a>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-(--brand) mb-2">
              Global Offices
            </div>
            <p className="text-gray-300 leading-relaxed">Seoul · Moscow · Ho Chi Minh</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()}{" "}
            <span className="text-(--brand) font-semibold">CERINS</span>. All rights reserved.
          </p>
          <ThemeToggle />
          <div className="flex gap-5">
            <Link href={contactHref} className="text-xs text-gray-500 hover:text-(--brand) transition-colors">
              Contact
            </Link>
            <Link href={newsHref} className="text-xs text-gray-500 hover:text-(--brand) transition-colors">
              News
            </Link>
            <span className="text-xs text-gray-500">Privacy</span>
            <span className="text-xs text-gray-500">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
