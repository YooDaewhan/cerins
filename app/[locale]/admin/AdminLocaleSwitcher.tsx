"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@/src/mocks/locales";
import {
  DEFAULT_LOCALE,
  splitLocaleFromPath,
  buildLocalizedPath,
} from "@/src/lib/i18n";
import { chrome } from "@/src/lib/adminMessages";

/**
 * 관리자 상단 언어 전환기.
 *
 * 현재 관리자 화면의 서브경로(예: /admin/menus)를 유지한 채 로케일만 바꿔
 * 이동한다. 각 로케일이 곧 "편집 언어"가 되므로, 언어를 바꾸면 그 언어를
 * 담당하는 관리자 화면으로 전환된다. 한국어(기본)만 구조를 관리한다.
 */
export default function AdminLocaleSwitcher({
  addLocaleHref,
}: {
  addLocaleHref?: string;
}) {
  const pathname = usePathname();
  const { locale: current, rest } = splitLocaleFromPath(pathname);
  const t = chrome(current);
  const enabled = locales
    .filter((l) => l.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500">{t.editLang}</span>
      <div className="flex gap-1">
        {enabled.map((l) => {
          const active = l.code === current;
          const isPrimary = l.code === DEFAULT_LOCALE;
          return (
            <Link
              key={l.code}
              href={buildLocalizedPath(l.code, rest)}
              className={
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors " +
                (active
                  ? "bg-(--brand) text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50")
              }
              title={l.native_name}
            >
              <span className="uppercase font-mono">{l.code}</span>
              <span className="hidden sm:inline">{l.native_name}</span>
              {isPrimary && (
                <span
                  className={
                    "text-[9px] rounded px-1 " +
                    (active ? "bg-white/25" : "bg-gray-100 text-gray-500")
                  }
                >
                  {t.structureBadge}
                </span>
              )}
            </Link>
          );
        })}
        {addLocaleHref && (
          <Link
            href={addLocaleHref}
            className="inline-flex items-center gap-1 rounded border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-(--brand) hover:text-(--brand)"
            title={t.addLangTitle}
          >
            <span aria-hidden>+</span>
            <span>{t.addLang}</span>
          </Link>
        )}
      </div>
      <span className="text-[11px] text-gray-400">
        {current === DEFAULT_LOCALE ? t.hintPrimary : t.hintOther}
      </span>
    </div>
  );
}
