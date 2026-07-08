import type { Metadata } from "next";
import PostsAdminClient from "./PostsAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 뉴스 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminPostsPage({ params }: Props) {
  const { locale } = await params;
  const isPrimary = locale === "ko";
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">뉴스 관리</h2>
      <PostsAdminClient locale={locale} isPrimary={isPrimary} />
    </div>
  );
}
