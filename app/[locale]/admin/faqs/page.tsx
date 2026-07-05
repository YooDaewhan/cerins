import type { Metadata } from "next";
import PostsAdminClient from "../posts/PostsAdminClient";

export const metadata: Metadata = {
  title: "관리자 - FAQ - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminFaqsPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">FAQ 관리</h2>
      <PostsAdminClient
        locale={locale}
        apiBase="/api/admin/faqs"
        listSlug="faqs"
      />
    </div>
  );
}
