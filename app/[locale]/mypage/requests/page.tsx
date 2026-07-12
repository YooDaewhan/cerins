import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";
import { listCustomerRequests, listCustomerFinalCertificates } from "@/src/lib/serviceRequestRepo";
import {
  SERVICE_TYPE_LABELS,
  customerStatusLabel,
  type ServiceType,
} from "@/src/lib/serviceRequestTypes";

export const metadata: Metadata = { title: "내 의뢰 - CERINS" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MyRequestsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;
  const user = await getCurrentUser();
  if (!user) redirect(buildLocalizedPath(code, "/login"));

  const [requests, finalCerts] = await Promise.all([
    listCustomerRequests(user.id),
    listCustomerFinalCertificates(user.id),
  ]);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-(--brand)">내 의뢰</h1>
          <Link href={buildLocalizedPath(code, "/requests")} className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 hover:opacity-90">
            + 새 의뢰
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            아직 등록한 의뢰가 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const cert = finalCerts.get(r.id);
              return (
              <li
                key={r.id}
                className={`bg-white border rounded-lg overflow-hidden transition-all hover:shadow-md ${
                  cert ? "border-green-300 hover:border-green-500" : "border-gray-200 hover:border-(--brand)"
                }`}
              >
                <Link
                  href={buildLocalizedPath(code, `/mypage/requests/${r.id}`)}
                  className="block p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-gray-400">{r.request_number ?? "접수번호 미발급"}</span>
                    <span
                      className={`rounded-full text-xs font-semibold px-2.5 py-0.5 ${
                        cert ? "bg-green-100 text-green-700" : "bg-(--brand)/10 text-(--brand)"
                      }`}
                    >
                      {cert ? "✓ 완료" : customerStatusLabel(r.status)}
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-800 mt-1">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {SERVICE_TYPE_LABELS[r.service_type as ServiceType]} · 신청 {r.submitted_at ?? r.created_at}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    담당자{" "}
                    {r.assignee ? (
                      <span className="font-semibold text-gray-700">
                        {r.assignee.login_id}
                        {r.assignee.job_title ? ` · ${r.assignee.job_title}` : ""}
                      </span>
                    ) : (
                      <span className="text-gray-400">미지정</span>
                    )}
                  </p>
                </Link>
                {cert && (
                  <div className="flex items-center justify-between gap-3 border-t border-green-200 bg-green-50 px-5 py-3">
                    <span className="text-xs font-semibold text-green-700">최종 인증서가 발급되었습니다.</span>
                    <a
                      href={`/api/files/${cert.file_id}`}
                      className="flex-shrink-0 rounded-md bg-green-600 text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90"
                    >
                      최종 인증서 다운로드
                    </a>
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
