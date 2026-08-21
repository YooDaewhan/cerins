"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocaleCode } from "@/src/lib/types";
import { pagesNotice, common, confirmDeleteAllLangs } from "@/src/lib/adminMessages";

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
  parent_id: number | null;
  is_published: boolean;
  sort_order: number;
  translation_locales: string[];
}

const NESTABLE_TEMPLATES: Template[] = ["certification", "inspection"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

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
  simple: "/{slug} (상위 없는 독립 페이지)",
};

const TEMPLATE_LABELS: Record<Template, string> = {
  home: "홈",
  about: "소개",
  certification: "인증",
  inspection: "검사",
  services: "서비스",
  news_list: "뉴스 인덱스",
  contact: "문의",
  simple: "독립",
};

export default function PagesAdminClient({
  locale,
  isPrimary,
}: {
  locale: string;
  isPrimary: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Template | "all">("all");
  const [creating, setCreating] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTemplate, setCreateTemplate] = useState<Template>("about");
  const [createParentId, setCreateParentId] = useState<number | null>(null);
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

  // 트리 평탄화: 상위(부모 없음)를 정렬한 뒤, 각 상위 바로 뒤에 자식들을 정렬해 끼움.
  const filtered = useMemo<Array<AdminPage & { depth: 0 | 1 }>>(() => {
    if (!data) return [];
    const pages = data.pages.filter(
      (p) => filter === "all" || p.template === filter,
    );
    const top = pages
      .filter((p) => p.parent_id == null)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const childrenOf = new Map<number, AdminPage[]>();
    for (const p of pages) {
      if (p.parent_id != null) {
        const arr = childrenOf.get(p.parent_id) ?? [];
        arr.push(p);
        childrenOf.set(p.parent_id, arr);
      }
    }
    const out: Array<AdminPage & { depth: 0 | 1 }> = [];
    for (const p of top) {
      out.push({ ...p, depth: 0 });
      const kids = (childrenOf.get(p.id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order || a.id - b.id,
      );
      for (const k of kids) out.push({ ...k, depth: 1 });
    }
    return out;
  }, [data, filter]);

  const topLevelByTemplate = useMemo(() => {
    const m = new Map<Template, AdminPage[]>();
    if (!data) return m;
    for (const p of data.pages) {
      if (p.parent_id != null) continue;
      const arr = m.get(p.template) ?? [];
      arr.push(p);
      m.set(p.template, arr);
    }
    return m;
  }, [data]);

  const parentOptions = useMemo(() => {
    if (!NESTABLE_TEMPLATES.includes(createTemplate)) return [];
    return (topLevelByTemplate.get(createTemplate) ?? [])
      .filter((p) => p.slug !== createTemplate) // 인덱스 페이지 자체는 제외
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [createTemplate, topLevelByTemplate]);

  async function createPage() {
    if (!isPrimary) return;
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
          parent_id: NESTABLE_TEMPLATES.includes(createTemplate) ? createParentId : null,
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
      setCreateParentId(null);
      setCreating(false);
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // 트리 행의 + 버튼: slug만 묻고 즉시 자식 페이지 생성 후 편집기로 이동.
  async function quickAddChild(parent: AdminPage) {
    if (!isPrimary) return;
    const raw = window.prompt(
      `'${parent.slug}' 아래에 추가할 하위 페이지 slug 를 입력하세요\n` +
        `(예: gost-r, truc, fire-safety — 소문자/숫자/-만)`,
    );
    if (raw == null) return;
    const slug = raw.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      setError("slug 형식이 올바르지 않습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          template: parent.template,
          parent_id: parent.id,
          sort_order: parent.sort_order + 1,
          is_published: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: number; error?: string };
      if (!res.ok || !json.ok || !json.id) {
        setError(json.error ?? "추가에 실패했습니다.");
        return;
      }
      const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;
      router.push(`${adminBase}/pages/${json.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(p: AdminPage) {
    if (!isPrimary) return;
    if (!confirm(confirmDeleteAllLangs(locale as LocaleCode, p.slug))) return;
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

  if (loading) return <p className="text-sm text-gray-500">{common(locale as LocaleCode).loading}</p>;
  if (!data) {
    return (
      <p className="text-sm text-red-600">
        {error ?? common(locale as LocaleCode).loadError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!isPrimary && (() => {
        const notice = pagesNotice(locale as LocaleCode);
        return (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-gray-700">
            <p className="font-semibold mb-1">{notice.title}</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              {notice.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        );
      })()}

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
          {isPrimary && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              {creating ? "닫기" : "+ 새 페이지"}
            </button>
          )}
        </div>
      </div>

      {isPrimary && creating && (
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
                onChange={(e) => {
                  setCreateTemplate(e.target.value as Template);
                  setCreateParentId(null);
                }}
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
            {NESTABLE_TEMPLATES.includes(createTemplate) && (
              <Field label="상위 페이지 (선택)" className="sm:col-span-2">
                <select
                  value={createParentId ?? ""}
                  onChange={(e) =>
                    setCreateParentId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">— (최상위 — 국가/카테고리 자체)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.slug}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  예: 러시아(러시아 인증) 아래에 TRUC, GOST R 등을 하위로 만듭니다.
                  비워두면 새 국가/카테고리가 됩니다.
                </p>
              </Field>
            )}
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
              {common(locale as LocaleCode).cancel}
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
              <th className="text-right font-semibold px-4 py-2 pr-5">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  페이지가 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const isNestableParent =
                p.depth === 0 &&
                NESTABLE_TEMPLATES.includes(p.template) &&
                p.slug !== p.template; // 인덱스(/certification 자체) 제외
              // 3계층 분류: 섹션 인덱스 / 상위 페이지 / 하위 페이지.
              const isChild = p.depth === 1;
              const isSectionRoot =
                p.depth === 0 &&
                p.slug === p.template &&
                NESTABLE_TEMPLATES.includes(p.template);
              return (
                <tr
                  key={p.id}
                  className={
                    "border-t align-top " +
                    (isSectionRoot
                      ? "border-gray-200 bg-gray-50/70"
                      : isChild
                        ? "border-gray-50"
                        : "border-gray-100")
                  }
                >
                  <td className="px-4 py-2 text-gray-400 text-xs">{p.id}</td>
                  <td className="px-4 py-2 font-mono">
                    <span
                      className="inline-flex items-center"
                      style={{ paddingLeft: isChild ? 24 : 0 }}
                    >
                      {isChild && (
                        <span className="text-gray-300 mr-1.5 select-none">
                          └─
                        </span>
                      )}
                      <span
                        className={
                          isChild
                            ? "font-normal text-gray-500"
                            : isSectionRoot
                              ? "font-bold text-gray-900"
                              : "font-semibold text-gray-700"
                        }
                      >
                        {p.slug}
                      </span>
                      {isSectionRoot && (
                        <span className="ml-2 rounded bg-(--brand)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--brand) font-sans">
                          인덱스
                        </span>
                      )}
                    </span>
                  </td>
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
                  <td className="px-4 py-2 text-right pr-5 whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      {isPrimary && isNestableParent && (
                        <button
                          type="button"
                          onClick={() => quickAddChild(p)}
                          disabled={busy}
                          className="rounded border border-(--brand) text-(--brand) px-2.5 py-1 text-xs font-semibold hover:bg-(--brand)/5 disabled:opacity-60"
                          title="이 페이지 아래에 하위 인증/검사 항목 추가"
                        >
                          + 하위
                        </button>
                      )}
                      <Link
                        href={`${adminBase}/pages/${p.id}`}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                      >
                        {common(locale as LocaleCode).edit}
                      </Link>
                      {isPrimary && (
                        <button
                          type="button"
                          onClick={() => deletePage(p)}
                          className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
                        >
                          {common(locale as LocaleCode).delete}
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
