import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostEditorClient, {
  type PostEditorInitial,
} from "@/components/admin/PostEditorClient";
import { getAdminPostGroup } from "@/src/lib/posts";

export const metadata: Metadata = {
  title: "관리자 - FAQ 편집 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function AdminFaqEditPage({ params }: Props) {
  const { locale, slug } = await params;
  const group = await getAdminPostGroup("faq", slug);
  if (!group) notFound();

  const initial: PostEditorInitial = {
    slug: group.slug,
    translations: {},
  };
  for (const [code, t] of Object.entries(group.translations)) {
    if (!t) continue;
    initial.translations[code] = {
      title: t.title,
      summary: t.summary,
      content: t.content,
      author: t.author,
      thumbnail: t.thumbnail,
      is_published: t.is_published,
      published_at: t.published_at,
    };
  }

  return (
    <PostEditorClient
      locale={locale}
      mode="edit"
      initial={initial}
      apiBase="/api/admin/faqs"
      listSlug="faqs"
      noun="FAQ"
    />
  );
}
