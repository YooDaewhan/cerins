import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth";
import { DEFAULT_LOCALE, buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = {
  title: "관리자 - 회원 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  // 회원 관리는 한국어(기본) 관리자 전용. 다른 언어 관리자는 메뉴로 보냄.
  if (locale !== DEFAULT_LOCALE) {
    redirect(buildLocalizedPath(locale as LocaleCode, "/admin/menus"));
  }

  // Layout already enforces admin auth; we just need the current user id here.
  const admin = await requireAdmin();
  if (!admin) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">회원 관리</h2>
      <AdminUsersClient currentUserId={admin.id} />
    </div>
  );
}
