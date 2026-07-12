import { notFound, redirect } from "next/navigation";
import { isLocale, buildLocalizedPath, DEFAULT_LOCALE } from "@/src/lib/i18n";
import { requireAdmin } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";
import AdminTabs, { type TabGroup } from "./AdminTabs";
import AdminLocaleSwitcher from "./AdminLocaleSwitcher";

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

  const isPrimary = code === DEFAULT_LOCALE;
  const base = buildLocalizedPath(code, "/admin");

  // 사이트에 노출되는 콘텐츠(언어별 번역이 있는) 탭 — 모든 언어 관리자에게 노출.
  const contentTabs = [
    { href: `${base}/menus`, label: "메뉴" },
    { href: `${base}/pages`, label: "페이지" },
    { href: `${base}/posts`, label: "뉴스" },
    { href: `${base}/faqs`, label: "FAQ" },
    { href: `${base}/hero-slides`, label: "히어로 슬라이드" },
  ];
  // 파트너는 전역(언어 무관) 데이터라 한국어(기본) 관리자 전용이지만,
  // 성격상 사이트 콘텐츠 그룹에 함께 묶어 노출한다.
  const partnersTab = { href: `${base}/partners`, label: "파트너" };

  // 도메인 기준 3그룹: 콘텐츠 / 업무 / 설정.
  // 콘텐츠 그룹만 모든 언어 관리자에게, 업무·설정은 한국어(기본) 관리자 전용.
  const contentGroup: TabGroup = {
    label: "콘텐츠",
    tabs: isPrimary ? [...contentTabs, partnersTab] : contentTabs,
  };
  const opsGroup: TabGroup = {
    label: "업무",
    tabs: [
      { href: `${base}/requests`, label: "의뢰 관리" },
      { href: base, label: "회원" },
      { href: `${base}/inquiries`, label: "문의" },
      { href: `${base}/satisfaction`, label: "고객만족도" },
      { href: `${base}/staff-evaluations`, label: "직원평가" },
    ],
  };
  const groups: TabGroup[] = isPrimary
    ? [contentGroup, opsGroup]
    : [contentGroup];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-(--brand)">CERINS 관리자</h1>
          <span className="rounded bg-(--brand)/10 px-2 py-0.5 text-xs font-semibold text-(--brand) uppercase font-mono">
            {code}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          로그인 중: <span className="font-semibold">{admin.login_id}</span>
        </p>
        <AdminLocaleSwitcher addLocaleHref={isPrimary ? `${base}/locales` : undefined} />
        <AdminTabs groups={groups} rootHref={base} />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
