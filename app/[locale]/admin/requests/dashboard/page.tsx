import type { Metadata } from "next";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "관리자 - 의뢰 현황 - CERINS" };
export const dynamic = "force-dynamic";

export default async function AdminRequestsDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">의뢰 현황 대시보드</h2>
        <Link
          href={`/${locale}/admin/requests`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← 의뢰 관리 목록
        </Link>
      </div>
      <DashboardClient />
    </div>
  );
}
