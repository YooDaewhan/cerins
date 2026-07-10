import type { Metadata } from "next";
import PostEditorClient from "@/components/admin/PostEditorClient";

export const metadata: Metadata = {
  title: "관리자 - 새 FAQ - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminFaqsNewPage({ params }: Props) {
  const { locale } = await params;
  const isPrimary = locale === "ko";
  return (
    <PostEditorClient
      locale={locale}
      isPrimary={isPrimary}
      mode="new"
      apiBase="/api/admin/faqs"
      listSlug="faqs"
      noun="FAQ"
    />
  );
}
