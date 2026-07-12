import type { Metadata } from "next";
import Link from "next/link";
import { buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import RequestsAdminClient from "./RequestsAdminClient";

export const metadata: Metadata = { title: "관리자 - 의뢰 관리 - CERINS" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminRequestsPage({ params }: Props) {
  const { locale } = await params;
  const code = locale as LocaleCode;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">의뢰 프로세스 관리</h2>
        <Link
          href={buildLocalizedPath(code, "/admin/requests/documents")}
          className="text-sm font-semibold text-(--brand) underline"
        >
          제출서류 항목 관리
        </Link>
      </div>
      <RequestsAdminClient />
    </div>
  );
}
