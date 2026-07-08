"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LocaleCode } from "@/src/lib/types";

interface AdminPostTranslation {
  id: number;
  locale: LocaleCode;
  title: string;
  summary: string;
  content: string;
  thumbnail: string | null;
  author: string | null;
  is_published: boolean;
  published_at: string;
}

interface AdminPostGroup {
  slug: string;
  translations: Partial<Record<LocaleCode, AdminPostTranslation>>;
}

interface ApiData {
  posts: AdminPostGroup[];
  locales: LocaleCode[];
}

export default function PostsAdminClient({
  locale,
  isPrimary,
  apiBase = "/api/admin/posts",
  listSlug = "posts",
}: {
  locale: string;
  isPrimary: boolean;
  apiBase?: string;
  listSlug?: string;
}) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase, { cache: "no-store" });
      const json = (await res.json()) as ApiData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "글을 불러오지 못했습니다.");
        return;
      }
      setData(json);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deletePost(slug: string) {
    if (!isPrimary) return;
    if (!confirm(`'${slug}' 글을 모든 언어판과 함께 삭제합니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (!data) {
    return (
      <p className="text-sm text-red-600">
        {error ?? "글을 불러올 수 없습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!isPrimary && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-gray-700">
          <p className="font-semibold mb-1">
            {locale.toUpperCase()} 언어판 편집
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600">
            <li>글 생성·삭제·slug는 한국어 관리자가 관리합니다.</li>
            <li>여기서는 각 글의 <b>{locale.toUpperCase()}</b> 언어판만 입력·수정합니다.</li>
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          총 <span className="font-semibold text-(--brand)">{data.posts.length}</span>개 글
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-(--brand) hover:underline"
          >
            새로고침
          </button>
          {isPrimary && (
            <Link
              href={`${adminBase}/${listSlug}/new`}
              className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              + 새 글
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left font-semibold px-4 py-2">Slug</th>
              <th className="text-left font-semibold px-4 py-2">제목 (대표)</th>
              <th className="text-left font-semibold px-4 py-2">발행일</th>
              <th className="text-left font-semibold px-4 py-2">공개</th>
              <th className="text-right font-semibold px-4 py-2 pr-5">작업</th>
            </tr>
          </thead>
          <tbody>
            {data.posts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  글이 없습니다.
                </td>
              </tr>
            )}
            {data.posts.map((p) => {
              const primary =
                p.translations.ko ??
                p.translations.en ??
                Object.values(p.translations)[0];
              const localesAvailable = Object.keys(
                p.translations,
              ) as LocaleCode[];
              const allPublished = localesAvailable.every(
                (l) => p.translations[l]?.is_published,
              );
              return (
                <tr key={p.slug} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 font-mono text-gray-800">{p.slug}</td>
                  <td className="px-4 py-2 text-gray-800">
                    <div className="line-clamp-1 font-medium">
                      {primary?.title ?? "(제목 없음)"}
                    </div>
                    <div className="text-[11px] text-gray-400 line-clamp-1">
                      {primary?.summary}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {primary?.published_at}
                  </td>
                  <td className="px-4 py-2">
                    {allPublished ? (
                      <span className="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        공개
                      </span>
                    ) : (
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        일부 비공개
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right pr-5 whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Link
                        href={`${adminBase}/${listSlug}/${encodeURIComponent(p.slug)}`}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                      >
                        {isPrimary ? "편집" : "수정"}
                      </Link>
                      {isPrimary && (
                        <button
                          type="button"
                          onClick={() => deletePost(p.slug)}
                          disabled={busy}
                          className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50 disabled:opacity-60"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
