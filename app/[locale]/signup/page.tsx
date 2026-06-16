import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "회원가입 - CERINS",
};

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-(--brand)">회원가입</h1>
          <p className="text-sm text-gray-500 mt-1">CERINS 계정을 만드세요.</p>
        </div>
        <SignupForm
          loginHref={buildLocalizedPath(code, "/login")}
          redirectTo={buildLocalizedPath(code, "/")}
        />
      </div>
    </div>
  );
}
