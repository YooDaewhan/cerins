"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buildLocalizedPath, isLocale } from "@/src/lib/i18n";

interface Props {
  signupHref: string;
  redirectTo: string;
}

export default function LoginForm({ signupHref, redirectTo }: Props) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        country?: string | null;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      const target =
        data.country && isLocale(data.country)
          ? buildLocalizedPath(data.country, "/")
          : redirectTo;
      window.location.assign(target);
      return;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="login_id" className="block text-sm font-semibold text-gray-700 mb-1.5">
          아이디
        </label>
        <input
          id="login_id"
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          autoComplete="username"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-(--brand) text-white text-sm font-semibold py-3 hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "처리 중..." : "로그인"}
      </button>

      <p className="text-sm text-gray-500 text-center">
        계정이 없으신가요?{" "}
        <Link href={signupHref} className="text-(--brand) font-semibold hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
