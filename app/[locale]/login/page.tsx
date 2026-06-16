import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "로그인 - CERINS",
};

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-(--brand)">로그인</h1>
          <p className="text-sm text-gray-500 mt-1">CERINS 계정으로 로그인하세요.</p>
        </div>
        <LoginForm
          signupHref={buildLocalizedPath(code, "/signup")}
          redirectTo={buildLocalizedPath(code, "/")}
        />
      </div>
    </div>
  );
}
