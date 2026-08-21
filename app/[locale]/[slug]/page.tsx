import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import {
  getAlternateUrls,
  getEnabledLocales,
  getPageWithTranslation,
  listPagesByTemplateRaw,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

// 템플릿 'simple' 전용 최상위 페이지: /{slug} (예: /consulting).
// 정적 세그먼트(/about, /news …)가 우선이므로 기존 라우트와 충돌하지 않는다.
interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const [locales, pages] = await Promise.all([
    getEnabledLocales(),
    listPagesByTemplateRaw("simple"),
  ]);
  const codes = locales.map((l) => l.code);
  return pages.flatMap((p) => codes.map((locale) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation(slug, locale as LocaleCode);
  if (!page || page.page.template !== "simple") return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls(slug)).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function StandalonePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = await getPageWithTranslation(slug, code);
  if (!page || page.page.template !== "simple") notFound();

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        image={page.translation.hero_image}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="post-content text-gray-600"
          dangerouslySetInnerHTML={{ __html: page.translation.content }}
        />
      </div>
    </>
  );
}
