import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import {
  getEnabledLocales,
  getMenus,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

export function generateStaticParams() {
  return getEnabledLocales().map((l) => ({ locale: l.code }));
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
  const menus = getMenus(code);
  const enabledLocales = getEnabledLocales();

  return (
    <ThemeProvider>
      <Header menus={menus} locale={code} enabledLocales={enabledLocales} />
      <main className="flex-1 pt-16">{children}</main>
      <Footer menus={menus} locale={code} />
    </ThemeProvider>
  );
}
