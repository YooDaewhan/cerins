"use client";

import { useCallback, useEffect, useState } from "react";
import { common, confirmDelete } from "@/src/lib/adminMessages";
import { useAdminLocale } from "@/src/lib/useAdminLocale";

interface AdminLocale {
  code: string;
  name: string;
  native_name: string;
  is_enabled: boolean;
  sort_order: number;
}

type DraftState = AdminLocale;

function emptyDraft(sort: number): DraftState {
  return { code: "", name: "", native_name: "", is_enabled: true, sort_order: sort };
}

export default function LocalesAdminClient() {
  const loc = useAdminLocale();
  const [locales, setLocales] = useState<AdminLocale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/locales", { cache: "no-store" });
      const json = (await res.json()) as { locales?: AdminLocale[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "언어를 불러오지 못했습니다.");
        return;
      }
      setLocales(json.locales ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(l: AdminLocale) {
    setEditingCode(l.code);
    setCreating(false);
    setDraft({ ...l });
  }
  function cancelEdit() {
    setEditingCode(null);
    setDraft(null);
  }
  function startCreate() {
    setEditingCode(null);
    setCreating(true);
    const nextSort =
      locales.length === 0 ? 1 : locales[locales.length - 1].sort_order + 1;
    setCreateDraft(emptyDraft(nextSort));
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
      const res = await fetch("/api/admin/locales", {
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
    if (editingCode === null || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const { name, native_name, is_enabled, sort_order } = draft;
      const res = await fetch(`/api/admin/locales/${editingCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, native_name, is_enabled, sort_order }),
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

  async function removeLocale(l: AdminLocale) {
    if (!confirm(confirmDelete(loc, `${l.name} (${l.code})`))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/locales/${l.code}`, { method: "DELETE" });
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

  if (loading) return <p className="text-sm text-gray-500">{common(loc).loading}</p>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">총 {locales.length}개</p>
        <div className="flex gap-2">
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
            + 새 언어
          </button>
        </div>
      </div>

      {creating && createDraft && (
        <LocaleForm
          title="새 언어"
          draft={createDraft}
          onChange={setCreateDraft}
          onSave={saveCreate}
          onCancel={cancelCreate}
          busy={busy}
          codeEditable
        />
      )}

      <ul className="space-y-2">
        {locales.length === 0 && !creating && (
          <li className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            등록된 언어가 없습니다.
          </li>
        )}
        {locales.map((l) => (
          <li
            key={l.code}
            className="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <div className="flex gap-3 p-3 items-center">
              <span className="inline-flex items-center justify-center w-14 h-8 rounded bg-gray-100 text-xs font-mono uppercase text-gray-700">
                {l.code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {l.name}
                  </span>
                  <span className="text-sm text-gray-500 truncate">
                    {l.native_name}
                  </span>
                  {!l.is_enabled && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                      비활성
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">sort {l.sort_order}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(l)}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => removeLocale(l)}
                  className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
            {editingCode === l.code && draft && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                <LocaleForm
                  title={`${l.code} 수정`}
                  draft={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  busy={busy}
                  codeEditable={false}
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

interface LocaleFormProps {
  title: string;
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  codeEditable: boolean;
  inline?: boolean;
}

function LocaleForm({
  title,
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
  codeEditable,
  inline = false,
}: LocaleFormProps) {
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
        <Field label="코드 (예: ko, en, fr)">
          <input
            type="text"
            value={draft.code}
            onChange={(e) => patch("code", e.target.value.toLowerCase())}
            disabled={!codeEditable}
            placeholder="소문자 2~8자"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono disabled:bg-gray-100 disabled:text-gray-500"
          />
        </Field>
        <Field label="정렬 순서">
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => patch("sort_order", Number(e.target.value) || 0)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="언어 이름 (영문)">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder="Korean, English, French..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="표기명 (해당 언어로)">
          <input
            type="text"
            value={draft.native_name}
            onChange={(e) => patch("native_name", e.target.value)}
            placeholder="한국어, English, Français..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="활성화 여부">
          <label className="inline-flex items-center gap-2 text-sm pt-1.5">
            <input
              type="checkbox"
              checked={draft.is_enabled}
              onChange={(e) => patch("is_enabled", e.target.checked)}
              className="h-4 w-4 accent-(--brand)"
            />
            <span>사이트에서 사용</span>
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
