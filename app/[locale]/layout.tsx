import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import NewsPopup from "@/components/NewsPopup";
import {
  getEnabledLocales,
  getMenus,
  getPopupPosts,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import { isAdminLevel } from "@/src/lib/userTypes";
import type { LocaleCode } from "@/src/lib/types";

export async function generateStaticParams() {
  return (await getEnabledLocales()).map((l) => ({ locale: l.code }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const code = locale as LocaleCode;
  const [menus, enabledLocales, currentUser, popupPosts] = await Promise.all([
    getMenus(code),
    getEnabledLocales(),
    getCurrentUser(),
    getPopupPosts("news", code),
  ]);

  const headerUser = currentUser
    ? {
        login_id: currentUser.login_id,
        user_level: currentUser.user_level,
        is_admin: isAdminLevel(currentUser.user_level),
      }
    : null;

  return (
    <ThemeProvider>
      <Header
        menus={menus}
        locale={code}
        enabledLocales={enabledLocales}
        currentUser={headerUser}
      />
      <main className="flex-1 pt-20">{children}</main>
      <NewsPopup posts={popupPosts} locale={code} />
      <Footer
        menus={menus}
        locale={code}
        currentUser={
          currentUser
            ? {
                login_id: currentUser.login_id,
                email: currentUser.email,
                user_level: currentUser.user_level,
                company: currentUser.company,
                job_title: currentUser.job_title,
              }
            : null
        }
      />
    </ThemeProvider>
  );
}
