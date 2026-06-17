"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Template =
  | "home"
  | "about"
  | "certification"
  | "inspection"
  | "services"
  | "news_list"
  | "contact"
  | "simple";

interface AdminPage {
  id: number;
  slug: string;
  template: Template;
  is_published: boolean;
  sort_order: number;
  translation_locales: string[];
}

interface ApiData {
  pages: AdminPage[];
  templates: Template[];
}

const TEMPLATE_DESCRIPTIONS: Record<Template, string> = {
  home: "/ (홈페이지 자체)",
  about: "/about 또는 /about/{slug}",
  certification: "/certification 또는 /certification/{slug}",
  inspection: "/inspection 또는 /inspection/{slug}",
  services: "/services/{slug}",
  news_list: "/news (게시판 인덱스)",
  contact: "/contact",
  simple: "(미연결 — 라우트 별도 필요)",
};

const TEMPLATE_LABELS: Record<Template, string> = {
  home: "홈",
  about: "소개",
  certification: "인증",
  inspection: "검사",
  services: "서비스",
  news_list: "뉴스 인덱스",
  contact: "문의",
  simple: "단순",
};

export default function PagesAdminClient({ locale }: { locale: string }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Template | "all">("all");
  const [creating, setCreating] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTemplate, setCreateTemplate] = useState<Template>("about");
  const [createSort, setCreateSort] = useState(100);
  const [createPublished, setCreatePublished] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages", { cache: "no-store" });
      const json = (await res.json()) as ApiData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "페이지를 불러오지 못했습니다.");
        return;
      }
      setData(json);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.pages
      .filter((p) => filter === "all" || p.template === filter)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [data, filter]);

  async function createPage() {
    if (!createSlug.trim()) {
      setError("slug을 입력하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: createSlug.trim(),
          template: createTemplate,
          sort_order: createSort,
          is_published: createPublished,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        id?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "추가에 실패했습니다.");
        return;
      }
      setCreateSlug("");
      setCreating(false);
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(p: AdminPage) {
    if (
      !confirm(
        `'${p.slug}' 페이지와 모든 언어판 번역을 삭제합니다. 계속할까요?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${p.id}`, { method: "DELETE" });
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

  const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (!data) {
    return (
      <p className="text-sm text-red-600">
        {error ?? "페이지를 불러올 수 없습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">템플릿 필터</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Template | "all")}
          className="rounded border border-gray-300 px-2 py-1 text-sm bg-white"
        >
          <option value="all">전체</option>
          {data.templates.map((t) => (
            <option key={t} value={t}>
              {TEMPLATE_LABELS[t]}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-(--brand) hover:underline"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            {creating ? "닫기" : "+ 새 페이지"}
          </button>
        </div>
      </div>

      {creating && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">새 페이지</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Slug">
              <input
                type="text"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="예: about-team"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                소문자, 숫자, 하이픈만 가능합니다.
              </p>
            </Field>
            <Field label="템플릿">
              <select
                value={createTemplate}
                onChange={(e) =>
                  setCreateTemplate(e.target.value as Template)
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
              >
                {data.templates.map((t) => (
                  <option key={t} value={t}>
                    {TEMPLATE_LABELS[t]} — {TEMPLATE_DESCRIPTIONS[t]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                템플릿이 사이트 라우트 경로를 결정합니다.
              </p>
            </Field>
            <Field label="정렬 순서">
              <input
                type="number"
                value={createSort}
                onChange={(e) => setCreateSort(Number(e.target.value) || 0)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="공개 여부">
              <label className="inline-flex items-center gap-2 text-sm pt-1.5">
                <input
                  type="checkbox"
                  checked={createPublished}
                  onChange={(e) => setCreatePublished(e.target.checked)}
                  className="h-4 w-4 accent-(--brand)"
                />
                <span>사이트에 공개</span>
              </label>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={createPage}
              disabled={busy}
              className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left font-semibold px-4 py-2">ID</th>
              <th className="text-left font-semibold px-4 py-2">Slug</th>
              <th className="text-left font-semibold px-4 py-2">템플릿</th>
              <th className="text-left font-semibold px-4 py-2">정렬</th>
              <th className="text-left font-semibold px-4 py-2">공개</th>
              <th className="text-left font-semibold px-4 py-2">번역 (언어)</th>
              <th className="text-right font-semibold px-4 py-2 pr-5">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">
                  페이지가 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-2 text-gray-500">{p.id}</td>
                <td className="px-4 py-2 font-mono text-gray-800">{p.slug}</td>
                <td className="px-4 py-2 text-gray-700">
                  {TEMPLATE_LABELS[p.template]}{" "}
                  <span className="text-[10px] text-gray-400">
                    {p.template}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700">{p.sort_order}</td>
                <td className="px-4 py-2">
                  {p.is_published ? (
                    <span className="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      공개
                    </span>
                  ) : (
                    <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      비공개
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {p.translation_locales.length === 0 && (
                      <span className="text-[10px] text-gray-400">없음</span>
                    )}
                    {p.translation_locales.map((l) => (
                      <span
                        key={l}
                        className="text-[10px] bg-(--brand)/10 text-(--brand) px-1.5 py-0.5 rounded font-mono uppercase"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right pr-5 whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <Link
                      href={`${adminBase}/pages/${p.id}`}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                    >
                      편집
                    </Link>
                    <button
                      type="button"
                      onClick={() => deletePage(p)}
                      className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
