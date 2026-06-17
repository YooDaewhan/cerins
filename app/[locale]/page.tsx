import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSlider from "@/components/HeroSlider";
import ServiceSection, { type ServiceCard } from "@/components/ServiceSection";
import PartnerSlider from "@/components/PartnerSlider";
import NewsRoom from "@/components/NewsRoom";
import {
  buildLocalizedPath,
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

  const services: ServiceCard[] = [
    {
      id: "certification",
      title: "Certification",
      description:
        "EAC, GOST-R, CE marking, and market-specific certifications across Russia, CIS, Europe, and Asia.",
      href: buildLocalizedPath(code, "/certification/russia"),
      icon: "certificate",
    },
    {
      id: "inspection",
      title: "Inspection",
      description:
        "Pre-shipment inspection, NDT, general QC, and India VOC services by certified inspectors worldwide.",
      href: buildLocalizedPath(code, "/inspection/pre-shipment-inspection"),
      icon: "search",
    },
    {
      id: "documentation",
      title: "Documentation",
      description:
        "Preparation and verification of all required commercial, shipping, and regulatory trade documents.",
      href: buildLocalizedPath(code, "/services/documentation"),
      icon: "document",
    },
    {
      id: "project-management",
      title: "Project Management & Custom Brokerage",
      description:
        "End-to-end trade execution combining project coordination with licensed customs clearance services.",
      href: buildLocalizedPath(code, "/services/project-management-custom-brokerage"),
      icon: "briefcase",
    },
  ];

  return (
    <>
      <HeroSlider slides={slides} locale={code} />
      <ServiceSection
        services={services}
        heading="CERINS Service"
        description="CERINS provides professional certification, inspection, documentation, project management and customs brokerage services for companies entering global markets."
      />
      <PartnerSlider partners={partners} />
      <NewsRoom posts={posts} locale={code} />
    </>
  );
}
