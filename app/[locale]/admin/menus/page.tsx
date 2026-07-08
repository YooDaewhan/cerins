import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import MenusAdminClient from "./MenusAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 메뉴 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminMenusPage({ params }: Props) {
  const { locale } = await params;
  const code = locale as LocaleCode;
  const isPrimary = code === DEFAULT_LOCALE;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">메뉴 관리</h2>
      <MenusAdminClient locale={code} isPrimary={isPrimary} />
    </div>
  );
}
