import type { Metadata } from "next";
import HeroSlidesAdminClient from "./HeroSlidesAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 히어로 슬라이드 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminHeroSlidesPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">히어로 슬라이드 관리</h2>
      <HeroSlidesAdminClient locale={locale} />
    </div>
  );
}
