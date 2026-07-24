"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isVideoUrl } from "@/src/lib/media";
import MediaInput from "@/components/admin/MediaInput";
import type { LocaleCode } from "@/src/lib/types";
import { common, confirmDelete } from "@/src/lib/adminMessages";
import { useAdminLocale } from "@/src/lib/useAdminLocale";

interface AdminSlide {
  id: number;
  locale: string;
  eyebrow: string;
  headline: string;
  sub: string;
  image: string;
  fallback: string;
  sort_order: number;
  is_visible: boolean;
}

interface AdminLocale {
  code: string;
  name: string;
  native_name: string;
}

interface ApiData {
  slides: AdminSlide[];
  locales: AdminLocale[];
}

type DraftState = Omit<AdminSlide, "id">;

function emptyDraft(locale: string, sort: number): DraftState {
  return {
    locale,
    eyebrow: "",
    headline: "",
    sub: "",
    image: "",
    fallback: "#0d2244",
    sort_order: sort,
    is_visible: true,
  };
}

export default function HeroSlidesAdminClient({
  locale,
}: {
  locale: string;
}) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 각 언어 관리자는 자기 언어(현재 URL 로케일)의 슬라이드만 관리한다.
  const filterLocale = locale;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-slides", { cache: "no-store" });
      const json = (await res.json()) as ApiData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "슬라이드를 불러오지 못했습니다.");
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
    return data.slides
      .filter((s) => s.locale === filterLocale)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [data, filterLocale]);

  function startEdit(s: AdminSlide) {
    setEditingId(s.id);
    setCreating(false);
    setDraft({ ...s });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    const nextSort =
      filtered.length === 0 ? 1 : filtered[filtered.length - 1].sort_order + 1;
    setCreateDraft(emptyDraft(filterLocale, nextSort));
  }

  function cancelCreate() {
    setCreating(false);
    setCreateDraft(null);
  }

  async function saveCreate() {
    if (!createDraft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "추가에 실패했습니다.");
        return;
      }
      cancelCreate();
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (editingId === null || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hero-slides/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      cancelEdit();
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlide(s: AdminSlide) {
    if (!confirm(confirmDelete(locale as LocaleCode, s.headline))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hero-slides/${s.id}`, {
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
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">편집 언어</span>
        <span className="inline-flex items-center gap-1.5 rounded bg-(--brand)/10 px-2.5 py-1 text-xs font-semibold text-(--brand)">
          <span className="uppercase font-mono">{locale}</span>
          <span>
            {data.locales.find((l) => l.code === locale)?.native_name ??
              locale.toUpperCase()}
          </span>
        </span>
        <span className="text-[11px] text-gray-400">
          이 언어의 슬라이드만 표시·관리됩니다.
        </span>
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
            onClick={startCreate}
            className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            + 새 슬라이드
          </button>
        </div>
      </div>

      {creating && createDraft && (
        <SlideForm
          title={`새 슬라이드 (${filterLocale.toUpperCase()})`}
          draft={createDraft}
          onChange={setCreateDraft}
          onSave={saveCreate}
          onCancel={cancelCreate}
          busy={busy}
        />
      )}

      <HeroVideoCard onError={setError} />

      <ul className="space-y-2">
        {filtered.length === 0 && !creating && (
          <li className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            이 언어의 슬라이드가 없습니다.
          </li>
        )}
        {filtered.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <div className="flex gap-4 p-3">
              {s.image &&
                (isVideoUrl(s.image) ? (
                  <video
                    src={s.image}
                    className="w-28 h-20 object-cover rounded border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: s.fallback }}
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt=""
                    className="w-28 h-20 object-cover rounded border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: s.fallback }}
                  />
                ))}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-500">
                    #{s.id} · sort {s.sort_order}
                  </span>
                  {!s.is_visible && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                      숨김
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-(--brand) font-bold uppercase tracking-wider mt-1">
                  {s.eyebrow}
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {s.headline}
                </p>
                <p className="text-xs text-gray-500 line-clamp-1">{s.sub}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(s)}
                  className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
            {editingId === s.id && draft && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                <SlideForm
                  title={`슬라이드 #${s.id} 수정`}
                  draft={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  busy={busy}
                  inline
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 메인 히어로 우하단에 상시 노출되는 단일 소개 동영상.
// 슬라이드와 달리 전 언어 공통·1개 고정이므로 목록 맨 위에 예외적으로 올린다.
function HeroVideoCard({ onError }: { onError: (msg: string | null) => void }) {
  const t = common(useAdminLocale());
  const [videoUrl, setVideoUrl] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-assets", { cache: "no-store" });
      const json = (await res.json()) as {
        assets?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !json.assets) {
        onError(json.error ?? "동영상 설정을 불러오지 못했습니다.");
        return;
      }
      setVideoUrl(json.assets.hero_video ?? "");
    } catch {
      onError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit() {
    setDraftUrl(videoUrl);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch("/api/admin/site-assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hero_video", value: draftUrl.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        onError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      setVideoUrl(draftUrl.trim());
      setEditing(false);
    } catch {
      onError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-(--brand)/40 bg-(--brand)/5 overflow-hidden">
      <div className="flex gap-4 p-3">
        <div className="w-28 h-20 flex-shrink-0 rounded border border-gray-200 bg-black overflow-hidden">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50">
              동영상 없음
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] bg-(--brand) text-white px-1.5 py-0.5 rounded font-semibold">
              고정
            </span>
            <span className="text-xs font-mono text-gray-500">전 언어 공통</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-1">
            메인 슬라이드 소개 동영상
          </p>
          <p className="text-xs text-gray-500 line-clamp-1">
            히어로 우측 하단에 상시 노출됩니다. 링크 또는 파일 업로드로 교체하세요.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              disabled={loading}
              className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "..." : "수정"}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="border-t border-(--brand)/20 bg-white/60 px-4 py-4 space-y-3">
          <Field label="소개 동영상 (링크 또는 업로드)">
            <MediaInput
              url={draftUrl}
              onChange={setDraftUrl}
              accept="video/mp4,video/webm,video/ogg"
              helpText="영상(mp4/webm/ogv)만 사용하세요. 외부 URL도 그대로 사용할 수 있습니다."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SlideFormProps {
  title: string;
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  inline?: boolean;
}

function SlideForm({
  title,
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
  inline = false,
}: SlideFormProps) {
  const t = common(useAdminLocale());
  function patch<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div
      className={
        inline
          ? "space-y-3"
          : "rounded-lg border border-gray-200 bg-white p-4 space-y-3"
      }
    >
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Eyebrow (작은 라벨)">
          <input
            type="text"
            value={draft.eyebrow}
            onChange={(e) => patch("eyebrow", e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Headline (제목)">
          <input
            type="text"
            value={draft.headline}
            onChange={(e) => patch("headline", e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Sub (설명)" className="sm:col-span-2">
          <textarea
            value={draft.sub}
            onChange={(e) => patch("sub", e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="배경 이미지 또는 영상" className="sm:col-span-2">
          <MediaInput
            url={draft.image}
            onChange={(url) => patch("image", url)}
            fallback={draft.fallback}
            accept="image/*,video/mp4,video/webm,video/ogg"
          />
        </Field>
        <Field label="Fallback 색상">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.fallback}
              onChange={(e) => patch("fallback", e.target.value)}
              className="h-9 w-12 rounded border border-gray-300"
            />
            <input
              type="text"
              value={draft.fallback}
              onChange={(e) => patch("fallback", e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
          </div>
        </Field>
        <Field label="정렬 순서">
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => patch("sort_order", Number(e.target.value) || 0)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="노출 여부">
          <label className="inline-flex items-center gap-2 text-sm pt-1.5">
            <input
              type="checkbox"
              checked={draft.is_visible}
              onChange={(e) => patch("is_visible", e.target.checked)}
              className="h-4 w-4 accent-(--brand)"
            />
            <span>사이트에 표시</span>
          </label>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {busy ? t.saving : t.save}
        </button>
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

