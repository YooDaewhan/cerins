"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  loginHref: string;
  redirectTo: string;
}

export default function SignupForm({ loginHref, redirectTo }: Props) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginId,
          password,
          email,
          email_consent: emailConsent,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field
        id="login_id"
        label="아이디"
        type="text"
        value={loginId}
        onChange={setLoginId}
        placeholder="영문/숫자/_ 4-32자"
        autoComplete="username"
        required
      />
      <Field
        id="password"
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="8-128자"
        autoComplete="new-password"
        required
      />
      <Field
        id="password_confirm"
        label="비밀번호 확인"
        type="password"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        autoComplete="new-password"
        required
      />
      <Field
        id="email"
        label="이메일"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        required
      />

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-(--brand)"
          checked={emailConsent}
          onChange={(e) => setEmailConsent(e.target.checked)}
        />
        <span className="text-sm text-gray-700">
          이메일 수신에 동의합니다.{" "}
          <span className="text-gray-400">(선택)</span>
        </span>
      </label>

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
        {submitting ? "처리 중..." : "회원가입"}
      </button>

      <p className="text-sm text-gray-500 text-center">
        이미 계정이 있으신가요?{" "}
        <Link href={loginHref} className="text-(--brand) font-semibold hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

function Field({ id, label, type, value, onChange, placeholder, autoComplete, required }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent"
      />
    </div>
  );
}
