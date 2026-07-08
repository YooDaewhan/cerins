import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageEditorClient from "./PageEditorClient";

export const metadata: Metadata = {
  title: "관리자 - 페이지 편집 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminPageDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId) || pageId <= 0) notFound();

  const isPrimary = locale === "ko";
  return <PageEditorClient locale={locale} pageId={pageId} isPrimary={isPrimary} />;
}
