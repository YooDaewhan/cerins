"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PopupCard } from "@/components/NewsPopup";
import type { Post, LocaleCode } from "@/src/lib/types";
import { postsNotice } from "@/src/lib/adminMessages";

const TiptapEditor = dynamic(() => import("./TiptapEditor"), { ssr: false });

interface FormState {
  title: string;
  summary: string;
  content: string;
  author: string;
  thumbnail: string;
  is_published: boolean;
  is_popup: boolean;
  popup_type: number;
  published_at: string;
}

function emptyForm(): FormState {
  return {
    title: "",
    summary: "",
    content: "",
    author: "",
    thumbnail: "",
    is_published: true,
    is_popup: false,
    popup_type: 1,
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
  is_popup?: boolean;
  popup_type?: number;
  published_at: string;
}

export interface PostEditorInitial {
  slug: string;
  translations: Record<string, InitialTranslation>;
}

interface Props {
  locale: string;
  isPrimary: boolean;
  mode: "new" | "edit";
  initial?: PostEditorInitial;
  // 게시판 구분. 기본값은 뉴스와 동일하게 동작.
  apiBase?: string;
  listSlug?: string;
  noun?: string;
}

export default function PostEditorClient({
  locale,
  isPrimary,
  mode,
  initial,
  apiBase = "/api/admin/posts",
  listSlug = "posts",
  noun = "뉴스",
}: Props) {
  const router = useRouter();

  const adminBase = locale === "ko" ? "/admin" : `/${locale}/admin`;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [localeName, setLocaleName] = useState<string>(locale.toUpperCase());
  // 현재 언어판이 아직 존재하는지 (수정 vs 새로 만드는 번역).
  const existedInitially = !!initial?.translations[locale];
  const [form, setForm] = useState<FormState>(() => {
    const t = initial?.translations[locale];
    if (t) {
      return {
        title: t.title,
        summary: t.summary,
        content: t.content,
        author: t.author ?? "",
        thumbnail: t.thumbnail ?? "",
        is_published: t.is_published,
        is_popup: t.is_popup ?? false,
        popup_type: t.popup_type ?? 1,
        published_at: t.published_at,
      };
    }
    return emptyForm();
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 라디오 숫자를 누르면 해당 타입의 팝업 미리보기를 띄운다.
  const [previewType, setPreviewType] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/locales", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as {
          locales: { code: string; native_name: string }[];
        };
        const found = j.locales.find((l) => l.code === locale);
        if (found) setLocaleName(found.native_name);
      } catch {
        // ignore — 코드 표기로 대체.
      }
    })();
  }, [locale]);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setError(null);
    if (!form.title.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    if (!form.summary.trim()) {
      setError("요약은 필수입니다.");
      return;
    }

    // 현재 언어판 하나만 전송한다. 다른 언어는 서버에서 건드리지 않는다.
    const translations = { [locale]: serialize(form) };

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
    if (!initial || !isPrimary) return;
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

  // 새 글(구조) 생성은 한국어 관리자 전용.
  if (mode === "new" && !isPrimary) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">새 {noun} 글</h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-gray-700">
          <p className="font-semibold mb-1">
            새 글 작성은 한국어 관리자에서만 가능합니다.
          </p>
          <p className="text-gray-600">
            한국어 관리자가 글을 먼저 만든 뒤, 이 화면({localeName})에서 해당
            글의 {localeName} 언어판을 입력할 수 있습니다.
          </p>
          <Link
            href={`${adminBase}/${listSlug}`}
            className="inline-block mt-3 rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-white"
          >
            ← 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-800">
          {mode === "new" ? `새 ${noun} 글` : `${noun} 글 편집: ${initial?.slug}`}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded bg-(--brand)/10 px-2 py-1 text-xs font-semibold text-(--brand)">
          <span className="uppercase font-mono">{locale}</span>
          <span>{localeName} 언어판</span>
        </span>
        <div className="ml-auto flex gap-2">
          {mode === "edit" && isPrimary && (
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

      {!isPrimary && (() => {
        const notice = postsNotice(locale as LocaleCode);
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

      {mode === "new" && isPrimary && (
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
            소문자/숫자/-만 가능. 다른 언어판은 각 언어 관리자가 이 slug에 이어서
            입력합니다.
          </p>
        </div>
      )}

      {mode === "edit" && !existedInitially && (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-3 py-2">
          이 글에는 아직 {localeName} 언어판이 없습니다. 아래 내용을 입력하고
          저장하면 {localeName} 언어판이 새로 만들어집니다.
        </p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="제목">
            <input
              type="text"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="작성자 표시명">
            <input
              type="text"
              value={form.author}
              onChange={(e) => update({ author: e.target.value })}
              placeholder="비우면 'CERINS Editorial' 표시"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="발행일 (YYYY-MM-DD)">
            <input
              type="date"
              value={form.published_at}
              onChange={(e) => update({ published_at: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="공개">
            <label className="inline-flex items-center gap-2 text-sm pt-1.5">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => update({ is_published: e.target.checked })}
                className="h-4 w-4 accent-(--brand)"
              />
              <span>사이트에 공개</span>
            </label>
          </Field>
          {listSlug === "posts" && (
            <Field label="팝업">
              <div className="flex flex-wrap items-center gap-4 pt-1.5">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_popup}
                    onChange={(e) => update({ is_popup: e.target.checked })}
                    className="h-4 w-4 accent-(--brand)"
                  />
                  <span>공개</span>
                </label>
                {form.is_popup && (
                  <div className="inline-flex items-center gap-3">
                    {[1, 2, 3].map((n) => (
                      <label
                        key={n}
                        className="inline-flex items-center gap-1 text-sm"
                      >
                        <input
                          type="radio"
                          name="popup_type"
                          checked={form.popup_type === n}
                          onChange={() => {
                            update({ popup_type: n });
                            setPreviewType(n);
                          }}
                          onClick={() => setPreviewType(n)}
                          className="h-4 w-4 accent-(--brand)"
                        />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {form.is_popup && (
                <p className="text-[11px] text-gray-400 mt-1">
                  사이트 진입 시 왼쪽에 팝업으로 노출됩니다. 타입 1=컬러 헤더,
                  2=이미지 히어로, 3=사이드 강조.
                </p>
              )}
            </Field>
          )}
          {previewType !== null && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setPreviewType(null)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <PopupCard
                  post={
                    {
                      slug: slug || "preview",
                      title: form.title || "제목 미리보기",
                      summary: form.summary,
                      content: form.content,
                      thumbnail: form.thumbnail,
                      popup_type: previewType,
                    } as unknown as Post
                  }
                  href="#"
                  onClose={() => setPreviewType(null)}
                  onHideForDay={() => setPreviewType(null)}
                />
              </div>
            </div>
          )}
          <Field label="썸네일 이미지 URL (선택)" className="sm:col-span-2">
            <input
              type="text"
              value={form.thumbnail}
              onChange={(e) => update({ thumbnail: e.target.value })}
              placeholder="https://… (지금은 외부 URL만 지원)"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
          </Field>
          <Field label="요약 (목록·SEO에 사용)" className="sm:col-span-2">
            <textarea
              value={form.summary}
              onChange={(e) => update({ summary: e.target.value })}
              rows={3}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            본문
          </label>
          <TiptapEditor
            value={form.content}
            onChange={(html) => update({ content: html })}
            placeholder="본문을 입력하세요…"
          />
        </div>
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
    is_popup: f.is_popup,
    popup_type: f.popup_type,
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
