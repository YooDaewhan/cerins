import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import {
  ACCOUNT_TYPE_LABELS,
  isAdminLevel,
  isStaffLevel,
  userLevelLabel,
} from "@/src/lib/userTypes";
import type { LocaleCode } from "@/src/lib/types";
import MyPageActions from "./MyPageActions";

export const metadata: Metadata = {
  title: "마이페이지 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const user = await getCurrentUser();
  if (!user) {
    redirect(buildLocalizedPath(code, "/login"));
  }

  const isAdmin = isAdminLevel(user.user_level);
  const isStaff = isStaffLevel(user.user_level) && !isAdmin;

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-12 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-(--brand)">마이페이지</h1>
          <p className="text-sm text-gray-500 mt-1">내 계정 정보를 확인하세요.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
            <span
              className={
                "inline-flex items-center justify-center w-14 h-14 rounded-full text-white text-xl font-bold " +
                (isAdmin ? "bg-(--brand)" : "bg-gray-500")
              }
            >
              {user.login_id.charAt(0).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-800">{user.login_id}</div>
              <div className="text-sm text-gray-500 truncate">{user.email}</div>
            </div>
            <span
              className={
                "rounded-full text-xs font-semibold px-3 py-1 " +
                (isAdmin
                  ? "bg-(--brand) text-white"
                  : "bg-gray-100 text-gray-600")
              }
            >
              {userLevelLabel(user.user_level)}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-5 text-sm">
            <Row label="회원 구분" value={ACCOUNT_TYPE_LABELS[user.account_type]} />
            <Row
              label="권한 레벨"
              value={`${userLevelLabel(user.user_level)} (${user.user_level})`}
            />
            <Row
              label="이메일 수신 동의"
              value={user.email_consent ? "동의" : "미동의"}
            />
            <Row label="가입일" value={user.created_at} />
          </dl>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <Link
              href={buildLocalizedPath(code, "/mypage/requests")}
              className="rounded-md border border-(--brand) text-(--brand) text-sm font-semibold px-4 py-2 hover:bg-(--brand)/5"
            >
              내 의뢰
            </Link>
            {isStaff && (
              <Link
                href={buildLocalizedPath(code, "/staff/requests")}
                className="rounded-md border border-gray-300 text-sm font-semibold px-4 py-2 hover:bg-gray-50"
              >
                담당 의뢰
              </Link>
            )}
            {isAdmin && (
              <Link
                href={buildLocalizedPath(code, "/admin")}
                className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
              >
                관리자 페이지
              </Link>
            )}
            <Link
              href={buildLocalizedPath(code, "/")}
              className="rounded-md border border-gray-300 text-sm font-semibold px-4 py-2 hover:bg-gray-50"
            >
              홈으로
            </Link>
            <div className="ml-auto">
              <MyPageActions redirectTo={buildLocalizedPath(code, "/")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-800">{value}</dd>
    </div>
  );
}
