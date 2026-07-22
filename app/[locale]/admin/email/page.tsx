import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth";
import { DEFAULT_LOCALE, buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import EmailAdminClient from "./EmailAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 메일 발송 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminEmailPage({ params }: Props) {
  const { locale } = await params;
  // 회원 관리와 동일하게 한국어(기본) 관리자 전용.
  if (locale !== DEFAULT_LOCALE) {
    redirect(buildLocalizedPath(locale as LocaleCode, "/admin/menus"));
  }
  const admin = await requireAdmin();
  if (!admin) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">메일 발송</h2>
      <EmailAdminClient />
    </div>
  );
}
