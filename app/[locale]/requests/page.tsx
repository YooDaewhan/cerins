import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_SERVICES,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_SLUGS,
  IMPLEMENTED_SERVICE_TYPES,
  type Category,
} from "@/src/lib/serviceRequestTypes";

export const metadata: Metadata = {
  title: "서비스 의뢰 - CERINS",
  description: "인증 및 검사 서비스 온라인 의뢰",
};

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RequestsIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-(--brand) uppercase mb-2">
            Service Request
          </p>
          <h1 className="text-2xl font-bold text-(--brand)">서비스 의뢰</h1>
          <p className="text-sm text-gray-500 mt-2">
            원하시는 서비스를 선택해 온라인으로 의뢰서를 작성하세요.
          </p>
        </header>

        <div className="space-y-6">
          {(CATEGORIES as readonly Category[]).map((cat) => (
            <section key={cat} className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-(--brand) mb-4">{CATEGORY_LABELS[cat]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_SERVICES[cat].length === 0 && (
                  <div
                    className="sm:col-span-2 flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-4 cursor-not-allowed"
                    title="온라인 의뢰 준비 중"
                  >
                    <span className="text-base font-semibold text-gray-400">
                      {CATEGORY_LABELS[cat]} 서비스
                    </span>
                    <span className="text-xs font-semibold text-gray-400">준비 중</span>
                  </div>
                )}
                {CATEGORY_SERVICES[cat].map((svc) => {
                  const implemented = IMPLEMENTED_SERVICE_TYPES.includes(svc);
                  const href = buildLocalizedPath(code, `/requests/${SERVICE_TYPE_SLUGS[svc]}/new`);
                  return implemented ? (
                    <Link
                      key={svc}
                      href={href}
                      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-(--brand) hover:shadow-md transition-all"
                    >
                      <span className="text-base font-bold text-(--brand)">
                        {SERVICE_TYPE_LABELS[svc]}
                      </span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-(--brand)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <div
                      key={svc}
                      className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-4 cursor-not-allowed"
                      title="온라인 의뢰 준비 중"
                    >
                      <span className="text-base font-semibold text-gray-400">
                        {SERVICE_TYPE_LABELS[svc]}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">준비 중</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6">
          현재 인증 · 검사 서비스의 온라인 의뢰가 제공됩니다. 컨설팅 · 물류를 포함한 그 외 서비스는 순차적으로 오픈됩니다.
        </p>
      </div>
    </div>
  );
}
