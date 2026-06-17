"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
}

export default function AdminTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (t.href !== tabs[0].href && pathname.startsWith(t.href + "/")) ||
          pathname === t.href + "/";
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
    </nav>
  );
}
