import type { Metadata } from "next";
import PagesAdminClient from "./PagesAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 페이지 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminPagesPage({ params }: Props) {
  const { locale } = await params;
  const isPrimary = locale === "ko";
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">페이지 관리</h2>
      <PagesAdminClient locale={locale} isPrimary={isPrimary} />
    </div>
  );
}
