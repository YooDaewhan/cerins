"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  redirectTo: string;
}

export default function MyPageActions({ redirectTo }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loggingOut}
      className="rounded-md border border-red-300 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50 disabled:opacity-60"
    >
      {loggingOut ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
