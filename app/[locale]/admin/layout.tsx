import { notFound, redirect } from "next/navigation";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { requireAdmin } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";
import AdminTabs from "./AdminTabs";

export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const admin = await requireAdmin();
  if (!admin) redirect(buildLocalizedPath(code, "/login"));

  const base = buildLocalizedPath(code, "/admin");
  const tabs = [
    { href: base, label: "회원" },
    { href: `${base}/menus`, label: "메뉴" },
    { href: `${base}/pages`, label: "페이지" },
    { href: `${base}/posts`, label: "뉴스" },
    { href: `${base}/hero-slides`, label: "히어로 슬라이드" },
    { href: `${base}/partners`, label: "파트너" },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-2">
        <h1 className="text-2xl font-bold text-(--brand)">CERINS 관리자</h1>
        <p className="text-sm text-gray-500 mt-1">
          로그인 중: <span className="font-semibold">{admin.login_id}</span>
        </p>
        <AdminTabs tabs={tabs} />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
