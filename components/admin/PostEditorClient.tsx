"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("./TiptapEditor"), { ssr: false });

interface LocaleEntry {
  code: string;
  label: string;
}

interface FormState {
  enabled: boolean;
  title: string;
  summary: string;
  content: string;
  author: string;
  thumbnail: string;
  is_published: boolean;
  published_at: string;
}

function emptyForm(): FormState {
  return {
    enabled: false,
    title: "",
    summary: "",
    content: "",
    author: "",
    thumbnail: "",
    is_published: true,
    published_at: todayIso(),
  };
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface InitialTranslation {
  title: string;
  summary: string;
  content: string;
  author: string | null;
  thumbnail: string | null;
  is_published: boolean;
  published_at: string;
}

export interface PostEditorInitial {
  slug: string;
  translations: Record<string, InitialTranslation>;
}

interface Props {
  locale: string;
  mode: "new" | "edit";
  initial?: PostEditorInitial;
  // 게시판 구분. 기본값은 뉴스와 동일하게 동작.
  apiBase?: string;
  listSlug?: string;
  noun?: string;
}

export default function PostEditorClient({
  locale,
  mode,
  initial,
  apiBase = "/api/admin/posts",
  listSlug = "posts",
  noun = "뉴스",
}: Props) {
  const router = useRouter();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [locales, setLocales] = useState<LocaleEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ko");
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/locales", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as {
          locales: { code: string; native_name: string; is_enabled: boolean }[];
        };
        const enabled = j.locales
          .filter((l) => l.is_enabled)
          .map((l) => ({ code: l.code, label: l.native_name }));
        setLocales(enabled);
        setForms((prev) => {
          const next: Record<string, FormState> = { ...prev };
          for (const l of enabled) {
            if (next[l.code]) continue;
            const t = initial?.translations[l.code];
            if (t) {
              next[l.code] = {
                enabled: true,
                title: t.title,
                summary: t.summary,
                content: t.content,
                author: t.author ?? "",
                thumbnail: t.thumbnail ?? "",
                is_published: t.is_published,
                published_at: t.published_at,
              };
            } else {
              const base = emptyForm();
              if (l.code === "ko") base.enabled = mode === "new";
              next[l.code] = base;
            }
          }
          return next;
        });
      } catch {
        // ignore — 편집기 기본 화면은 여전히 열림.
      }
    })();
  }, [initial, mode]);

  const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;

  const update = useCallback(
    (code: string, patch: Partial<FormState>) => {
      setForms((prev) => ({
        ...prev,
        [code]: { ...(prev[code] ?? emptyForm()), ...patch },
      }));
    },
    [],
  );

  const enabledCount = useMemo(
    () => locales.filter((l) => forms[l.code]?.enabled).length,
    [forms, locales],
  );

  async function handleSave() {
    setError(null);
    if (enabledCount === 0) {
      setError("최소 한 개 언어를 활성화하세요.");
      return;
    }

    const translations: Record<string, unknown> = {};
    if (mode === "edit") {
      // explicitly null-out disabled locales that previously existed
      const codes = new Set<string>([
        ...locales.map((l) => l.code),
        ...Object.keys(initial?.translations ?? {}),
      ]);
      for (const code of codes) {
        const f = forms[code];
        const existed = !!initial?.translations[code];
        if (f?.enabled) {
          translations[code] = serialize(f);
        } else if (existed) {
          translations[code] = null;
        }
      }
    } else {
      for (const l of locales) {
        const f = forms[l.code];
        if (f?.enabled) translations[l.code] = serialize(f);
      }
    }

    setBusy(true);
    try {
      const url =
        mode === "new"
          ? apiBase
          : `${apiBase}/${encodeURIComponent(initial!.slug)}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const body =
        mode === "new"
          ? JSON.stringify({
              slug: slug.trim() || undefined,
              translations,
            })
          : JSON.stringify({ translations });
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      router.push(`${adminBase}/${listSlug}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`'${initial.slug}' 글을 모든 언어판과 함께 삭제합니다.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(
        `${apiBase}/${encodeURIComponent(initial.slug)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.push(`${adminBase}/${listSlug}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const active = forms[activeTab] ?? emptyForm();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-800">
          {mode === "new" ? `새 ${noun} 글` : `${noun} 글 편집: ${initial?.slug}`}
        </h2>
        <div className="ml-auto flex gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-60"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`${adminBase}/${listSlug}`)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {mode === "new" && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Slug (URL용, 비우면 다음 숫자가 자동 부여)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: 2026-vietnam-expansion (비워두면 13, 14, ... 자동)"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            소문자/숫자/-만 가능. 같은 slug에 5개 언어가 묶입니다.
          </p>
        </div>
      )}

      <div className="flex border-b border-gray-200 flex-wrap">
        {locales.map((l) => {
          const isActive = activeTab === l.code;
          const enabled = forms[l.code]?.enabled ?? false;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActiveTab(l.code)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "border-(--brand) text-(--brand)"
                  : "border-transparent text-gray-500 hover:text-(--brand)"
              }`}
            >
              <span>{l.label}</span>
              <span className="text-[10px] uppercase font-mono text-gray-400">
                {l.code}
              </span>
              {enabled && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active.enabled}
            onChange={(e) => update(activeTab, { enabled: e.target.checked })}
            className="h-4 w-4 accent-(--brand)"
          />
          <span className="font-semibold">
            이 언어({(locales.find((l) => l.code === activeTab)?.label ?? activeTab)}) 사용
          </span>
          <span className="text-xs text-gray-400">
            체크 해제 시 이 언어판은 저장되지 않거나 삭제됩니다.
          </span>
        </label>

        <fieldset
          disabled={!active.enabled}
          className={active.enabled ? "" : "opacity-50 pointer-events-none"}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="제목">
              <input
                type="text"
                value={active.title}
                onChange={(e) =>
                  update(activeTab, { title: e.target.value })
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="작성자 표시명">
              <input
                type="text"
                value={active.author}
                onChange={(e) =>
                  update(activeTab, { author: e.target.value })
                }
                placeholder="비우면 'CERINS Editorial' 표시"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="발행일 (YYYY-MM-DD)">
              <input
                type="date"
                value={active.published_at}
                onChange={(e) =>
                  update(activeTab, { published_at: e.target.value })
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="공개">
              <label className="inline-flex items-center gap-2 text-sm pt-1.5">
                <input
                  type="checkbox"
                  checked={active.is_published}
                  onChange={(e) =>
                    update(activeTab, { is_published: e.target.checked })
                  }
                  className="h-4 w-4 accent-(--brand)"
                />
                <span>사이트에 공개</span>
              </label>
            </Field>
            <Field label="썸네일 이미지 URL (선택)" className="sm:col-span-2">
              <input
                type="text"
                value={active.thumbnail}
                onChange={(e) =>
                  update(activeTab, { thumbnail: e.target.value })
                }
                placeholder="https://… (지금은 외부 URL만 지원)"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
              />
            </Field>
            <Field label="요약 (목록·SEO에 사용)" className="sm:col-span-2">
              <textarea
                value={active.summary}
                onChange={(e) =>
                  update(activeTab, { summary: e.target.value })
                }
                rows={3}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              본문
            </label>
            <TiptapEditor
              value={active.content}
              onChange={(html) => update(activeTab, { content: html })}
              placeholder="본문을 입력하세요…"
            />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function serialize(f: FormState) {
  return {
    title: f.title,
    summary: f.summary,
    content: f.content,
    author: f.author.trim() ? f.author.trim() : null,
    thumbnail: f.thumbnail.trim() ? f.thumbnail.trim() : null,
    is_published: f.is_published,
    published_at: f.published_at,
  };
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
