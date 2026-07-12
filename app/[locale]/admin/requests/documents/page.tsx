import type { Metadata } from "next";
import Link from "next/link";
import { buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import DocumentRequirementsClient from "./DocumentRequirementsClient";

export const metadata: Metadata = { title: "관리자 - 제출서류 항목 관리 - CERINS" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

// 스크랩 India(및 향후 다른 서비스)의 고객 제출서류 항목을 동적으로 관리한다.
export default async function AdminDocumentRequirementsPage({ params }: Props) {
  const { locale } = await params;
  const code = locale as LocaleCode;
  return (
    <div>
      <Link
        href={buildLocalizedPath(code, "/admin/requests")}
        className="text-sm text-gray-500 hover:text-(--brand)"
      >
        ← 의뢰 관리
      </Link>
      <h2 className="text-lg font-semibold text-gray-800 mt-3 mb-1">제출서류 항목 관리</h2>
      <p className="text-sm text-gray-500 mb-4">
        고객이 제출해야 하는 서류 항목을 등록·수정합니다. 고객 화면은 활성 항목을 동적으로 표시합니다.
      </p>
      <DocumentRequirementsClient serviceType="SCRAP_INDIA" workflowStep={5} />
    </div>
  );
}
