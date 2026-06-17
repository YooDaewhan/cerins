import type { Metadata } from "next";
import PostEditorClient from "@/components/admin/PostEditorClient";

export const metadata: Metadata = {
  title: "관리자 - 새 뉴스 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminPostsNewPage({ params }: Props) {
  const { locale } = await params;
  return <PostEditorClient locale={locale} mode="new" />;
}
