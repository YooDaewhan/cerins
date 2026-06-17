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

interface PageMeta {
  id: number;
  slug: string;
  template: Template;
  is_published: boolean;
  sort_order: number;
}

interface ContentBlock {
  heading: string;
  body: string;
}

interface PageTranslation {
  locale: string;
  title: string;
  subtitle: string | null;
  hero_image: string | null;
  content: ContentBlock[];
  meta_title: string;
  meta_description: string;
}

interface ApiData {
  page: PageMeta;
  translations: PageTranslation[];
}

const LOCALES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ru", label: "Русский" },
];

function emptyTranslation(locale: string): PageTranslation {
  return {
    locale,
    title: "",
    subtitle: null,
    hero_image: null,
    content: [],
    meta_title: "",
    meta_description: "",
  };
}

export default function PageEditorClient({
  locale,
  pageId,
}: {
  locale: string;
  pageId: number;
}) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState("ko");
  const [drafts, setDrafts] = useState<Record<string, PageTranslation>>({});
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingTrans, setSavingTrans] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "페이지를 불러오지 못했습니다.");
        return;
      }
      setData(json);
      setMeta(json.page);
      const next: Record<string, PageTranslation> = {};
      for (const t of json.translations) next[t.locale] = t;
      setDrafts(next);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;

  const draft = useMemo(
    () => drafts[activeLocale] ?? emptyTranslation(activeLocale),
    [drafts, activeLocale],
  );
  const hasTranslation = activeLocale in drafts;

  function patchDraft(patch: Partial<PageTranslation>) {
    setDrafts((prev) => ({
      ...prev,
      [activeLocale]: { ...(prev[activeLocale] ?? emptyTranslation(activeLocale)), ...patch },
    }));
  }

  function patchBlock(idx: number, patch: Partial<ContentBlock>) {
    const next = draft.content.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    patchDraft({ content: next });
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= draft.content.length) return;
    const next = [...draft.content];
    [next[idx], next[j]] = [next[j], next[idx]];
    patchDraft({ content: next });
  }

  function removeBlock(idx: number) {
    patchDraft({ content: draft.content.filter((_, i) => i !== idx) });
  }

  function addBlock() {
    patchDraft({ content: [...draft.content, { heading: "", body: "" }] });
  }

  async function saveMeta() {
    if (!meta) return;
    setSavingMeta(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: meta.slug,
          template: meta.template,
          sort_order: meta.sort_order,
          is_published: meta.is_published,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "메타 저장에 실패했습니다.");
        return;
      }
      setNotice("페이지 메타 정보를 저장했습니다.");
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveTranslation() {
    if (!draft.title.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    setSavingTrans(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/pages/${pageId}/translations/${activeLocale}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            subtitle: draft.subtitle,
            hero_image: draft.hero_image,
            content: draft.content,
            meta_title: draft.meta_title,
            meta_description: draft.meta_description,
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      setNotice(`${activeLocale.toUpperCase()} 언어판을 저장했습니다.`);
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingTrans(false);
    }
  }

  async function deleteTranslation() {
    if (!hasTranslation) return;
    if (!confirm(`${activeLocale.toUpperCase()} 언어판을 삭제할까요?`)) return;
    setSavingTrans(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/pages/${pageId}/translations/${activeLocale}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      setNotice(`${activeLocale.toUpperCase()} 언어판을 삭제했습니다.`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[activeLocale];
        return next;
      });
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingTrans(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (!data || !meta) {
    return (
      <div>
        <Link
          href={`${adminBase}/pages`}
          className="text-sm text-(--brand) hover:underline"
        >
          ← 페이지 목록
        </Link>
        <p className="mt-4 text-sm text-red-600">
          {error ?? "페이지를 불러올 수 없습니다."}
        </p>
      </div>
    );
  }

  const existingLocales = new Set(data.translations.map((t) => t.locale));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`${adminBase}/pages`}
          className="text-sm text-(--brand) hover:underline"
        >
          ← 페이지 목록
        </Link>
        <span className="text-xs text-gray-400">
          ID #{meta.id} · /{meta.slug}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {notice}
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">페이지 메타</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Slug">
            <input
              type="text"
              value={meta.slug}
              onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
          </Field>
          <Field label="템플릿">
            <select
              value={meta.template}
              onChange={(e) =>
                setMeta({ ...meta, template: e.target.value as Template })
              }
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              {(
                [
                  "home",
                  "about",
                  "certification",
                  "inspection",
                  "services",
                  "news_list",
                  "contact",
                  "simple",
                ] as Template[]
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="정렬 순서">
            <input
              type="number"
              value={meta.sort_order}
              onChange={(e) =>
                setMeta({ ...meta, sort_order: Number(e.target.value) || 0 })
              }
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="공개 여부">
            <label className="inline-flex items-center gap-2 text-sm pt-1.5">
              <input
                type="checkbox"
                checked={meta.is_published}
                onChange={(e) =>
                  setMeta({ ...meta, is_published: e.target.checked })
                }
                className="h-4 w-4 accent-(--brand)"
              />
              <span>사이트에 공개</span>
            </label>
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveMeta}
            disabled={savingMeta}
            className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {savingMeta ? "저장 중..." : "메타 저장"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex gap-1 flex-wrap">
          {LOCALES.map((l) => {
            const has = existingLocales.has(l.code);
            const active = activeLocale === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setActiveLocale(l.code)}
                className={
                  "px-3 py-1.5 text-xs font-semibold rounded transition-colors " +
                  (active
                    ? "bg-(--brand) text-white"
                    : has
                      ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "bg-white border border-dashed border-gray-300 text-gray-400 hover:text-gray-700")
                }
              >
                {l.code.toUpperCase()}
                {!has && <span className="ml-1 opacity-60">·비어있음</span>}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Field label="제목 (Title)">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="부제 (Subtitle)">
              <input
                type="text"
                value={draft.subtitle ?? ""}
                onChange={(e) =>
                  patchDraft({ subtitle: e.target.value || null })
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="히어로 이미지 URL">
              <input
                type="text"
                value={draft.hero_image ?? ""}
                onChange={(e) =>
                  patchDraft({ hero_image: e.target.value || null })
                }
                placeholder="https://..."
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              {draft.hero_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.hero_image}
                  alt=""
                  className="mt-2 h-32 w-auto rounded border border-gray-200 object-cover"
                />
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                (추후 파일 업로드 지원 예정 — 일단 URL 입력)
              </p>
            </Field>
            <Field label="메타 제목 (Meta Title)">
              <input
                type="text"
                value={draft.meta_title}
                onChange={(e) => patchDraft({ meta_title: e.target.value })}
                placeholder="비우면 제목과 동일"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="메타 설명 (Meta Description)">
              <textarea
                rows={2}
                value={draft.meta_description}
                onChange={(e) =>
                  patchDraft({ meta_description: e.target.value })
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800">
                본문 블록 ({draft.content.length})
              </h4>
              <button
                type="button"
                onClick={addBlock}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
              >
                + 블록 추가
              </button>
            </div>

            {draft.content.length === 0 && (
              <p className="text-xs text-gray-400 py-3">
                본문 블록이 없습니다. 위 버튼으로 추가하세요.
              </p>
            )}

            <ul className="space-y-3">
              {draft.content.map((block, idx) => (
                <li
                  key={idx}
                  className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-gray-500">
                      블록 #{idx + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, -1)}
                        disabled={idx === 0}
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50 disabled:opacity-40"
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 1)}
                        disabled={idx === draft.content.length - 1}
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50 disabled:opacity-40"
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="rounded border border-red-300 text-red-600 px-2 py-0.5 text-[11px] hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={block.heading}
                    onChange={(e) => patchBlock(idx, { heading: e.target.value })}
                    placeholder="Heading (소제목)"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-semibold bg-white"
                  />
                  <textarea
                    value={block.body}
                    onChange={(e) => patchBlock(idx, { body: e.target.value })}
                    rows={4}
                    placeholder="Body (본문 — 줄바꿈 그대로 표시됩니다)"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            {hasTranslation && (
              <button
                type="button"
                onClick={deleteTranslation}
                disabled={savingTrans}
                className="rounded border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-60"
              >
                이 언어판 삭제
              </button>
            )}
            <button
              type="button"
              onClick={saveTranslation}
              disabled={savingTrans}
              className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {savingTrans
                ? "저장 중..."
                : hasTranslation
                  ? `${activeLocale.toUpperCase()} 저장`
                  : `${activeLocale.toUpperCase()} 만들기`}
            </button>
          </div>
        </div>
      </section>
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
