"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
}

export interface TabGroup {
  label: string;
  tabs: Tab[];
}

export default function AdminTabs({
  groups,
  rootHref,
}: {
  groups: TabGroup[];
  rootHref: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    pathname === href ||
    pathname === href + "/" ||
    // rootHref(=/admin 인덱스, 회원)는 하위 경로에서 활성화되면 안 됨(정확 일치만).
    (href !== rootHref && pathname.startsWith(href + "/"));

  return (
    <nav className="mt-6 border-b border-gray-200">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        {groups.map((g, gi) => (
          <div
            key={g.label}
            className={
              "flex items-end gap-1 " +
              (gi > 0 ? "border-l border-gray-200 pl-5" : "")
            }
          >
            <span className="pb-2 pr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 select-none">
              {g.label}
            </span>
            {g.tabs.map((t) => {
              const active = isActive(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={
                    "px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 -mb-px transition-colors " +
                    (active
                      ? "border-(--brand) text-(--brand) bg-white"
                      : "border-transparent text-gray-500 hover:text-(--brand)")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
