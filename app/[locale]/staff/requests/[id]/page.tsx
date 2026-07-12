import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import { isStaffLevel } from "@/src/lib/userTypes";
import type { LocaleCode } from "@/src/lib/types";
import { loadRequestDetailRouted } from "@/src/lib/loadRequestDetail";
import RequestDetailView from "@/components/requests/RequestDetailView";
import CecRequestDetailView from "@/components/requests/CecRequestDetailView";
import ProductInspectionDetailView from "@/components/requests/ProductInspectionDetailView";
import ScrapIndiaDetailView from "@/components/requests/ScrapIndiaDetailView";

export const metadata: Metadata = { title: "담당 의뢰 상세 - CERINS" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function StaffRequestDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;
  const user = await getCurrentUser();
  if (!user) redirect(buildLocalizedPath(code, "/login"));
  if (!isStaffLevel(user.user_level)) redirect(buildLocalizedPath(code, "/mypage"));

  const requestId = Number(id);
  if (!Number.isFinite(requestId)) notFound();

  const routed = await loadRequestDetailRouted(user, requestId);
  // 비배정 의뢰 접근 차단(관리자는 admin 경로 사용).
  if (!routed || routed.role !== "STAFF") {
    redirect(buildLocalizedPath(code, "/staff/requests"));
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href={buildLocalizedPath(code, "/staff/requests")} className="text-sm text-gray-500 hover:text-(--brand)">
          ← 담당 의뢰 목록
        </Link>
        <div className="mt-4">
          {routed.kind === "cec"
            ? <CecRequestDetailView bundle={routed.bundle} />
            : routed.kind === "product_inspection"
            ? <ProductInspectionDetailView bundle={routed.bundle} />
            : routed.kind === "scrap_india"
            ? <ScrapIndiaDetailView bundle={routed.bundle} />
            : <RequestDetailView bundle={routed.bundle} />}
        </div>
      </div>
    </div>
  );
}
