import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import { isStaffLevel } from "@/src/lib/userTypes";
import type { LocaleCode } from "@/src/lib/types";
import { listStaffRequests } from "@/src/lib/serviceRequestRepo";
import {
  SERVICE_TYPE_LABELS,
  statusLabel,
  type ServiceType,
} from "@/src/lib/serviceRequestTypes";

export const metadata: Metadata = { title: "담당 의뢰 - CERINS" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function StaffRequestsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;
  const user = await getCurrentUser();
  if (!user) redirect(buildLocalizedPath(code, "/login"));
  if (!isStaffLevel(user.user_level)) redirect(buildLocalizedPath(code, "/mypage"));

  const requests = await listStaffRequests(user.id);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-(--brand) mb-6">담당 의뢰</h1>
        {requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            배정된 의뢰가 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={buildLocalizedPath(code, `/staff/requests/${r.id}`)}
                  className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-(--brand) hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-gray-400">{r.request_number ?? "-"}</span>
                    <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-2.5 py-0.5">
                      {statusLabel(r.status)} (step {r.workflow_step})
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-800 mt-1">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {SERVICE_TYPE_LABELS[r.service_type as ServiceType]} · {r.company_name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
