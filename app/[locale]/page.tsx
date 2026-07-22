import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSlider from "@/components/HeroSlider";
import ServiceBento from "@/components/ServiceBento";
import ServiceProcess, { type Step } from "@/components/ServiceProcess";
import ServiceFlatMap from "@/components/ServiceFlatMap";
import ServiceValues from "@/components/ServiceValues";
import PartnerSlider from "@/components/PartnerSlider";
import NewsRoom from "@/components/NewsRoom";
import {
  getAlternateUrls,
  getHeroVideo,
  getHomeSlides,
  getPageWithTranslation,
  getPosts,
  listCertificationCountries,
  listHeroTags,
  listPartners,
} from "@/src/lib/mockRepository";
import { htmlToPlainText } from "@/src/lib/pageContent";
import { mapCountriesForSlug } from "@/components/worldGeo";
import { isLocale } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
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

  const [slides, partners, posts, certCountries, heroTags, heroVideo, currentUser] =
    await Promise.all([
      getHomeSlides(code),
      listPartners(),
      getPosts("news", code),
      listCertificationCountries(code),
      listHeroTags(code, 20),
      getHeroVideo(),
      getCurrentUser(),
    ]);

  const fixedCertSlugs = [
    "russia-trcu",
    "russia-gost-r",
    "russia-metrology",
    "russia-trcu-ex",
    "russia-fire-safety",
  ];
  const fixedCerts = await Promise.all(
    fixedCertSlugs.map(async (slug) => {
      const p = await getPageWithTranslation(slug, code);
      return { slug, title: p?.translation.title ?? slug };
    }),
  );

  const feedbackUser = currentUser
    ? {
        login_id: currentUser.login_id,
        email: currentUser.email,
        user_level: currentUser.user_level,
        company: currentUser.company,
        job_title: currentUser.job_title,
      }
    : null;

  const certSteps: Step[] | undefined = certCountries.length
    ? certCountries.map((c, i) => {
        const text = htmlToPlainText(c.content);
        return {
          n: String(i + 1).padStart(2, "0"),
          tag: c.subtitle ?? c.title,
          title: c.title,
          overview: c.subtitle ?? text.slice(0, 120),
          desc: text.slice(0, 240) || c.subtitle || "",
          certifications: c.certifications,
          mapCountries: mapCountriesForSlug(c.slug),
          slug: c.slug,
        };
      })
    : undefined;

  const snapFull =
    "snap-start snap-always h-[calc(100dvh-4rem)] flex flex-col justify-center overflow-hidden";

  return (
    <>
      <div className={snapFull}>
        <HeroSlider slides={slides} locale={code} tags={heroTags} fixedCerts={fixedCerts} feedbackUser={feedbackUser} heroVideo={heroVideo} />
      </div>
      <div className={snapFull}>
        <ServiceBento />
      </div>
      <div className={snapFull}>
        <ServiceProcess steps={certSteps} />
      </div>
      <div className={snapFull}>
        <ServiceFlatMap steps={certSteps} />
      </div>
      <div className={snapFull}>
        <ServiceValues />
      </div>
      <PartnerSlider partners={partners} />
      <div className={snapFull}>
        <NewsRoom posts={posts} locale={code} />
      </div>
    </>
  );
}
