import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSlider from "@/components/HeroSlider";
import ServiceBento from "@/components/ServiceBento";
import ServiceProcess from "@/components/ServiceProcess";
import ServiceGlobe from "@/components/ServiceGlobe";
import ServiceFlatMap from "@/components/ServiceFlatMap";
import ServiceValues from "@/components/ServiceValues";
import ServiceStats from "@/components/ServiceStats";
import PartnerSlider from "@/components/PartnerSlider";
import NewsRoom from "@/components/NewsRoom";
import {
  getAlternateUrls,
  getHomeSlides,
  getPageWithTranslation,
  getPosts,
  listPartners,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const home = await getPageWithTranslation("home", locale as LocaleCode);
  if (!home) return {};
  return {
    title: home.translation.meta_title,
    description: home.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls("home")).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const [slides, partners, posts] = await Promise.all([
    getHomeSlides(code),
    listPartners(),
    getPosts("news", code),
  ]);

  const snapFull =
    "snap-start snap-always h-[calc(100dvh-4rem)] flex flex-col justify-center overflow-hidden";

  return (
    <>
      <div className={snapFull}>
        <HeroSlider slides={slides} locale={code} />
      </div>
      <div className={snapFull}>
        <ServiceBento />
      </div>
      <div className={snapFull}>
        <ServiceProcess />
      </div>
      <div className={snapFull}>
        <ServiceGlobe />
      </div>
      <div className={snapFull}>
        <ServiceFlatMap />
      </div>
      <div className={snapFull}>
        <ServiceValues />
      </div>
      <div className={snapFull}>
        <ServiceStats />
      </div>
      <div className={snapFull}>
        <PartnerSlider partners={partners} />
      </div>
      <div className={snapFull}>
        <NewsRoom posts={posts} locale={code} />
      </div>
    </>
  );
}
