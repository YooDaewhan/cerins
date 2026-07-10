"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildLocalizedPath } from "@/src/lib/i18n";
import { userLevelLabel } from "@/src/lib/userTypes";
import type { LocaleCode } from "@/src/lib/types";

export interface HeaderUser {
  login_id: string;
  user_level: number;
  is_admin: boolean;
}

interface Props {
  user: HeaderUser | null;
  locale: LocaleCode;
  variant?: "desktop" | "mobile";
}

export default function UserMenu({ user, locale, variant = "desktop" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loginHref = buildLocalizedPath(locale, "/login");
  const signupHref = buildLocalizedPath(locale, "/signup");
  const myPageHref = buildLocalizedPath(locale, "/mypage");
  const adminHref = buildLocalizedPath(locale, "/admin");
  const primaryHref = user?.is_admin ? adminHref : myPageHref;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    if (variant === "mobile") {
      return (
        <Link
          href={loginHref}
          className="block w-full text-center rounded-full bg-(--brand) text-white text-sm font-bold px-4 py-2 hover:opacity-90"
        >
          로그인
        </Link>
      );
    }
    return (
      <Link
        href={loginHref}
        className="flex items-center justify-center gap-1.5 min-w-30 px-4 py-1.5 text-xs font-bold text-white bg-(--brand) rounded-full hover:opacity-90 transition-opacity"
      >
        로그인
      </Link>
    );
  }

  const initial = user.login_id.charAt(0).toUpperCase();
  const levelText = userLevelLabel(user.user_level);

  if (variant === "mobile") {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center gap-3 px-1">
          <Avatar initial={initial} admin={user.is_admin} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {user.login_id}
            </div>
            <div className="text-[11px] text-gray-500">{levelText}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={primaryHref}
            className="text-center rounded-md border border-gray-300 text-sm font-semibold py-2 hover:bg-gray-50"
          >
            {user.is_admin ? "관리자" : "마이페이지"}
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={logout}
            className="rounded-md bg-(--brand) text-white text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-60"
          >
            {loggingOut ? "..." : "로그아웃"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Avatar initial={initial} admin={user.is_admin} />
        <span className="hidden xl:inline text-sm font-semibold text-gray-700 max-w-[8rem] truncate">
          {user.login_id}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-xl py-1"
          style={{ zIndex: 200 }}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {user.login_id}
            </div>
            <div className="mt-0.5 text-[11px]">
              <span
                className={
                  user.is_admin
                    ? "inline-block rounded-full bg-(--brand) text-white px-2 py-0.5 font-semibold"
                    : "inline-block rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 font-semibold"
                }
              >
                {levelText}
              </span>
            </div>
          </div>

          <Link
            href={myPageHref}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            마이페이지
          </Link>
          {user.is_admin && (
            <Link
              href={adminHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-(--brand) font-semibold hover:bg-gray-50"
            >
              관리자 페이지
            </Link>
          )}
          {!user.is_admin && (
            <Link
              href={signupHref}
              onClick={() => setOpen(false)}
              className="hidden"
              aria-hidden
            />
          )}
          <button
            type="button"
            disabled={loggingOut}
            onClick={logout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-60"
          >
            {loggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ initial, admin }: { initial: string; admin: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold " +
        (admin ? "bg-(--brand)" : "bg-gray-500")
      }
    >
      {initial}
    </span>
  );
}
