"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "@/src/lib/userTypes";
import type { Locale } from "@/src/lib/types";

interface Props {
  loginHref: string;
  redirectTo: string;
  countries: Locale[];
}

export default function SignupForm({ loginHref, redirectTo, countries }: Props) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [country, setCountry] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailNoticeIsError, setEmailNoticeIsError] = useState(false);

  const emailVerified = verifiedEmail !== null && verifiedEmail === email;

  function onEmailChange(v: string) {
    setEmail(v);
    setCodeSent(false);
    setVerificationCode("");
    setEmailNotice(null);
  }

  async function onSendCode() {
    setEmailNotice(null);
    setEmailNoticeIsError(false);
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEmailNoticeIsError(true);
        setEmailNotice(data.error ?? "인증번호 발송에 실패했습니다.");
        return;
      }
      setCodeSent(true);
      setVerificationCode("");
      setEmailNotice("인증번호를 발송했습니다. 5분 이내에 입력해 주세요.");
    } catch {
      setEmailNoticeIsError(true);
      setEmailNotice("네트워크 오류가 발생했습니다.");
    } finally {
      setSendingCode(false);
    }
  }

  async function onVerifyCode() {
    setEmailNotice(null);
    setEmailNoticeIsError(false);
    setVerifyingCode(true);
    try {
      const res = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEmailNoticeIsError(true);
        setEmailNotice(data.error ?? "인증번호가 일치하지 않습니다.");
        return;
      }
      setVerifiedEmail(email);
      setEmailNotice("이메일 인증이 완료되었습니다.");
    } catch {
      setEmailNoticeIsError(true);
      setEmailNotice("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!emailVerified) {
      setError("이메일 인증을 먼저 완료해 주세요.");
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
          company,
          job_title: jobTitle,
          country,
          email_consent: emailConsent,
          account_type: accountType,
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
      <div>
        <span className="block text-sm font-semibold text-gray-700 mb-1.5">
          회원 구분
        </span>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((t) => {
            const checked = accountType === t;
            return (
              <label
                key={t}
                className={
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm cursor-pointer select-none " +
                  (checked
                    ? "border-(--brand) bg-(--brand)/5 text-(--brand) font-semibold"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50")
                }
              >
                <input
                  type="radio"
                  name="account_type"
                  value={t}
                  checked={checked}
                  onChange={() => setAccountType(t)}
                  className="sr-only"
                />
                {ACCOUNT_TYPE_LABELS[t]}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-1.5">
          국가
        </label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          autoComplete="country"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent"
        >
          <option value="">국가를 선택하세요</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.native_name}
            </option>
          ))}
        </select>
      </div>

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
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
          이메일
        </label>
        <div className="flex gap-2">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={emailVerified}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="button"
            onClick={onSendCode}
            disabled={!email || emailVerified || sendingCode}
            className="shrink-0 rounded-md border border-(--brand) text-(--brand) text-sm font-semibold px-3 py-2.5 hover:bg-(--brand)/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {emailVerified ? "인증완료" : sendingCode ? "발송 중..." : codeSent ? "재발송" : "인증번호 발송"}
          </button>
        </div>

        {codeSent && !emailVerified && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              inputMode="numeric"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="인증번호 6자리"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent"
            />
            <button
              type="button"
              onClick={onVerifyCode}
              disabled={verificationCode.length !== 6 || verifyingCode}
              className="shrink-0 rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyingCode ? "확인 중..." : "확인"}
            </button>
          </div>
        )}

        {emailNotice && (
          <p className={"text-sm mt-1.5 " + (emailNoticeIsError ? "text-red-600" : "text-green-600")}>
            {emailNotice}
          </p>
        )}
      </div>
      <Field
        id="company"
        label="회사명"
        type="text"
        value={company}
        onChange={setCompany}
        autoComplete="organization"
        required
      />
      <Field
        id="job_title"
        label="직위"
        type="text"
        value={jobTitle}
        onChange={setJobTitle}
        autoComplete="organization-title"
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
        disabled={submitting || !emailVerified}
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
